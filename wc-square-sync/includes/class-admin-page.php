<?php
/**
 * Admin Page
 *
 * Adds a "WC Inventory Sync" page under the WooCommerce menu in wp-admin.
 * Provides UI for:
 *   - Viewing configured vendors and their sync status
 *   - Testing API connections
 *   - Triggering manual inventory syncs
 *   - Importing products from Square/Shopify
 *   - Viewing recent log entries
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WCSS_Admin_Page {

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
        add_action( 'admin_menu', array( $this, 'add_menu_page' ) );
        add_action( 'admin_post_wcss_test_connection', array( $this, 'handle_test_connection' ) );
        add_action( 'admin_post_wcss_run_sync', array( $this, 'handle_run_sync' ) );
        add_action( 'admin_post_wcss_run_import', array( $this, 'handle_run_import' ) );
    }

    /**
     * Add submenu page under WooCommerce.
     */
    public function add_menu_page() {
        add_submenu_page(
            'woocommerce',
            'Inventory Sync',
            'Inventory Sync',
            'manage_woocommerce',
            'wc-inventory-sync',
            array( $this, 'render_page' )
        );
    }

    /**
     * Render the admin page.
     */
    public function render_page() {
        $vendors = $this->vendor_config->get_all_vendors();
        $message = isset( $_GET['wcss_message'] ) ? sanitize_text_field( wp_unslash( $_GET['wcss_message'] ) ) : '';
        $msg_type = isset( $_GET['wcss_type'] ) ? sanitize_text_field( wp_unslash( $_GET['wcss_type'] ) ) : 'info';
        ?>
        <div class="wrap">
            <h1>WC Inventory Sync</h1>

            <?php if ( $message ) : ?>
                <div class="notice notice-<?php echo esc_attr( $msg_type ); ?> is-dismissible">
                    <p><?php echo wp_kses_post( $message ); ?></p>
                </div>
            <?php endif; ?>

            <?php if ( empty( $vendors ) ) : ?>
                <div class="notice notice-warning">
                    <p>
                        <strong>No vendors configured.</strong>
                        Edit <code>vendor-config.php</code> in the plugin folder to add vendors.
                        See the <a href="#setup-help">setup instructions</a> below.
                    </p>
                </div>
            <?php endif; ?>

            <!-- Vendor Status Table -->
            <h2>Configured Vendors</h2>
            <?php if ( ! empty( $vendors ) ) : ?>
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th>Vendor ID</th>
                            <th>Label</th>
                            <th>Platform</th>
                            <th>Sync Interval</th>
                            <th>Last Sync</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ( $vendors as $vendor_id => $config ) :
                            $last_sync = (int) get_option( 'wcss_last_sync_' . $vendor_id, 0 );
                            $last_sync_display = $last_sync
                                ? human_time_diff( $last_sync ) . ' ago'
                                : 'Never';
                            $interval_display = $this->format_interval( $config['sync_interval'] );
                        ?>
                            <tr>
                                <td><strong><?php echo esc_html( $vendor_id ); ?></strong></td>
                                <td><?php echo esc_html( $config['label'] ?: '(no label)' ); ?></td>
                                <td>
                                    <span class="dashicons dashicons-<?php echo $config['platform'] === 'shopify' ? 'cart' : 'store'; ?>"></span>
                                    <?php echo esc_html( ucfirst( $config['platform'] ) ); ?>
                                </td>
                                <td><?php echo esc_html( $interval_display ); ?></td>
                                <td><?php echo esc_html( $last_sync_display ); ?></td>
                                <td>
                                    <!-- Test Connection -->
                                    <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                                        <?php wp_nonce_field( 'wcss_test_connection_' . $vendor_id ); ?>
                                        <input type="hidden" name="action" value="wcss_test_connection">
                                        <input type="hidden" name="vendor_id" value="<?php echo esc_attr( $vendor_id ); ?>">
                                        <button type="submit" class="button button-small">Test Connection</button>
                                    </form>

                                    <!-- Sync Now -->
                                    <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                                        <?php wp_nonce_field( 'wcss_run_sync_' . $vendor_id ); ?>
                                        <input type="hidden" name="action" value="wcss_run_sync">
                                        <input type="hidden" name="vendor_id" value="<?php echo esc_attr( $vendor_id ); ?>">
                                        <button type="submit" class="button button-small button-primary">Sync Now</button>
                                    </form>

                                    <!-- Import Products -->
                                    <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                                        <?php wp_nonce_field( 'wcss_run_import_' . $vendor_id ); ?>
                                        <input type="hidden" name="action" value="wcss_run_import">
                                        <input type="hidden" name="vendor_id" value="<?php echo esc_attr( $vendor_id ); ?>">
                                        <button type="submit" class="button button-small" onclick="return confirm('This will import products from <?php echo esc_js( ucfirst( $config['platform'] ) ); ?> into WooCommerce for this vendor. Continue?');">Import Products</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else : ?>
                <p><em>No vendors are configured yet.</em></p>
            <?php endif; ?>

            <!-- Recent Logs -->
            <h2 style="margin-top: 2em;">Recent Logs</h2>
            <?php $this->render_recent_logs(); ?>

            <!-- Setup Help -->
            <div id="setup-help" style="margin-top: 2em; background: #fff; border: 1px solid #ccd0d4; padding: 16px 24px; max-width: 800px;">
                <h2>Setup Instructions</h2>

                <h3>1. Edit vendor-config.php</h3>
                <p>The vendor configuration file is located at:</p>
                <code style="display:block; background:#f0f0f0; padding:8px 12px; margin:8px 0;">
                    <?php echo esc_html( WCSS_PLUGIN_DIR . 'vendor-config.php' ); ?>
                </code>

                <p>If you don't have file access, you can use the <strong>WordPress Plugin Editor</strong>:
                go to <strong>Plugins → Plugin File Editor</strong>, select <strong>WC Inventory Sync</strong>
                from the dropdown, then click on <code>vendor-config.php</code>.</p>

                <h3>2. Add a Square vendor</h3>
                <pre style="background:#f0f0f0; padding:12px; overflow-x:auto;">
42 => array(
    'platform'             => 'square',
    'label'                => 'Brothers Antiques',
    'square_access_token'  => 'PASTE_TOKEN_HERE',
    'square_location_id'   => 'PASTE_LOCATION_ID_HERE',
    'sync_interval'        => 3600,
    'enabled'              => true,
),</pre>

                <h3>3. Add a Shopify vendor</h3>
                <pre style="background:#f0f0f0; padding:12px; overflow-x:auto;">
87 => array(
    'platform'              => 'shopify',
    'label'                 => 'My Shopify Store',
    'shopify_shop_domain'   => 'mystore.myshopify.com',
    'shopify_access_token'  => 'shpat_PASTE_TOKEN_HERE',
    'shopify_location_id'   => '12345678901',
    'sync_interval'         => 21600,
    'enabled'               => true,
),</pre>

                <h3>4. Find the Dokan Vendor ID</h3>
                <p>Go to <a href="<?php echo esc_url( admin_url( 'admin.php?page=dokan#/vendors' ) ); ?>">Dokan → Vendors</a>.
                Hover over a vendor name — the number in the URL (<code>user_id=XX</code>) is the vendor ID.</p>

                <h3>5. Important: SKUs must match</h3>
                <p>Products are linked between WooCommerce and Square/Shopify by <strong>SKU</strong>.
                Each product in WooCommerce must have a SKU that exactly matches the SKU on the external platform.
                If you're importing products, the importer will set SKUs automatically.</p>
            </div>
        </div>
        <?php
    }

    /**
     * Handle the "Test Connection" form submission.
     */
    public function handle_test_connection() {
        $vendor_id = isset( $_POST['vendor_id'] ) ? (int) $_POST['vendor_id'] : 0;
        check_admin_referer( 'wcss_test_connection_' . $vendor_id );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( 'Unauthorized.' );
        }

        $config = $this->vendor_config->get_vendor( $vendor_id );
        if ( ! $config ) {
            $this->redirect_with_message( 'Vendor not found or not enabled.', 'error' );
            return;
        }

        try {
            $provider = WCSS_Platform_Factory::create( $config );
            // Test by fetching inventory for a dummy SKU — we just care if the API responds.
            $result = $provider->get_inventory_counts( array( '__connection_test__' ) );

            // If we got here without an exception, the connection works.
            $this->redirect_with_message(
                sprintf(
                    'Vendor %d (%s): <strong>Connection successful!</strong> %s API responded correctly.',
                    $vendor_id,
                    esc_html( $config['label'] ),
                    ucfirst( $config['platform'] )
                ),
                'success'
            );
        } catch ( Exception $e ) {
            $this->redirect_with_message(
                sprintf(
                    'Vendor %d (%s): <strong>Connection failed.</strong> %s',
                    $vendor_id,
                    esc_html( $config['label'] ),
                    esc_html( $e->getMessage() )
                ),
                'error'
            );
        }
    }

    /**
     * Handle the "Sync Now" form submission.
     */
    public function handle_run_sync() {
        $vendor_id = isset( $_POST['vendor_id'] ) ? (int) $_POST['vendor_id'] : 0;
        check_admin_referer( 'wcss_run_sync_' . $vendor_id );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( 'Unauthorized.' );
        }

        $config = $this->vendor_config->get_vendor( $vendor_id );
        if ( ! $config ) {
            $this->redirect_with_message( 'Vendor not found or not enabled.', 'error' );
            return;
        }

        // Run the sync (reuse the scheduler logic).
        $scheduler = new WCSS_Sync_Scheduler( $this->vendor_config );
        $scheduler->run_sync();

        // Update last sync time.
        update_option( 'wcss_last_sync_' . $vendor_id, time(), false );

        $this->redirect_with_message(
            sprintf(
                'Vendor %d (%s): <strong>Sync completed.</strong> Check the logs below for details.',
                $vendor_id,
                esc_html( $config['label'] )
            ),
            'success'
        );
    }

    /**
     * Handle the "Import Products" form submission.
     */
    public function handle_run_import() {
        $vendor_id = isset( $_POST['vendor_id'] ) ? (int) $_POST['vendor_id'] : 0;
        check_admin_referer( 'wcss_run_import_' . $vendor_id );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( 'Unauthorized.' );
        }

        $config = $this->vendor_config->get_vendor( $vendor_id );
        if ( ! $config ) {
            $this->redirect_with_message( 'Vendor not found or not enabled.', 'error' );
            return;
        }

        $importer = new WCSS_Product_Importer( $this->vendor_config );
        $summary  = $importer->import( $vendor_id, false );

        $this->redirect_with_message(
            sprintf(
                'Vendor %d (%s): <strong>Import completed.</strong> Created: %d, Updated: %d, Skipped: %d, Errors: %d',
                $vendor_id,
                esc_html( $config['label'] ),
                $summary['created'],
                $summary['updated'],
                $summary['skipped'],
                $summary['errors']
            ),
            $summary['errors'] > 0 ? 'warning' : 'success'
        );
    }

    /**
     * Render recent log entries.
     */
    private function render_recent_logs() {
        $upload_dir = wp_upload_dir();
        $log_dir    = $upload_dir['basedir'] . '/wc-square-sync-logs';
        $today_log  = $log_dir . '/' . current_time( 'Y-m-d' ) . '.log';

        if ( ! file_exists( $today_log ) ) {
            echo '<p><em>No logs for today yet. Logs will appear here after the first sync or connection test.</em></p>';
            return;
        }

        // Read the last 50 lines.
        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_get_contents
        $contents = file_get_contents( $today_log );
        $lines    = explode( "\n", trim( $contents ) );
        $lines    = array_slice( $lines, -50 );

        echo '<div style="background:#1d2327; color:#f0f0f0; padding:12px 16px; max-height:400px; overflow-y:auto; font-family:monospace; font-size:12px; line-height:1.6; white-space:pre-wrap;">';
        foreach ( $lines as $line ) {
            $line = esc_html( $line );
            // Color-code log levels.
            $line = str_replace( '[ERROR]', '<span style="color:#dc3232;font-weight:bold;">[ERROR]</span>', $line );
            $line = str_replace( '[WARNING]', '<span style="color:#ffb900;font-weight:bold;">[WARNING]</span>', $line );
            $line = str_replace( '[INFO]', '<span style="color:#46b450;">[INFO]</span>', $line );
            echo $line . "\n";
        }
        echo '</div>';
    }

    /**
     * Redirect back to the admin page with a message.
     *
     * @param string $message
     * @param string $type 'success', 'error', 'warning', 'info'
     */
    private function redirect_with_message( $message, $type = 'info' ) {
        wp_safe_redirect(
            add_query_arg(
                array(
                    'page'         => 'wc-inventory-sync',
                    'wcss_message' => urlencode( $message ),
                    'wcss_type'    => $type,
                ),
                admin_url( 'admin.php' )
            )
        );
        exit;
    }

    /**
     * Format a sync interval in seconds to a human-readable string.
     *
     * @param int $seconds
     * @return string
     */
    private function format_interval( $seconds ) {
        if ( $seconds < 3600 ) {
            return round( $seconds / 60 ) . ' minutes';
        }
        $hours = $seconds / 3600;
        return $hours == 1 ? '1 hour' : $hours . ' hours';
    }
}
