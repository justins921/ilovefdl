<?php
/**
 * Etsy Inventory Provider
 *
 * Implements the platform provider interface for Etsy.
 * Uses the Etsy Open API v3 to read listings, read/update inventory,
 * and fetch products for import into WooCommerce.
 *
 * Etsy Open API v3 docs referenced:
 *   - Shop Listings:      GET  /v3/application/shops/{shop_id}/listings/active
 *   - Listing Inventory:  GET  /v3/application/listings/{listing_id}/inventory
 *   - Update Inventory:   PUT  /v3/application/listings/{listing_id}/inventory
 *   - Listing Images:     (included via ?includes=images on listings endpoint)
 *
 * Products are matched between Etsy and WooCommerce by SKU.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WCSS_Etsy_Provider implements WCSS_Platform_Provider_Interface {

    /** @var string Etsy API keystring (client ID from Etsy Developer Portal). */
    private $api_key;

    /** @var string Numeric Etsy shop ID. */
    private $shop_id;

    /** @var string OAuth 2.0 access token for write operations. */
    private $access_token;

    /** @var string Etsy Open API v3 base URL. */
    private $api_base = 'https://openapi.etsy.com/v3/application';

    /**
     * @param array $vendor_config
     */
    public function __construct( array $vendor_config ) {
        $this->api_key      = $vendor_config['etsy_api_key'];
        $this->shop_id      = $vendor_config['etsy_shop_id'];
        $this->access_token = $vendor_config['etsy_access_token'];
    }

    /**
     * Fetch inventory counts from Etsy for the given SKUs.
     *
     * Flow:
     *   1. Page through active listings to find those matching the requested SKUs.
     *   2. For each matching listing, fetch inventory details.
     *   3. Map each product's SKU to its total available quantity.
     *
     * @param array $skus
     * @return array SKU => quantity
     */
    public function get_inventory_counts( array $skus ) {
        if ( empty( $skus ) ) {
            return array();
        }

        $sku_lookup = array_flip( $skus );
        $result     = array();

        // Step 1: Find listings whose SKUs overlap with the requested set.
        $matching = $this->find_listings_by_skus( $sku_lookup );

        // Step 2: Fetch inventory for each matching listing.
        foreach ( $matching as $listing_id ) {
            $inventory = $this->get_listing_inventory( $listing_id );
            if ( is_wp_error( $inventory ) ) {
                continue;
            }

            $products = isset( $inventory['products'] ) ? $inventory['products'] : array();
            foreach ( $products as $product ) {
                $psku = isset( $product['sku'] ) ? $product['sku'] : '';
                if ( $psku && isset( $sku_lookup[ $psku ] ) ) {
                    $qty       = 0;
                    $offerings = isset( $product['offerings'] ) ? $product['offerings'] : array();
                    foreach ( $offerings as $offering ) {
                        if ( ! empty( $offering['is_enabled'] ) && empty( $offering['is_deleted'] ) ) {
                            $qty += (int) ( $offering['quantity'] ?? 0 );
                        }
                    }
                    $result[ $psku ] = $qty;
                }
            }
        }

        return $result;
    }

    /**
     * Adjust (decrement) inventory on Etsy after a WooCommerce sale.
     *
     * Etsy does not have a simple "decrement" endpoint. Instead we must:
     *   1. Find the listing containing the SKU.
     *   2. Fetch its current inventory.
     *   3. Subtract the sold quantity from the matching product's offering.
     *   4. PUT the updated inventory back.
     *
     * @param string $sku
     * @param int    $quantity Positive number representing units sold.
     * @return bool
     */
    public function adjust_inventory( $sku, $quantity ) {
        $listings = $this->find_listings_by_skus( array( $sku => 0 ) );

        if ( empty( $listings ) ) {
            WCSS_Logger::error(
                sprintf( 'Etsy: could not find listing for SKU "%s" — inventory not adjusted.', $sku )
            );
            return false;
        }

        $listing_id = $listings[0];

        // Get current inventory.
        $inventory = $this->get_listing_inventory( $listing_id );
        if ( is_wp_error( $inventory ) ) {
            WCSS_Logger::error(
                sprintf( 'Etsy: failed to fetch inventory for listing %d: %s', $listing_id, $inventory->get_error_message() )
            );
            return false;
        }

        $products         = isset( $inventory['products'] ) ? $inventory['products'] : array();
        $updated_products = array();
        $found            = false;

        foreach ( $products as $product ) {
            $psku      = isset( $product['sku'] ) ? $product['sku'] : '';
            $offerings = isset( $product['offerings'] ) ? $product['offerings'] : array();

            $updated_offerings = array();
            foreach ( $offerings as $offering ) {
                $off = array(
                    'price'      => isset( $offering['price']['amount'], $offering['price']['divisor'] )
                        ? (float) ( $offering['price']['amount'] / $offering['price']['divisor'] )
                        : 0,
                    'quantity'   => (int) ( $offering['quantity'] ?? 0 ),
                    'is_enabled' => (bool) ( $offering['is_enabled'] ?? true ),
                );

                // Decrement this offering if it matches the target SKU.
                if ( $psku === $sku && ! $found ) {
                    $off['quantity'] = max( 0, $off['quantity'] - abs( (int) $quantity ) );
                    $found           = true;
                }

                $updated_offerings[] = $off;
            }

            // Rebuild property_values for the update payload.
            $prop_values = array();
            if ( ! empty( $product['property_values'] ) ) {
                foreach ( $product['property_values'] as $pv ) {
                    $prop_values[] = array(
                        'property_id' => $pv['property_id'],
                        'value_ids'   => isset( $pv['value_ids'] ) ? $pv['value_ids'] : array(),
                        'values'      => isset( $pv['values'] ) ? $pv['values'] : array(),
                    );
                }
            }

            $updated_products[] = array(
                'sku'             => $psku,
                'property_values' => $prop_values,
                'offerings'       => $updated_offerings,
            );
        }

        if ( ! $found ) {
            WCSS_Logger::error(
                sprintf( 'Etsy: SKU "%s" not found in listing %d inventory.', $sku, $listing_id )
            );
            return false;
        }

        // PUT the updated inventory.
        $body     = array( 'products' => $updated_products );
        $response = $this->request( 'PUT', '/listings/' . $listing_id . '/inventory', $body );

        if ( is_wp_error( $response ) ) {
            WCSS_Logger::error(
                sprintf( 'Etsy: inventory update failed for SKU "%s": %s', $sku, $response->get_error_message() )
            );
            return false;
        }

        WCSS_Logger::info(
            sprintf( 'Etsy: adjusted inventory for SKU "%s" by -%d.', $sku, abs( $quantity ) )
        );

        return true;
    }

    /**
     * Fetch all products from Etsy for import into WooCommerce.
     *
     * Pages through active listings, fetches inventory for each,
     * and normalizes to the standard product format.
     *
     * @return array List of normalized product arrays.
     */
    public function get_products() {
        $products = array();
        $offset   = 0;
        $limit    = 100;

        do {
            $endpoint = sprintf(
                '/shops/%s/listings/active?limit=%d&offset=%d&includes=images',
                $this->shop_id,
                $limit,
                $offset
            );

            $response = $this->request( 'GET', $endpoint );

            if ( is_wp_error( $response ) ) {
                WCSS_Logger::error(
                    sprintf( 'Etsy: listing fetch failed: %s', $response->get_error_message() )
                );
                break;
            }

            $results = isset( $response['results'] ) ? $response['results'] : array();
            $count   = isset( $response['count'] ) ? (int) $response['count'] : 0;

            foreach ( $results as $listing ) {
                $listing_id = isset( $listing['listing_id'] ) ? $listing['listing_id'] : 0;
                if ( ! $listing_id ) {
                    continue;
                }

                // Extract images.
                $images = array();
                if ( ! empty( $listing['images'] ) ) {
                    foreach ( $listing['images'] as $img ) {
                        $url = isset( $img['url_fullxfull'] ) ? $img['url_fullxfull'] : '';
                        if ( ! $url ) {
                            $url = isset( $img['url_570xN'] ) ? $img['url_570xN'] : '';
                        }
                        if ( $url ) {
                            $images[] = $url;
                        }
                    }
                }

                // Use first tag as a category.
                $categories = array();
                if ( ! empty( $listing['tags'] ) ) {
                    $categories[] = $listing['tags'][0];
                }

                // Determine listing-level price.
                $listing_price = '0.00';
                if ( isset( $listing['price']['amount'], $listing['price']['divisor'] ) ) {
                    $listing_price = number_format(
                        $listing['price']['amount'] / $listing['price']['divisor'],
                        2, '.', ''
                    );
                }

                // Fetch inventory for this listing.
                $inventory    = $this->get_listing_inventory( $listing_id );
                $inv_products = array();
                if ( ! is_wp_error( $inventory ) && ! empty( $inventory['products'] ) ) {
                    // Filter to non-deleted products.
                    foreach ( $inventory['products'] as $ip ) {
                        if ( empty( $ip['is_deleted'] ) ) {
                            $inv_products[] = $ip;
                        }
                    }
                }

                if ( count( $inv_products ) <= 1 ) {
                    // Simple product.
                    $sku   = '';
                    $stock = null;
                    $price = $listing_price;

                    if ( ! empty( $inv_products ) ) {
                        $ip  = $inv_products[0];
                        $sku = isset( $ip['sku'] ) ? $ip['sku'] : '';

                        $qty = 0;
                        foreach ( ( isset( $ip['offerings'] ) ? $ip['offerings'] : array() ) as $off ) {
                            if ( ! empty( $off['is_enabled'] ) && empty( $off['is_deleted'] ) ) {
                                $qty += (int) ( $off['quantity'] ?? 0 );
                            }
                            if ( isset( $off['price']['amount'], $off['price']['divisor'] ) ) {
                                $price = number_format(
                                    $off['price']['amount'] / $off['price']['divisor'],
                                    2, '.', ''
                                );
                            }
                        }
                        $stock = $qty;
                    }

                    $products[] = array(
                        'name'        => isset( $listing['title'] ) ? $listing['title'] : '',
                        'description' => isset( $listing['description'] ) ? $listing['description'] : '',
                        'sku'         => $sku,
                        'price'       => $price,
                        'stock'       => $stock,
                        'images'      => $images,
                        'categories'  => $categories,
                        'variations'  => array(),
                        'weight'      => '',
                        'status'      => 'active',
                    );
                } else {
                    // Variable product (multiple inventory products).
                    $vars = array();
                    foreach ( $inv_products as $ip ) {
                        $vsku   = isset( $ip['sku'] ) ? $ip['sku'] : '';
                        $vprice = $listing_price;
                        $vstock = null;

                        // Build attributes from property_values.
                        $attrs = array();
                        if ( ! empty( $ip['property_values'] ) ) {
                            foreach ( $ip['property_values'] as $pv ) {
                                $attr_name  = isset( $pv['property_name'] ) ? $pv['property_name'] : 'Option';
                                $attr_value = ! empty( $pv['values'] ) ? $pv['values'][0] : '';
                                if ( $attr_value ) {
                                    $attrs[ $attr_name ] = $attr_value;
                                }
                            }
                        }

                        $qty = 0;
                        foreach ( ( isset( $ip['offerings'] ) ? $ip['offerings'] : array() ) as $off ) {
                            if ( ! empty( $off['is_enabled'] ) && empty( $off['is_deleted'] ) ) {
                                $qty += (int) ( $off['quantity'] ?? 0 );
                            }
                            if ( isset( $off['price']['amount'], $off['price']['divisor'] ) ) {
                                $vprice = number_format(
                                    $off['price']['amount'] / $off['price']['divisor'],
                                    2, '.', ''
                                );
                            }
                        }
                        $vstock = $qty;

                        $vname = $vsku;
                        if ( ! empty( $attrs ) ) {
                            $vname = implode( ' / ', $attrs );
                        }

                        $vars[] = array(
                            'name'       => $vname,
                            'sku'        => $vsku,
                            'price'      => $vprice,
                            'stock'      => $vstock,
                            'attributes' => $attrs,
                        );
                    }

                    $products[] = array(
                        'name'        => isset( $listing['title'] ) ? $listing['title'] : '',
                        'description' => isset( $listing['description'] ) ? $listing['description'] : '',
                        'sku'         => '',
                        'price'       => '',
                        'stock'       => null,
                        'images'      => $images,
                        'categories'  => $categories,
                        'variations'  => $vars,
                        'weight'      => '',
                        'status'      => 'active',
                    );
                }
            }

            $offset += $limit;
        } while ( $offset < $count );

        WCSS_Logger::info( sprintf( 'Etsy: fetched %d product(s).', count( $products ) ) );

        return $products;
    }

    // ------------------------------------------------------------------
    //  Internal helpers
    // ------------------------------------------------------------------

    /**
     * Find listing IDs whose SKUs overlap with the given lookup set.
     *
     * Pages through active listings and checks each listing's skus array.
     *
     * @param array $sku_lookup Keys are the SKUs to find.
     * @return array List of matching listing IDs.
     */
    private function find_listings_by_skus( array $sku_lookup ) {
        $matching = array();
        $offset   = 0;
        $limit    = 100;

        do {
            $endpoint = sprintf(
                '/shops/%s/listings/active?limit=%d&offset=%d',
                $this->shop_id,
                $limit,
                $offset
            );

            $response = $this->request( 'GET', $endpoint );

            if ( is_wp_error( $response ) ) {
                WCSS_Logger::warning(
                    sprintf( 'Etsy: listing scan failed: %s', $response->get_error_message() )
                );
                break;
            }

            $results = isset( $response['results'] ) ? $response['results'] : array();
            $count   = isset( $response['count'] ) ? (int) $response['count'] : 0;

            foreach ( $results as $listing ) {
                $listing_skus = isset( $listing['skus'] ) ? $listing['skus'] : array();
                foreach ( $listing_skus as $lsku ) {
                    if ( isset( $sku_lookup[ $lsku ] ) ) {
                        $matching[] = $listing['listing_id'];
                        break;
                    }
                }
            }

            $offset += $limit;
        } while ( $offset < $count );

        return array_unique( $matching );
    }

    /**
     * Fetch inventory for a single listing.
     *
     * @param int $listing_id
     * @return array|WP_Error Inventory data or WP_Error.
     */
    private function get_listing_inventory( $listing_id ) {
        return $this->request( 'GET', '/listings/' . $listing_id . '/inventory' );
    }

    /**
     * Make an authenticated request to the Etsy Open API v3.
     *
     * Read-only requests use the API key. Write requests also include
     * the OAuth 2.0 access token.
     *
     * @param string $method HTTP method.
     * @param string $endpoint API path (appended to the base URL).
     * @param array  $body Request body (JSON-encoded for PUT/POST).
     * @return array|WP_Error Decoded response or WP_Error.
     */
    private function request( $method, $endpoint, array $body = array() ) {
        $url = $this->api_base . $endpoint;

        $headers = array(
            'x-api-key'   => $this->api_key,
            'Content-Type' => 'application/json',
        );

        // Write operations require OAuth bearer token.
        if ( in_array( $method, array( 'PUT', 'POST', 'DELETE', 'PATCH' ), true ) ) {
            $headers['Authorization'] = 'Bearer ' . $this->access_token;
        }

        $args = array(
            'method'  => $method,
            'headers' => $headers,
            'timeout' => 30,
        );

        if ( ! empty( $body ) && in_array( $method, array( 'POST', 'PUT', 'PATCH' ), true ) ) {
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
            if ( isset( $decoded['error'] ) ) {
                $error_msg = $decoded['error'];
            } elseif ( isset( $decoded['error_msg'] ) ) {
                $error_msg = $decoded['error_msg'];
            }
            return new WP_Error(
                'etsy_api_error',
                sprintf( 'Etsy API %s %s returned %d: %s', $method, $endpoint, $code, $error_msg )
            );
        }

        return is_array( $decoded ) ? $decoded : array();
    }
}
