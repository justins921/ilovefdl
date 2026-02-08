<?php
/**
 * Plugin Name:       WC Inventory Sync
 * Plugin URI:        https://github.com/justins921/Loveyoulocal
 * Description:       Syncs WooCommerce product inventory with Square and Shopify for Dokan multi-vendor marketplaces. External platforms are the source of truth — periodic cron pulls inventory, WooCommerce pushes decrements on purchase. Also supports importing products from Square/Shopify into WooCommerce.
 * Version:           2.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Loveyoulocal
 * License:           GPL-2.0-or-later
 * Text Domain:       wc-square-sync
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Plugin constants.
define( 'WCSS_VERSION', '2.0.0' );
define( 'WCSS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WCSS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Verify that WooCommerce is active before initializing.
 */
function wcss_check_dependencies() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', function () {
            echo '<div class="notice notice-error"><p>';
            echo '<strong>WC Inventory Sync</strong> requires WooCommerce to be installed and active.';
            echo '</p></div>';
        } );
        return false;
    }
    return true;
}

/**
 * Load all plugin class files.
 */
function wcss_load_classes() {
    $includes = array(
        'class-logger.php',
        'class-vendor-config.php',
        'class-platform-factory.php',
        'class-square-provider.php',
        'class-shopify-provider.php',
        'class-sync-scheduler.php',
        'class-purchase-handler.php',
        'class-product-importer.php',
    );

    foreach ( $includes as $file ) {
        require_once WCSS_PLUGIN_DIR . 'includes/' . $file;
    }
}

/**
 * Initialize the plugin after all plugins have loaded.
 */
function wcss_init() {
    if ( ! wcss_check_dependencies() ) {
        return;
    }

    wcss_load_classes();

    $vendor_config = new WCSS_Vendor_Config();

    // Start the cron-based periodic sync (Platform → WooCommerce).
    $scheduler = new WCSS_Sync_Scheduler( $vendor_config );
    $scheduler->init();

    // Start the purchase hook (WooCommerce → Platform).
    $purchase_handler = new WCSS_Purchase_Handler( $vendor_config );
    $purchase_handler->init();

    WCSS_Logger::info( 'WC Inventory Sync plugin initialized.' );
}
add_action( 'plugins_loaded', 'wcss_init' );

/**
 * Clean up on plugin deactivation.
 */
register_deactivation_hook( __FILE__, function () {
    require_once plugin_dir_path( __FILE__ ) . 'includes/class-sync-scheduler.php';
    WCSS_Sync_Scheduler::unschedule();
} );

/**
 * WP-CLI commands for manual operations.
 *
 * Available commands:
 *   wp wcss sync    [--vendor=<id>]                  - Trigger inventory sync
 *   wp wcss import  --vendor=<id> [--dry-run]        - Import products from platform into WooCommerce
 */
if ( defined( 'WP_CLI' ) && WP_CLI ) {

    /**
     * Trigger an inventory sync for all vendors or a specific vendor.
     *
     * ## OPTIONS
     *
     * [--vendor=<id>]
     * : Sync only this vendor ID.
     *
     * ## EXAMPLES
     *
     *     wp wcss sync
     *     wp wcss sync --vendor=42
     */
    WP_CLI::add_command( 'wcss sync', function ( $args, $assoc_args ) {
        wcss_load_classes();

        $vendor_config = new WCSS_Vendor_Config();
        $vendors       = $vendor_config->get_all_vendors();

        if ( empty( $vendors ) ) {
            WP_CLI::warning( 'No vendors configured in vendor-config.php.' );
            return;
        }

        if ( isset( $assoc_args['vendor'] ) ) {
            $id = (int) $assoc_args['vendor'];
            if ( ! $vendor_config->has_vendor( $id ) ) {
                WP_CLI::error( sprintf( 'Vendor %d is not configured or not enabled.', $id ) );
                return;
            }
            $vendors = array( $id => $vendor_config->get_vendor( $id ) );
        }

        WP_CLI::log( sprintf( 'Running sync for %d vendor(s)...', count( $vendors ) ) );

        $scheduler = new WCSS_Sync_Scheduler( $vendor_config );
        $scheduler->run_sync();

        WP_CLI::success( 'Sync complete. Check logs for details.' );
    } );

    /**
     * Import products from a vendor's external platform into WooCommerce.
     *
     * ## OPTIONS
     *
     * --vendor=<id>
     * : The Dokan vendor ID to import products for.
     *
     * [--dry-run]
     * : Preview what would be imported without making changes.
     *
     * ## EXAMPLES
     *
     *     wp wcss import --vendor=42
     *     wp wcss import --vendor=42 --dry-run
     */
    WP_CLI::add_command( 'wcss import', function ( $args, $assoc_args ) {
        wcss_load_classes();

        if ( ! isset( $assoc_args['vendor'] ) ) {
            WP_CLI::error( 'The --vendor=<id> parameter is required.' );
            return;
        }

        $vendor_id = (int) $assoc_args['vendor'];
        $dry_run   = isset( $assoc_args['dry-run'] );

        $vendor_config = new WCSS_Vendor_Config();

        if ( ! $vendor_config->has_vendor( $vendor_id ) ) {
            WP_CLI::error( sprintf( 'Vendor %d is not configured or not enabled.', $vendor_id ) );
            return;
        }

        $config = $vendor_config->get_vendor( $vendor_id );
        WP_CLI::log(
            sprintf(
                '%s products from %s for vendor %d (%s)...',
                $dry_run ? 'Previewing import of' : 'Importing',
                $config['platform'],
                $vendor_id,
                $config['label']
            )
        );

        $importer = new WCSS_Product_Importer( $vendor_config );
        $summary  = $importer->import( $vendor_id, $dry_run );

        WP_CLI::log( '' );
        WP_CLI::log( 'Results:' );
        WP_CLI::log( sprintf( '  Created: %d', $summary['created'] ) );
        WP_CLI::log( sprintf( '  Updated: %d', $summary['updated'] ) );
        WP_CLI::log( sprintf( '  Skipped: %d', $summary['skipped'] ) );
        WP_CLI::log( sprintf( '  Errors:  %d', $summary['errors'] ) );

        if ( $dry_run ) {
            WP_CLI::success( 'Dry run complete — no changes were made.' );
        } elseif ( $summary['errors'] > 0 ) {
            WP_CLI::warning( 'Import finished with errors. Check logs for details.' );
        } else {
            WP_CLI::success( 'Import complete.' );
        }
    } );
}
