<?php
/**
 * Product Importer
 *
 * Pulls products from an external platform (Square or Shopify) via the platform
 * provider and creates or updates them as WooCommerce products assigned to the
 * specified Dokan vendor.
 *
 * Products are matched by SKU:
 *   - If a WooCommerce product with the same SKU already exists for this vendor, it is updated.
 *   - If no match is found, a new product is created.
 *
 * Supports both simple and variable products.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WCSS_Product_Importer {

    /** @var WCSS_Vendor_Config */
    private $vendor_config;

    /**
     * @param WCSS_Vendor_Config $vendor_config
     */
    public function __construct( WCSS_Vendor_Config $vendor_config ) {
        $this->vendor_config = $vendor_config;
    }

    /**
     * Import products for a vendor from their configured platform.
     *
     * @param int  $vendor_id
     * @param bool $dry_run If true, log what would happen without creating/updating products.
     * @return array Summary: 'created' => int, 'updated' => int, 'skipped' => int, 'errors' => int
     */
    public function import( $vendor_id, $dry_run = false ) {
        $config = $this->vendor_config->get_vendor( $vendor_id );

        if ( ! $config ) {
            WCSS_Logger::error( sprintf( 'Import: vendor %d is not configured or not enabled.', $vendor_id ) );
            return array( 'created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => 1 );
        }

        $summary = array(
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors'  => 0,
        );

        WCSS_Logger::info(
            sprintf( 'Import: starting for vendor %d (%s) from %s.', $vendor_id, $config['label'], $config['platform'] )
        );

        try {
            $provider = WCSS_Platform_Factory::create( $config );
            $products = $provider->get_products();
        } catch ( Exception $e ) {
            WCSS_Logger::error(
                sprintf( 'Import: failed to fetch products for vendor %d: %s', $vendor_id, $e->getMessage() )
            );
            return array( 'created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => 1 );
        }

        if ( empty( $products ) ) {
            WCSS_Logger::info( sprintf( 'Import: no products found on %s for vendor %d.', $config['platform'], $vendor_id ) );
            return $summary;
        }

        WCSS_Logger::info( sprintf( 'Import: %d product(s) fetched from %s.', count( $products ), $config['platform'] ) );

        // Build a lookup of existing WooCommerce SKUs for this vendor.
        $existing_skus = $this->get_vendor_sku_map( $vendor_id );

        foreach ( $products as $product_data ) {
            // Skip inactive products.
            if ( 'active' !== ( $product_data['status'] ?? 'active' ) ) {
                $summary['skipped']++;
                continue;
            }

            try {
                $result = $this->import_single_product( $vendor_id, $product_data, $existing_skus, $dry_run );
                $summary[ $result ]++;
            } catch ( Exception $e ) {
                WCSS_Logger::error(
                    sprintf(
                        'Import: error importing "%s" (SKU: %s) for vendor %d: %s',
                        $product_data['name'],
                        $product_data['sku'],
                        $vendor_id,
                        $e->getMessage()
                    )
                );
                $summary['errors']++;
            }
        }

        WCSS_Logger::info(
            sprintf(
                'Import: vendor %d complete — %d created, %d updated, %d skipped, %d errors.',
                $vendor_id,
                $summary['created'],
                $summary['updated'],
                $summary['skipped'],
                $summary['errors']
            )
        );

        return $summary;
    }

    /**
     * Import or update a single product.
     *
     * @param int    $vendor_id
     * @param array  $data Normalized product data from the platform provider.
     * @param array  $existing_skus SKU => WC product ID map for this vendor.
     * @param bool   $dry_run
     * @return string 'created', 'updated', or 'skipped'
     */
    private function import_single_product( $vendor_id, array $data, array &$existing_skus, $dry_run ) {
        $is_variable = ! empty( $data['variations'] );

        if ( $is_variable ) {
            return $this->import_variable_product( $vendor_id, $data, $existing_skus, $dry_run );
        }

        return $this->import_simple_product( $vendor_id, $data, $existing_skus, $dry_run );
    }

    /**
     * Import/update a simple product.
     *
     * @param int    $vendor_id
     * @param array  $data
     * @param array  $existing_skus
     * @param bool   $dry_run
     * @return string
     */
    private function import_simple_product( $vendor_id, array $data, array &$existing_skus, $dry_run ) {
        $sku = $data['sku'];

        if ( ! $sku ) {
            WCSS_Logger::warning(
                sprintf( 'Import: product "%s" has no SKU — skipped.', $data['name'] )
            );
            return 'skipped';
        }

        $existing_id = isset( $existing_skus[ $sku ] ) ? $existing_skus[ $sku ] : null;

        if ( $dry_run ) {
            $action = $existing_id ? 'would update' : 'would create';
            WCSS_Logger::info( sprintf( 'Import (dry run): %s simple product "%s" (SKU: %s).', $action, $data['name'], $sku ) );
            return $existing_id ? 'updated' : 'created';
        }

        if ( $existing_id ) {
            $product = wc_get_product( $existing_id );
            if ( ! $product ) {
                $product = new WC_Product_Simple();
            }
        } else {
            $product = new WC_Product_Simple();
        }

        $product->set_name( $data['name'] );
        $product->set_sku( $sku );
        $product->set_regular_price( $data['price'] );
        $product->set_description( $data['description'] );

        if ( $data['weight'] ) {
            $product->set_weight( $data['weight'] );
        }

        // Stock management.
        if ( null !== $data['stock'] ) {
            $product->set_manage_stock( true );
            $product->set_stock_quantity( $data['stock'] );
            $product->set_stock_status( $data['stock'] > 0 ? 'instock' : 'outofstock' );
        }

        $product->set_status( 'publish' );
        $product_id = $product->save();

        // Assign to vendor (Dokan uses post_author).
        wp_update_post( array(
            'ID'          => $product_id,
            'post_author' => $vendor_id,
        ) );

        // Categories.
        $this->assign_categories( $product_id, $data['categories'] );

        // Images.
        $this->attach_images( $product_id, $data['images'] );

        $existing_skus[ $sku ] = $product_id;

        $action = $existing_id ? 'updated' : 'created';
        WCSS_Logger::info(
            sprintf( 'Import: %s simple product "%s" (SKU: %s, ID: %d).', $action, $data['name'], $sku, $product_id )
        );

        return $action;
    }

    /**
     * Import/update a variable product with variations.
     *
     * @param int    $vendor_id
     * @param array  $data
     * @param array  $existing_skus
     * @param bool   $dry_run
     * @return string
     */
    private function import_variable_product( $vendor_id, array $data, array &$existing_skus, $dry_run ) {
        // For variable products, check if any variation SKU already exists to find the parent.
        $existing_parent_id = null;
        foreach ( $data['variations'] as $var ) {
            if ( ! empty( $var['sku'] ) && isset( $existing_skus[ $var['sku'] ] ) ) {
                $existing_product = wc_get_product( $existing_skus[ $var['sku'] ] );
                if ( $existing_product ) {
                    $parent_id = $existing_product->get_parent_id();
                    $existing_parent_id = $parent_id ? $parent_id : $existing_product->get_id();
                    break;
                }
            }
        }

        if ( $dry_run ) {
            $action = $existing_parent_id ? 'would update' : 'would create';
            WCSS_Logger::info(
                sprintf(
                    'Import (dry run): %s variable product "%s" with %d variations.',
                    $action,
                    $data['name'],
                    count( $data['variations'] )
                )
            );
            return $existing_parent_id ? 'updated' : 'created';
        }

        // Create or load parent product.
        if ( $existing_parent_id ) {
            $parent = wc_get_product( $existing_parent_id );
            if ( ! $parent || ! $parent->is_type( 'variable' ) ) {
                $parent = new WC_Product_Variable();
            }
        } else {
            $parent = new WC_Product_Variable();
        }

        $parent->set_name( $data['name'] );
        $parent->set_description( $data['description'] );
        $parent->set_status( 'publish' );

        // Collect all attribute names and values from variations.
        $attr_map = array();
        foreach ( $data['variations'] as $var ) {
            foreach ( ( $var['attributes'] ?? array() ) as $attr_name => $attr_value ) {
                if ( ! isset( $attr_map[ $attr_name ] ) ) {
                    $attr_map[ $attr_name ] = array();
                }
                $attr_map[ $attr_name ][] = $attr_value;
            }
        }

        // Set product attributes.
        $attributes = array();
        $position   = 0;
        foreach ( $attr_map as $attr_name => $values ) {
            $attribute = new WC_Product_Attribute();
            $attribute->set_name( $attr_name );
            $attribute->set_options( array_unique( $values ) );
            $attribute->set_visible( true );
            $attribute->set_variation( true );
            $attribute->set_position( $position++ );
            $attributes[] = $attribute;
        }
        $parent->set_attributes( $attributes );

        $parent_id = $parent->save();

        // Assign to vendor.
        wp_update_post( array(
            'ID'          => $parent_id,
            'post_author' => $vendor_id,
        ) );

        // Categories and images on parent.
        $this->assign_categories( $parent_id, $data['categories'] );
        $this->attach_images( $parent_id, $data['images'] );

        // Create/update variations.
        foreach ( $data['variations'] as $var_data ) {
            $var_sku = $var_data['sku'] ?? '';

            if ( ! $var_sku ) {
                continue;
            }

            // Check if this variation already exists.
            $existing_var_id = isset( $existing_skus[ $var_sku ] ) ? $existing_skus[ $var_sku ] : null;

            if ( $existing_var_id ) {
                $variation = wc_get_product( $existing_var_id );
                if ( ! $variation || ! $variation->is_type( 'variation' ) ) {
                    $variation = new WC_Product_Variation();
                }
            } else {
                $variation = new WC_Product_Variation();
            }

            $variation->set_parent_id( $parent_id );
            $variation->set_sku( $var_sku );
            $variation->set_regular_price( $var_data['price'] ?? '' );

            // Set variation attributes (lowercase keys for WooCommerce).
            $var_attrs = array();
            foreach ( ( $var_data['attributes'] ?? array() ) as $attr_name => $attr_value ) {
                $var_attrs[ sanitize_title( $attr_name ) ] = $attr_value;
            }
            $variation->set_attributes( $var_attrs );

            // Stock management.
            if ( null !== ( $var_data['stock'] ?? null ) ) {
                $variation->set_manage_stock( true );
                $variation->set_stock_quantity( $var_data['stock'] );
                $variation->set_stock_status( $var_data['stock'] > 0 ? 'instock' : 'outofstock' );
            }

            $variation->set_status( 'publish' );
            $var_id = $variation->save();

            $existing_skus[ $var_sku ] = $var_id;
        }

        // Sync the variable product data cache.
        WC_Product_Variable::sync( $parent_id );

        $action = $existing_parent_id ? 'updated' : 'created';
        WCSS_Logger::info(
            sprintf(
                'Import: %s variable product "%s" (ID: %d) with %d variations.',
                $action,
                $data['name'],
                $parent_id,
                count( $data['variations'] )
            )
        );

        return $action;
    }

    /**
     * Build a map of SKU => WooCommerce product/variation ID for a vendor.
     *
     * @param int $vendor_id
     * @return array
     */
    private function get_vendor_sku_map( $vendor_id ) {
        $map  = array();
        $args = array(
            'post_type'      => array( 'product', 'product_variation' ),
            'post_status'    => 'any',
            'author'         => $vendor_id,
            'posts_per_page' => -1,
            'fields'         => 'ids',
        );

        $query = new WP_Query( $args );

        foreach ( $query->posts as $product_id ) {
            $product = wc_get_product( $product_id );
            if ( ! $product ) {
                continue;
            }

            $sku = $product->get_sku();
            if ( $sku ) {
                $map[ $sku ] = $product_id;
            }

            // Also check children of variable products.
            if ( $product->is_type( 'variable' ) ) {
                foreach ( $product->get_children() as $child_id ) {
                    $child = wc_get_product( $child_id );
                    if ( $child && $child->get_sku() ) {
                        $map[ $child->get_sku() ] = $child_id;
                    }
                }
            }
        }

        return $map;
    }

    /**
     * Assign product categories by name, creating them if needed.
     *
     * @param int   $product_id
     * @param array $category_names
     */
    private function assign_categories( $product_id, array $category_names ) {
        if ( empty( $category_names ) ) {
            return;
        }

        $term_ids = array();
        foreach ( $category_names as $cat_name ) {
            $cat_name = trim( $cat_name );
            if ( ! $cat_name ) {
                continue;
            }

            $term = get_term_by( 'name', $cat_name, 'product_cat' );
            if ( $term ) {
                $term_ids[] = $term->term_id;
            } else {
                $result = wp_insert_term( $cat_name, 'product_cat' );
                if ( ! is_wp_error( $result ) ) {
                    $term_ids[] = $result['term_id'];
                }
            }
        }

        if ( ! empty( $term_ids ) ) {
            wp_set_object_terms( $product_id, $term_ids, 'product_cat' );
        }
    }

    /**
     * Download and attach images to a product.
     *
     * Only attaches images that aren't already on the product to avoid duplicates.
     *
     * @param int   $product_id
     * @param array $image_urls
     */
    private function attach_images( $product_id, array $image_urls ) {
        if ( empty( $image_urls ) ) {
            return;
        }

        // Include the media sideload function if not available.
        if ( ! function_exists( 'media_sideload_image' ) ) {
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
        }

        $product     = wc_get_product( $product_id );
        $gallery_ids = $product ? $product->get_gallery_image_ids() : array();
        $thumbnail   = get_post_thumbnail_id( $product_id );

        // Skip if product already has images (avoid re-downloading on update).
        if ( $thumbnail ) {
            return;
        }

        $attachment_ids = array();

        foreach ( $image_urls as $url ) {
            $url = esc_url_raw( $url );
            if ( ! $url ) {
                continue;
            }

            $id = media_sideload_image( $url, $product_id, '', 'id' );
            if ( ! is_wp_error( $id ) ) {
                $attachment_ids[] = $id;
            } else {
                WCSS_Logger::warning(
                    sprintf( 'Import: failed to download image "%s" for product %d: %s', $url, $product_id, $id->get_error_message() )
                );
            }
        }

        if ( ! empty( $attachment_ids ) ) {
            // First image = thumbnail, rest = gallery.
            set_post_thumbnail( $product_id, $attachment_ids[0] );

            if ( count( $attachment_ids ) > 1 && $product ) {
                $product->set_gallery_image_ids( array_slice( $attachment_ids, 1 ) );
                $product->save();
            }
        }
    }
}
