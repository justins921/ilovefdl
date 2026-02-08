<?php
/**
 * Sync Scheduler
 *
 * Registers a WordPress cron event that fires every hour.
 * On each run it loops through all configured vendors, checks whether enough time
 * has elapsed since the last sync for that vendor (based on their sync_interval),
 * and if so pulls inventory from Square and updates WooCommerce stock accordingly.
 *
 * Square is always treated as the source of truth during these periodic syncs.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WCSS_Sync_Scheduler {

    /** @var string WordPress cron hook name. */
    const CRON_HOOK = 'wcss_hourly_inventory_sync';

    /** @var string Option prefix for storing last-sync timestamps per vendor. */
    const LAST_SYNC_OPTION_PREFIX = 'wcss_last_sync_';

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
        // Register our custom cron schedule (hourly already exists in WP, but be explicit).
        add_filter( 'cron_schedules', array( $this, 'add_cron_schedule' ) );

        // Hook the sync action.
        add_action( self::CRON_HOOK, array( $this, 'run_sync' ) );

        // Schedule the cron event if it isn't already.
        if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
            wp_schedule_event( time(), 'hourly', self::CRON_HOOK );
        }
    }

    /**
     * Add a custom cron schedule in case "hourly" is ever removed.
     *
     * @param array $schedules
     * @return array
     */
    public function add_cron_schedule( $schedules ) {
        if ( ! isset( $schedules['wcss_hourly'] ) ) {
            $schedules['wcss_hourly'] = array(
                'interval' => HOUR_IN_SECONDS,
                'display'  => 'WC Square Sync — Hourly',
            );
        }
        return $schedules;
    }

    /**
     * Main cron callback: loop through vendors and sync those that are due.
     */
    public function run_sync() {
        $vendors = $this->vendor_config->get_all_vendors();

        if ( empty( $vendors ) ) {
            WCSS_Logger::info( 'Sync scheduler ran — no vendors configured.' );
            return;
        }

        WCSS_Logger::info( sprintf( 'Sync scheduler started — %d vendor(s) to evaluate.', count( $vendors ) ) );

        foreach ( $vendors as $vendor_id => $config ) {
            $this->maybe_sync_vendor( $vendor_id, $config );
        }

        WCSS_Logger::info( 'Sync scheduler finished.' );
    }

    /**
     * Sync a single vendor if enough time has elapsed since the last sync.
     *
     * @param int   $vendor_id
     * @param array $config
     */
    private function maybe_sync_vendor( $vendor_id, array $config ) {
        $last_sync     = (int) get_option( self::LAST_SYNC_OPTION_PREFIX . $vendor_id, 0 );
        $sync_interval = (int) $config['sync_interval'];
        $now           = time();

        if ( ( $now - $last_sync ) < $sync_interval ) {
            WCSS_Logger::info(
                sprintf(
                    'Vendor %d (%s): skipped — last synced %d minutes ago, interval is %d minutes.',
                    $vendor_id,
                    $config['label'],
                    round( ( $now - $last_sync ) / 60 ),
                    round( $sync_interval / 60 )
                )
            );
            return;
        }

        WCSS_Logger::info( sprintf( 'Vendor %d (%s): starting sync.', $vendor_id, $config['label'] ) );

        try {
            $this->sync_vendor_inventory( $vendor_id, $config );
            update_option( self::LAST_SYNC_OPTION_PREFIX . $vendor_id, $now, false );
        } catch ( Exception $e ) {
            WCSS_Logger::error(
                sprintf( 'Vendor %d (%s): sync failed — %s', $vendor_id, $config['label'], $e->getMessage() )
            );
        }
    }

    /**
     * Pull inventory from Square and update WooCommerce stock for all vendor products.
     *
     * @param int   $vendor_id
     * @param array $config
     */
    private function sync_vendor_inventory( $vendor_id, array $config ) {
        // Get all products for this Dokan vendor that have SKUs.
        $product_ids = $this->get_vendor_product_ids( $vendor_id );

        if ( empty( $product_ids ) ) {
            WCSS_Logger::info( sprintf( 'Vendor %d: no products found.', $vendor_id ) );
            return;
        }

        // Build a map of SKU => WC product for quick lookup.
        $sku_product_map = array();
        foreach ( $product_ids as $product_id ) {
            $product = wc_get_product( $product_id );
            if ( ! $product ) {
                continue;
            }

            // Handle simple products.
            if ( $product->is_type( 'simple' ) ) {
                $sku = $product->get_sku();
                if ( $sku ) {
                    $sku_product_map[ $sku ] = $product;
                }
            }

            // Handle variable products: each variation has its own SKU.
            if ( $product->is_type( 'variable' ) ) {
                $variations = $product->get_children();
                foreach ( $variations as $variation_id ) {
                    $variation = wc_get_product( $variation_id );
                    if ( $variation && $variation->get_sku() ) {
                        $sku_product_map[ $variation->get_sku() ] = $variation;
                    }
                }
            }
        }

        if ( empty( $sku_product_map ) ) {
            WCSS_Logger::info( sprintf( 'Vendor %d: products found but none have SKUs.', $vendor_id ) );
            return;
        }

        // Fetch inventory from Square.
        $provider        = WCSS_Platform_Factory::create( $config );
        $square_inventory = $provider->get_inventory_counts( array_keys( $sku_product_map ) );

        $updated = 0;
        $skipped = 0;

        foreach ( $sku_product_map as $sku => $product ) {
            if ( ! isset( $square_inventory[ $sku ] ) ) {
                WCSS_Logger::warning(
                    sprintf( 'Vendor %d: SKU "%s" not found in Square — skipped.', $vendor_id, $sku )
                );
                $skipped++;
                continue;
            }

            $square_qty = $square_inventory[ $sku ];
            $wc_qty     = (int) $product->get_stock_quantity();

            if ( $square_qty === $wc_qty ) {
                continue; // Already in sync.
            }

            // Update WooCommerce stock to match Square (source of truth).
            $product->set_manage_stock( true );
            $product->set_stock_quantity( $square_qty );
            $product->set_stock_status( $square_qty > 0 ? 'instock' : 'outofstock' );
            $product->save();

            WCSS_Logger::info(
                sprintf(
                    'Vendor %d: SKU "%s" stock updated %d → %d (from Square).',
                    $vendor_id,
                    $sku,
                    $wc_qty,
                    $square_qty
                )
            );
            $updated++;
        }

        WCSS_Logger::info(
            sprintf(
                'Vendor %d (%s): sync complete — %d updated, %d skipped, %d already in sync.',
                $vendor_id,
                $config['label'],
                $updated,
                $skipped,
                count( $sku_product_map ) - $updated - $skipped
            )
        );
    }

    /**
     * Get all WooCommerce product IDs belonging to a Dokan vendor.
     *
     * Dokan stores the vendor (author) as the post_author on the product post.
     *
     * @param int $vendor_id
     * @return int[]
     */
    private function get_vendor_product_ids( $vendor_id ) {
        $args = array(
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'author'         => $vendor_id,
            'posts_per_page' => -1,
            'fields'         => 'ids',
        );

        $query = new WP_Query( $args );
        return $query->posts;
    }

    /**
     * Unschedule the cron event (called on plugin deactivation).
     */
    public static function unschedule() {
        $timestamp = wp_next_scheduled( self::CRON_HOOK );
        if ( $timestamp ) {
            wp_unschedule_event( $timestamp, self::CRON_HOOK );
        }
    }
}
