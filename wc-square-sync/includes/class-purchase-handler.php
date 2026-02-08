<?php
/**
 * Purchase Handler
 *
 * Hooks into WooCommerce order completion to push inventory decrements to Square
 * for vendors that are configured for sync.
 *
 * This is the ONLY direction where WooCommerce updates Square.
 * The periodic sync (WCSS_Sync_Scheduler) handles the reverse: Square → WooCommerce.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WCSS_Purchase_Handler {

    /** @var WCSS_Vendor_Config */
    private $vendor_config;

    /**
     * @param WCSS_Vendor_Config $vendor_config
     */
    public function __construct( WCSS_Vendor_Config $vendor_config ) {
        $this->vendor_config = $vendor_config;
    }

    /**
     * Register hooks.
     */
    public function init() {
        // Fire when an order moves to "processing" or "completed" status.
        // "processing" is used because that's when payment is confirmed and stock is reduced by WooCommerce.
        add_action( 'woocommerce_order_status_processing', array( $this, 'handle_order' ), 10, 1 );
        add_action( 'woocommerce_order_status_completed', array( $this, 'handle_order' ), 10, 1 );
    }

    /**
     * Process an order and push inventory adjustments to Square for applicable vendors.
     *
     * @param int $order_id
     */
    public function handle_order( $order_id ) {
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        // Prevent processing the same order twice (e.g., if status changes from processing → completed).
        $already_synced = $order->get_meta( '_wcss_square_synced' );
        if ( 'yes' === $already_synced ) {
            return;
        }

        $adjustments_made = false;

        foreach ( $order->get_items() as $item ) {
            /** @var WC_Order_Item_Product $item */
            $product = $item->get_product();
            if ( ! $product ) {
                continue;
            }

            $sku      = $product->get_sku();
            $quantity = $item->get_quantity();

            if ( ! $sku || $quantity < 1 ) {
                continue;
            }

            // Determine the vendor who owns this product.
            // Dokan stores vendor ID as the product's post_author.
            $product_id = $product->get_parent_id() ? $product->get_parent_id() : $product->get_id();
            $vendor_id  = (int) get_post_field( 'post_author', $product_id );

            if ( ! $vendor_id || ! $this->vendor_config->has_vendor( $vendor_id ) ) {
                continue; // Vendor not configured for Square sync.
            }

            $config = $this->vendor_config->get_vendor( $vendor_id );

            try {
                $provider = WCSS_Platform_Factory::create( $config );
                $success  = $provider->adjust_inventory( $sku, $quantity );

                if ( $success ) {
                    $adjustments_made = true;
                    WCSS_Logger::info(
                        sprintf(
                            'Order #%d: pushed -%d for SKU "%s" to Square (vendor %d).',
                            $order_id,
                            $quantity,
                            $sku,
                            $vendor_id
                        )
                    );
                }
            } catch ( Exception $e ) {
                WCSS_Logger::error(
                    sprintf(
                        'Order #%d: failed to adjust Square inventory for SKU "%s" (vendor %d): %s',
                        $order_id,
                        $sku,
                        $vendor_id,
                        $e->getMessage()
                    )
                );
            }
        }

        // Mark order as synced to prevent double-processing.
        if ( $adjustments_made ) {
            $order->update_meta_data( '_wcss_square_synced', 'yes' );
            $order->save();
        }
    }
}
