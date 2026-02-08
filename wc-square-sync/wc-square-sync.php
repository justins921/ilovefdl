<?php
/**
 * Plugin Name:       WC Square Inventory Sync
 * Plugin URI:        https://github.com/justins921/Loveyoulocal
 * Description:       Syncs WooCommerce product inventory with Square for Dokan multi-vendor marketplaces. Square is the source of truth — periodic cron pulls inventory from Square, and WooCommerce pushes decrements to Square on purchase.
 * Version:           1.0.0
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
define( 'WCSS_VERSION', '1.0.0' );
define( 'WCSS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WCSS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Verify that WooCommerce is active before initializing.
 */
function wcss_check_dependencies() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', function () {
            echo '<div class="notice notice-error"><p>';
            echo '<strong>WC Square Inventory Sync</strong> requires WooCommerce to be installed and active.';
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
        'class-sync-scheduler.php',
        'class-purchase-handler.php',
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

    // Start the cron-based periodic sync (Square → WooCommerce).
    $scheduler = new WCSS_Sync_Scheduler( $vendor_config );
    $scheduler->init();

    // Start the purchase hook (WooCommerce → Square).
    $purchase_handler = new WCSS_Purchase_Handler( $vendor_config );
    $purchase_handler->init();

    WCSS_Logger::info( 'WC Square Sync plugin initialized.' );
}
add_action( 'plugins_loaded', 'wcss_init' );

/**
 * Clean up on plugin deactivation.
 */
register_deactivation_hook( __FILE__, function () {
    // Need to load the scheduler class to call unschedule.
    require_once plugin_dir_path( __FILE__ ) . 'includes/class-sync-scheduler.php';
    WCSS_Sync_Scheduler::unschedule();
} );

/**
 * WP-CLI command for manually triggering a sync (useful for testing).
 *
 * Usage: wp wcss sync [--vendor=<id>]
 */
if ( defined( 'WP_CLI' ) && WP_CLI ) {
    WP_CLI::add_command( 'wcss sync', function ( $args, $assoc_args ) {
        wcss_load_classes();

        $vendor_config = new WCSS_Vendor_Config();
        $vendors       = $vendor_config->get_all_vendors();

        if ( empty( $vendors ) ) {
            WP_CLI::warning( 'No vendors configured in vendor-config.php.' );
            return;
        }

        // If a specific vendor was requested, filter to just that one.
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
}
