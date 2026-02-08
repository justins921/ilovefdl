<?php
/**
 * Shopify Inventory Provider
 *
 * Implements the platform provider interface for Shopify.
 * Uses the Shopify Admin REST API to read products, read inventory levels,
 * and adjust inventory after a WooCommerce sale.
 *
 * Shopify Admin API docs referenced:
 *   - Products:         GET  /admin/api/{version}/products.json
 *   - Inventory Levels: GET  /admin/api/{version}/inventory_levels.json
 *   - Inventory Adjust: POST /admin/api/{version}/inventory_levels/adjust.json
 *   - Inventory Items:  GET  /admin/api/{version}/inventory_items.json
 *
 * Products are matched between Shopify and WooCommerce by SKU.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WCSS_Shopify_Provider implements WCSS_Platform_Provider_Interface {

    /** @var string Shopify store domain (e.g., "mystore.myshopify.com"). */
    private $shop_domain;

    /** @var string Shopify Admin API access token. */
    private $access_token;

    /** @var string Shopify location ID for inventory operations. */
    private $location_id;

    /** @var string Shopify API version. */
    private $api_version = '2024-10';

    /**
     * @param array $vendor_config
     */
    public function __construct( array $vendor_config ) {
        $this->shop_domain  = rtrim( $vendor_config['shopify_shop_domain'], '/' );
        $this->access_token = $vendor_config['shopify_access_token'];
        $this->location_id  = $vendor_config['shopify_location_id'];
    }

    /**
     * Fetch inventory counts from Shopify for the given SKUs.
     *
     * Flow:
     *   1. Fetch all products/variants to build a SKU → inventory_item_id map.
     *   2. Query inventory levels for those inventory_item_ids at the vendor's location.
     *
     * @param array $skus
     * @return array SKU => quantity
     */
    public function get_inventory_counts( array $skus ) {
        if ( empty( $skus ) ) {
            return array();
        }

        $sku_lookup = array_flip( $skus ); // SKU => index (for O(1) lookup)

        // Step 1: Map SKUs to inventory_item_ids by scanning variants.
        $sku_to_inventory_item = $this->map_skus_to_inventory_items( $sku_lookup );

        if ( empty( $sku_to_inventory_item ) ) {
            return array();
        }

        // Step 2: Fetch inventory levels.
        $inventory_item_ids = array_values( $sku_to_inventory_item );
        $levels             = $this->get_inventory_levels( $inventory_item_ids );

        // Step 3: Map back to SKUs.
        $result = array();
        foreach ( $sku_to_inventory_item as $sku => $item_id ) {
            if ( isset( $levels[ $item_id ] ) ) {
                $result[ $sku ] = (int) $levels[ $item_id ];
            }
        }

        return $result;
    }

    /**
     * Adjust inventory on Shopify after a WooCommerce sale.
     *
     * @param string $sku
     * @param int    $quantity Positive number representing units sold.
     * @return bool
     */
    public function adjust_inventory( $sku, $quantity ) {
        $mapping = $this->map_skus_to_inventory_items( array( $sku => 0 ) );

        if ( empty( $mapping[ $sku ] ) ) {
            WCSS_Logger::error(
                sprintf( 'Shopify: could not find variant for SKU "%s" — inventory not adjusted.', $sku )
            );
            return false;
        }

        $inventory_item_id = $mapping[ $sku ];

        $body = array(
            'location_id'        => $this->location_id,
            'inventory_item_id'  => $inventory_item_id,
            'available_adjustment' => -1 * abs( (int) $quantity ),
        );

        $response = $this->request( 'POST', '/inventory_levels/adjust.json', $body );

        if ( is_wp_error( $response ) ) {
            WCSS_Logger::error(
                sprintf( 'Shopify: inventory adjustment failed for SKU "%s": %s', $sku, $response->get_error_message() )
            );
            return false;
        }

        WCSS_Logger::info(
            sprintf( 'Shopify: adjusted inventory for SKU "%s" by -%d.', $sku, abs( $quantity ) )
        );

        return true;
    }

    /**
     * Fetch all products from Shopify for import into WooCommerce.
     *
     * Pages through the Products API, normalizes data, and enriches with inventory levels.
     *
     * @return array List of normalized product arrays.
     */
    public function get_products() {
        $products         = array();
        $all_inv_item_ids = array();
        $inv_item_to_sku  = array();
        $page_info        = null;

        // Page through all products.
        do {
            if ( $page_info ) {
                $endpoint = '/products.json?limit=250&page_info=' . urlencode( $page_info );
            } else {
                $endpoint = '/products.json?limit=250';
            }

            $response = $this->request( 'GET', $endpoint );

            if ( is_wp_error( $response ) ) {
                WCSS_Logger::error(
                    sprintf( 'Shopify: product list failed: %s', $response->get_error_message() )
                );
                break;
            }

            $raw_products = isset( $response['products'] ) ? $response['products'] : array();
            $page_info    = isset( $response['_next_page_info'] ) ? $response['_next_page_info'] : null;

            foreach ( $raw_products as $sp ) {
                $images = array();
                if ( ! empty( $sp['images'] ) ) {
                    foreach ( $sp['images'] as $img ) {
                        $images[] = $img['src'] ?? '';
                    }
                    $images = array_filter( $images );
                }

                $categories = array();
                if ( ! empty( $sp['product_type'] ) ) {
                    $categories[] = $sp['product_type'];
                }

                $variants = isset( $sp['variants'] ) ? $sp['variants'] : array();
                $is_active = ( 'active' === ( $sp['status'] ?? 'active' ) );

                if ( count( $variants ) === 1 ) {
                    // Simple product (single variant).
                    $v     = $variants[0];
                    $sku   = $v['sku'] ?? '';
                    $price = $v['price'] ?? '0.00';
                    $weight = $v['weight'] ?? '';

                    if ( isset( $v['inventory_item_id'] ) ) {
                        $all_inv_item_ids[] = $v['inventory_item_id'];
                        if ( $sku ) {
                            $inv_item_to_sku[ $v['inventory_item_id'] ] = $sku;
                        }
                    }

                    $products[] = array(
                        'name'        => $sp['title'] ?? '',
                        'description' => $sp['body_html'] ?? '',
                        'sku'         => $sku,
                        'price'       => $price,
                        'stock'       => null,
                        'images'      => $images,
                        'categories'  => $categories,
                        'variations'  => array(),
                        'weight'      => (string) $weight,
                        'status'      => $is_active ? 'active' : 'inactive',
                    );
                } else {
                    // Variable product (multiple variants).
                    $vars = array();
                    foreach ( $variants as $v ) {
                        $vsku   = $v['sku'] ?? '';
                        $vprice = $v['price'] ?? '0.00';
                        $vname  = $v['title'] ?? $vsku;

                        if ( isset( $v['inventory_item_id'] ) ) {
                            $all_inv_item_ids[] = $v['inventory_item_id'];
                            if ( $vsku ) {
                                $inv_item_to_sku[ $v['inventory_item_id'] ] = $vsku;
                            }
                        }

                        // Build attributes from Shopify's option values.
                        $attrs = array();
                        if ( ! empty( $sp['options'] ) ) {
                            foreach ( $sp['options'] as $idx => $option ) {
                                $position = $idx + 1;
                                $opt_key  = 'option' . $position;
                                if ( isset( $v[ $opt_key ] ) ) {
                                    $attrs[ $option['name'] ] = $v[ $opt_key ];
                                }
                            }
                        }

                        $vars[] = array(
                            'name'       => $vname,
                            'sku'        => $vsku,
                            'price'      => $vprice,
                            'stock'      => null,
                            'attributes' => $attrs,
                        );
                    }

                    $products[] = array(
                        'name'        => $sp['title'] ?? '',
                        'description' => $sp['body_html'] ?? '',
                        'sku'         => '',
                        'price'       => '',
                        'stock'       => null,
                        'images'      => $images,
                        'categories'  => $categories,
                        'variations'  => $vars,
                        'weight'      => '',
                        'status'      => $is_active ? 'active' : 'inactive',
                    );
                }
            }

            // Shopify uses Link header for cursor pagination (handled in request method).
        } while ( $page_info );

        // Enrich with inventory levels.
        if ( ! empty( $all_inv_item_ids ) ) {
            $levels = $this->get_inventory_levels( $all_inv_item_ids );

            // Build reverse map: SKU => stock quantity.
            $sku_stock = array();
            foreach ( $inv_item_to_sku as $item_id => $sku ) {
                if ( isset( $levels[ $item_id ] ) ) {
                    $sku_stock[ $sku ] = (int) $levels[ $item_id ];
                }
            }

            foreach ( $products as &$product ) {
                if ( empty( $product['variations'] ) ) {
                    if ( $product['sku'] && isset( $sku_stock[ $product['sku'] ] ) ) {
                        $product['stock'] = $sku_stock[ $product['sku'] ];
                    }
                } else {
                    foreach ( $product['variations'] as &$var ) {
                        if ( $var['sku'] && isset( $sku_stock[ $var['sku'] ] ) ) {
                            $var['stock'] = $sku_stock[ $var['sku'] ];
                        }
                    }
                    unset( $var );
                }
            }
            unset( $product );
        }

        WCSS_Logger::info( sprintf( 'Shopify: fetched %d product(s).', count( $products ) ) );

        return $products;
    }

    // ------------------------------------------------------------------
    //  Internal helpers
    // ------------------------------------------------------------------

    /**
     * Scan all Shopify product variants to map SKUs to inventory_item_ids.
     *
     * @param array $sku_lookup Keys are the SKUs we're looking for.
     * @return array SKU => inventory_item_id
     */
    private function map_skus_to_inventory_items( array $sku_lookup ) {
        $mapping    = array();
        $page_info  = null;

        do {
            if ( $page_info ) {
                $endpoint = '/products.json?limit=250&fields=variants&page_info=' . urlencode( $page_info );
            } else {
                $endpoint = '/products.json?limit=250&fields=variants';
            }

            $response = $this->request( 'GET', $endpoint );

            if ( is_wp_error( $response ) ) {
                WCSS_Logger::warning(
                    sprintf( 'Shopify: product scan failed: %s', $response->get_error_message() )
                );
                break;
            }

            $raw_products = isset( $response['products'] ) ? $response['products'] : array();
            $page_info    = isset( $response['_next_page_info'] ) ? $response['_next_page_info'] : null;

            foreach ( $raw_products as $product ) {
                $variants = isset( $product['variants'] ) ? $product['variants'] : array();
                foreach ( $variants as $variant ) {
                    $vsku = $variant['sku'] ?? '';
                    if ( $vsku && isset( $sku_lookup[ $vsku ] ) && isset( $variant['inventory_item_id'] ) ) {
                        $mapping[ $vsku ] = $variant['inventory_item_id'];
                    }
                }
            }

            // If we've found all SKUs we can stop early.
            if ( count( $mapping ) >= count( $sku_lookup ) ) {
                break;
            }
        } while ( $page_info );

        return $mapping;
    }

    /**
     * Fetch inventory levels for the given inventory_item_ids at the vendor's location.
     *
     * @param array $inventory_item_ids
     * @return array inventory_item_id => available quantity (int)
     */
    private function get_inventory_levels( array $inventory_item_ids ) {
        $levels = array();

        // Shopify allows up to 50 inventory_item_ids per request.
        foreach ( array_chunk( $inventory_item_ids, 50 ) as $chunk ) {
            $ids_param = implode( ',', $chunk );
            $endpoint  = sprintf(
                '/inventory_levels.json?inventory_item_ids=%s&location_ids=%s',
                $ids_param,
                $this->location_id
            );

            $response = $this->request( 'GET', $endpoint );

            if ( is_wp_error( $response ) ) {
                WCSS_Logger::warning(
                    sprintf( 'Shopify: inventory levels fetch failed: %s', $response->get_error_message() )
                );
                continue;
            }

            $raw_levels = isset( $response['inventory_levels'] ) ? $response['inventory_levels'] : array();
            foreach ( $raw_levels as $level ) {
                $item_id   = $level['inventory_item_id'] ?? null;
                $available = $level['available'] ?? 0;
                if ( $item_id ) {
                    $levels[ $item_id ] = (int) $available;
                }
            }
        }

        return $levels;
    }

    /**
     * Make an authenticated request to the Shopify Admin API.
     *
     * @param string $method HTTP method.
     * @param string $endpoint API path (e.g., '/products.json?limit=250').
     * @param array  $body Request body (will be JSON-encoded for POST/PUT).
     * @return array|WP_Error Decoded response body or WP_Error on failure.
     *                        Includes '_next_page_info' key if pagination Link header is present.
     */
    private function request( $method, $endpoint, array $body = array() ) {
        $url = sprintf( 'https://%s/admin/api/%s%s', $this->shop_domain, $this->api_version, $endpoint );

        $args = array(
            'method'  => $method,
            'headers' => array(
                'X-Shopify-Access-Token' => $this->access_token,
                'Content-Type'           => 'application/json',
            ),
            'timeout' => 30,
        );

        if ( ! empty( $body ) && in_array( $method, array( 'POST', 'PUT' ), true ) ) {
            $args['body'] = wp_json_encode( $body );
        }

        $response = wp_remote_request( $url, $args );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code    = wp_remote_retrieve_response_code( $response );
        $decoded = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code < 200 || $code >= 300 ) {
            $error_msg = 'Unknown error';
            if ( isset( $decoded['errors'] ) ) {
                $error_msg = is_string( $decoded['errors'] )
                    ? $decoded['errors']
                    : wp_json_encode( $decoded['errors'] );
            }
            return new WP_Error(
                'shopify_api_error',
                sprintf( 'Shopify API %s %s returned %d: %s', $method, $endpoint, $code, $error_msg )
            );
        }

        $result = is_array( $decoded ) ? $decoded : array();

        // Extract cursor pagination from Link header.
        $link_header = wp_remote_retrieve_header( $response, 'link' );
        if ( $link_header && preg_match( '/<[^>]*page_info=([^>&]*)>;\s*rel="next"/', $link_header, $matches ) ) {
            $result['_next_page_info'] = $matches[1];
        }

        return $result;
    }
}
