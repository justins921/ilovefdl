<?php
/**
 * Square Inventory Provider
 *
 * Implements the platform provider interface for Square.
 * Uses the Square Inventory API (v2) to read and adjust inventory counts.
 *
 * Square API docs referenced:
 *   - Catalog search by SKU: POST /v2/catalog/search-catalog-items
 *   - Batch retrieve inventory: POST /v2/inventory/batch-retrieve-counts
 *   - Batch change inventory:   POST /v2/inventory/batch-change
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WCSS_Square_Provider implements WCSS_Platform_Provider_Interface {

    /** @var string */
    private $access_token;

    /** @var string */
    private $location_id;

    /** @var string Square API base URL. */
    private $api_base = 'https://connect.squareup.com/v2';

    /**
     * @param array $vendor_config
     */
    public function __construct( array $vendor_config ) {
        $this->access_token = $vendor_config['square_access_token'];
        $this->location_id  = $vendor_config['square_location_id'];
    }

    /**
     * Fetch current inventory counts from Square for the given SKUs.
     *
     * Flow:
     *   1. Search the Square catalog by SKUs to get catalog_object_ids + variation IDs.
     *   2. Batch-retrieve inventory counts for those variation IDs at the vendor's location.
     *
     * @param array $skus
     * @return array SKU => quantity
     */
    public function get_inventory_counts( array $skus ) {
        if ( empty( $skus ) ) {
            return array();
        }

        // Step 1: Map SKUs to catalog variation object IDs.
        $sku_to_variation = $this->search_catalog_by_skus( $skus );

        if ( empty( $sku_to_variation ) ) {
            return array();
        }

        // Step 2: Get inventory counts for those variation IDs.
        $variation_ids = array_values( $sku_to_variation );
        $counts        = $this->batch_retrieve_counts( $variation_ids );

        // Step 3: Map back to SKUs.
        $result = array();
        foreach ( $sku_to_variation as $sku => $variation_id ) {
            if ( isset( $counts[ $variation_id ] ) ) {
                $result[ $sku ] = (int) $counts[ $variation_id ];
            }
        }

        return $result;
    }

    /**
     * Adjust (decrement) inventory on Square after a WooCommerce sale.
     *
     * @param string $sku
     * @param int    $quantity Positive number representing units sold.
     * @return bool
     */
    public function adjust_inventory( $sku, $quantity ) {
        $mapping = $this->search_catalog_by_skus( array( $sku ) );

        if ( empty( $mapping[ $sku ] ) ) {
            WCSS_Logger::error(
                sprintf( 'Square: could not find catalog item for SKU "%s" — inventory not adjusted.', $sku )
            );
            return false;
        }

        $variation_id = $mapping[ $sku ];

        $body = array(
            'idempotency_key' => wp_generate_uuid4(),
            'changes'         => array(
                array(
                    'type'            => 'ADJUSTMENT',
                    'adjustment'      => array(
                        'catalog_object_id' => $variation_id,
                        'location_id'       => $this->location_id,
                        'quantity'          => (string) abs( $quantity ),
                        'from_state'        => 'IN_STOCK',
                        'to_state'          => 'SOLD',
                        'occurred_at'       => gmdate( 'Y-m-d\TH:i:s.000\Z' ),
                    ),
                ),
            ),
        );

        $response = $this->request( 'POST', '/inventory/batch-change', $body );

        if ( is_wp_error( $response ) ) {
            WCSS_Logger::error(
                sprintf( 'Square: inventory adjustment failed for SKU "%s": %s', $sku, $response->get_error_message() )
            );
            return false;
        }

        WCSS_Logger::info(
            sprintf( 'Square: adjusted inventory for SKU "%s" by -%d.', $sku, abs( $quantity ) )
        );

        return true;
    }

    // ------------------------------------------------------------------
    //  Internal helpers
    // ------------------------------------------------------------------

    /**
     * Search Square catalog for items matching the given SKUs.
     *
     * Uses the Search Catalog Items endpoint which supports text/keyword search,
     * then filters results by exact SKU match on the item variations.
     *
     * @param array $skus
     * @return array SKU => variation_object_id
     */
    private function search_catalog_by_skus( array $skus ) {
        $mapping = array();

        // Square's search endpoint handles batches, but we chunk to be safe with large catalogs.
        foreach ( array_chunk( $skus, 100 ) as $chunk ) {
            $body = array(
                'object_types' => array( 'ITEM' ),
                'query'        => array(
                    'exact_query' => array(
                        'attribute_name'  => 'sku',
                        'attribute_value' => '', // placeholder — we loop per-SKU below
                    ),
                ),
            );

            // The exact_query only supports one value at a time, so iterate.
            foreach ( $chunk as $sku ) {
                $body['query']['exact_query']['attribute_value'] = $sku;
                $response = $this->request( 'POST', '/catalog/search-catalog-items', $body );

                if ( is_wp_error( $response ) ) {
                    WCSS_Logger::warning(
                        sprintf( 'Square: catalog search failed for SKU "%s": %s', $sku, $response->get_error_message() )
                    );
                    continue;
                }

                $items = isset( $response['items'] ) ? $response['items'] : array();
                foreach ( $items as $item ) {
                    $variations = isset( $item['item_data']['variations'] ) ? $item['item_data']['variations'] : array();
                    foreach ( $variations as $variation ) {
                        $var_sku = isset( $variation['item_variation_data']['sku'] )
                            ? $variation['item_variation_data']['sku']
                            : '';
                        if ( strcasecmp( $var_sku, $sku ) === 0 ) {
                            $mapping[ $sku ] = $variation['id'];
                            break 2; // found match, move to next SKU
                        }
                    }
                }
            }
        }

        return $mapping;
    }

    /**
     * Batch retrieve inventory counts for catalog object (variation) IDs.
     *
     * @param array $catalog_object_ids
     * @return array catalog_object_id => quantity (int)
     */
    private function batch_retrieve_counts( array $catalog_object_ids ) {
        $counts = array();

        foreach ( array_chunk( $catalog_object_ids, 100 ) as $chunk ) {
            $body = array(
                'catalog_object_ids' => $chunk,
                'location_ids'       => array( $this->location_id ),
            );

            $response = $this->request( 'POST', '/inventory/batch-retrieve-counts', $body );

            if ( is_wp_error( $response ) ) {
                WCSS_Logger::warning(
                    sprintf( 'Square: batch inventory retrieve failed: %s', $response->get_error_message() )
                );
                continue;
            }

            $raw_counts = isset( $response['counts'] ) ? $response['counts'] : array();
            foreach ( $raw_counts as $count_entry ) {
                // Only consider IN_STOCK state.
                if ( 'IN_STOCK' !== ( $count_entry['state'] ?? '' ) ) {
                    continue;
                }
                $obj_id = $count_entry['catalog_object_id'];
                $qty    = isset( $count_entry['quantity'] ) ? (int) $count_entry['quantity'] : 0;

                // Sum quantities if there are multiple entries (shouldn't happen per-location, but be safe).
                if ( isset( $counts[ $obj_id ] ) ) {
                    $counts[ $obj_id ] += $qty;
                } else {
                    $counts[ $obj_id ] = $qty;
                }
            }
        }

        return $counts;
    }

    /**
     * Make an authenticated request to the Square API.
     *
     * @param string $method HTTP method.
     * @param string $endpoint API path (e.g., '/inventory/batch-retrieve-counts').
     * @param array  $body Request body (will be JSON-encoded).
     * @return array|WP_Error Decoded response body or WP_Error on failure.
     */
    private function request( $method, $endpoint, array $body = array() ) {
        $url = $this->api_base . $endpoint;

        $args = array(
            'method'  => $method,
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->access_token,
                'Content-Type'  => 'application/json',
                'Square-Version' => '2024-12-18',
            ),
            'timeout' => 30,
        );

        if ( ! empty( $body ) ) {
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
            if ( isset( $decoded['errors'][0]['detail'] ) ) {
                $error_msg = $decoded['errors'][0]['detail'];
            }
            return new WP_Error(
                'square_api_error',
                sprintf( 'Square API %s %s returned %d: %s', $method, $endpoint, $code, $error_msg )
            );
        }

        return is_array( $decoded ) ? $decoded : array();
    }
}
