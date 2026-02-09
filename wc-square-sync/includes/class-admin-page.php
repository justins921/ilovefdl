<?php
/**
 * Admin Page
 *
 * Adds a "WC Inventory Sync" page under the WooCommerce menu in wp-admin.
 * Provides a full UI for:
 *   - Adding / editing / removing vendor sync configurations
 *   - Selecting Dokan vendors from a dropdown (no need to find IDs)
 *   - Testing API connections
 *   - Triggering manual inventory syncs
 *   - Importing products from Square/Shopify/Etsy
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
        add_action( 'admin_post_wcss_save_vendor', array( $this, 'handle_save_vendor' ) );
        add_action( 'admin_post_wcss_delete_vendor', array( $this, 'handle_delete_vendor' ) );
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
        $vendors  = $this->vendor_config->get_all_vendors_raw();
        $message  = isset( $_GET['wcss_message'] ) ? sanitize_text_field( wp_unslash( $_GET['wcss_message'] ) ) : '';
        $msg_type = isset( $_GET['wcss_type'] ) ? sanitize_text_field( wp_unslash( $_GET['wcss_type'] ) ) : 'info';
        $tab      = isset( $_GET['tab'] ) ? sanitize_text_field( wp_unslash( $_GET['tab'] ) ) : 'dashboard';
        ?>
        <div class="wrap">
            <h1>WC Inventory Sync</h1>

            <?php if ( $message ) : ?>
                <div class="notice notice-<?php echo esc_attr( $msg_type ); ?> is-dismissible">
                    <p><?php echo wp_kses_post( $message ); ?></p>
                </div>
            <?php endif; ?>

            <!-- Tabs -->
            <nav class="nav-tab-wrapper">
                <a href="<?php echo esc_url( $this->page_url( array( 'tab' => 'dashboard' ) ) ); ?>"
                   class="nav-tab <?php echo 'dashboard' === $tab ? 'nav-tab-active' : ''; ?>">Dashboard</a>
                <a href="<?php echo esc_url( $this->page_url( array( 'tab' => 'add-vendor' ) ) ); ?>"
                   class="nav-tab <?php echo 'add-vendor' === $tab ? 'nav-tab-active' : ''; ?>">Add Vendor</a>
                <?php if ( 'edit-vendor' === $tab ) : ?>
                    <a href="#" class="nav-tab nav-tab-active">Edit Vendor</a>
                <?php endif; ?>
                <a href="<?php echo esc_url( $this->page_url( array( 'tab' => 'logs' ) ) ); ?>"
                   class="nav-tab <?php echo 'logs' === $tab ? 'nav-tab-active' : ''; ?>">Logs</a>
            </nav>

            <div style="margin-top: 16px;">
                <?php
                switch ( $tab ) {
                    case 'add-vendor':
                        $this->render_vendor_form();
                        break;
                    case 'edit-vendor':
                        $edit_id = isset( $_GET['vendor_id'] ) ? (int) $_GET['vendor_id'] : 0;
                        $this->render_vendor_form( $edit_id );
                        break;
                    case 'logs':
                        $this->render_logs_tab();
                        break;
                    default:
                        $this->render_dashboard( $vendors );
                        break;
                }
                ?>
            </div>
        </div>
        <?php
    }

    // ------------------------------------------------------------------
    //  Dashboard Tab
    // ------------------------------------------------------------------

    /**
     * Render the main dashboard with vendor list.
     *
     * @param array $vendors
     */
    private function render_dashboard( array $vendors ) {
        if ( empty( $vendors ) ) {
            ?>
            <div class="notice notice-info" style="margin: 0;">
                <p>
                    No vendors configured yet.
                    <a href="<?php echo esc_url( $this->page_url( array( 'tab' => 'add-vendor' ) ) ); ?>"
                       class="button button-primary" style="margin-left: 8px;">Add Your First Vendor</a>
                </p>
            </div>
            <?php
            return;
        }
        ?>
        <table class="widefat striped" style="max-width: 1200px;">
            <thead>
                <tr>
                    <th>Vendor</th>
                    <th>Platform</th>
                    <th>Sync Interval</th>
                    <th>Last Sync</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ( $vendors as $vendor_id => $config ) :
                    $last_sync = (int) get_option( 'wcss_last_sync_' . $vendor_id, 0 );
                    $last_sync_display = $last_sync ? human_time_diff( $last_sync ) . ' ago' : 'Never';
                    $interval_display  = $this->format_interval( $config['sync_interval'] );
                    $vendor_name       = $this->get_dokan_vendor_name( $vendor_id );
                    $display_name      = $config['label'] ?: $vendor_name;
                    $is_enabled        = ! empty( $config['enabled'] );
                ?>
                    <tr>
                        <td>
                            <strong><?php echo esc_html( $display_name ); ?></strong>
                            <br><small style="color:#666;">ID: <?php echo esc_html( $vendor_id ); ?></small>
                        </td>
                        <td>
                            <?php
                            $platform_icon = 'store';
                            if ( 'shopify' === $config['platform'] ) {
                                $platform_icon = 'cart';
                            } elseif ( 'etsy' === $config['platform'] ) {
                                $platform_icon = 'tag';
                            }
                            ?>
                            <span class="dashicons dashicons-<?php echo esc_attr( $platform_icon ); ?>"
                                  style="vertical-align: middle;"></span>
                            <?php echo esc_html( ucfirst( $config['platform'] ) ); ?>
                        </td>
                        <td><?php echo esc_html( $interval_display ); ?></td>
                        <td><?php echo esc_html( $last_sync_display ); ?></td>
                        <td>
                            <?php if ( $is_enabled ) : ?>
                                <span style="color:#46b450;">&#9679;</span> Active
                            <?php else : ?>
                                <span style="color:#999;">&#9679;</span> Disabled
                            <?php endif; ?>
                        </td>
                        <td>
                            <!-- Edit -->
                            <a href="<?php echo esc_url( $this->page_url( array( 'tab' => 'edit-vendor', 'vendor_id' => $vendor_id ) ) ); ?>"
                               class="button button-small">Edit</a>

                            <?php if ( $is_enabled ) : ?>
                                <!-- Test Connection -->
                                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                                    <?php wp_nonce_field( 'wcss_test_connection_' . $vendor_id ); ?>
                                    <input type="hidden" name="action" value="wcss_test_connection">
                                    <input type="hidden" name="vendor_id" value="<?php echo esc_attr( $vendor_id ); ?>">
                                    <button type="submit" class="button button-small">Test</button>
                                </form>

                                <!-- Sync Now -->
                                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                                    <?php wp_nonce_field( 'wcss_run_sync_' . $vendor_id ); ?>
                                    <input type="hidden" name="action" value="wcss_run_sync">
                                    <input type="hidden" name="vendor_id" value="<?php echo esc_attr( $vendor_id ); ?>">
                                    <button type="submit" class="button button-small button-primary">Sync</button>
                                </form>

                                <!-- Import -->
                                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                                    <?php wp_nonce_field( 'wcss_run_import_' . $vendor_id ); ?>
                                    <input type="hidden" name="action" value="wcss_run_import">
                                    <input type="hidden" name="vendor_id" value="<?php echo esc_attr( $vendor_id ); ?>">
                                    <button type="submit" class="button button-small"
                                            onclick="return confirm('Import all products from <?php echo esc_js( ucfirst( $config['platform'] ) ); ?>?');">Import</button>
                                </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <p style="margin-top: 16px;">
            <a href="<?php echo esc_url( $this->page_url( array( 'tab' => 'add-vendor' ) ) ); ?>"
               class="button button-primary">Add New Vendor</a>
        </p>
        <?php
    }

    // ------------------------------------------------------------------
    //  Add / Edit Vendor Form
    // ------------------------------------------------------------------

    /**
     * Render the add/edit vendor form.
     *
     * @param int $edit_vendor_id Vendor ID to edit, or 0 for new vendor.
     */
    private function render_vendor_form( $edit_vendor_id = 0 ) {
        $is_edit   = $edit_vendor_id > 0;
        $db_config = array();

        if ( $is_edit ) {
            $all_raw   = get_option( WCSS_Vendor_Config::DB_OPTION_KEY, array() );
            $db_config = isset( $all_raw[ $edit_vendor_id ] ) ? $all_raw[ $edit_vendor_id ] : array();
        }

        // Defaults.
        $platform     = $db_config['platform'] ?? 'square';
        $label        = $db_config['label'] ?? '';
        $sync_interval = $db_config['sync_interval'] ?? WCSS_Vendor_Config::DEFAULT_SYNC_INTERVAL;
        $enabled      = isset( $db_config['enabled'] ) ? (bool) $db_config['enabled'] : true;

        // Square fields.
        $sq_token    = $db_config['square_access_token'] ?? '';
        $sq_location = $db_config['square_location_id'] ?? '';

        // Shopify fields.
        $sh_domain   = $db_config['shopify_shop_domain'] ?? '';
        $sh_token    = $db_config['shopify_access_token'] ?? '';
        $sh_location = $db_config['shopify_location_id'] ?? '';

        // Etsy fields.
        $et_api_key = $db_config['etsy_api_key'] ?? '';
        $et_shop_id = $db_config['etsy_shop_id'] ?? '';
        $et_token   = $db_config['etsy_access_token'] ?? '';

        // Get all Dokan vendors for the dropdown.
        $dokan_vendors = $this->get_dokan_vendors();
        ?>

        <div style="max-width: 700px;">
            <h2><?php echo $is_edit ? 'Edit Vendor' : 'Add New Vendor'; ?></h2>

            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                <?php wp_nonce_field( 'wcss_save_vendor' ); ?>
                <input type="hidden" name="action" value="wcss_save_vendor">
                <?php if ( $is_edit ) : ?>
                    <input type="hidden" name="edit_vendor_id" value="<?php echo esc_attr( $edit_vendor_id ); ?>">
                <?php endif; ?>

                <table class="form-table">
                    <!-- Vendor Selection -->
                    <tr>
                        <th scope="row"><label for="wcss_vendor_id">Dokan Vendor</label></th>
                        <td>
                            <?php if ( $is_edit ) : ?>
                                <strong><?php echo esc_html( $this->get_dokan_vendor_name( $edit_vendor_id ) ); ?></strong>
                                <small style="color:#666;"> (ID: <?php echo esc_html( $edit_vendor_id ); ?>)</small>
                            <?php else : ?>
                                <select name="vendor_id" id="wcss_vendor_id" required style="min-width: 300px;">
                                    <option value="">— Select a vendor —</option>
                                    <?php
                                    $existing = array_keys( $this->vendor_config->get_all_vendors_raw() );
                                    foreach ( $dokan_vendors as $v_id => $v_name ) :
                                        $already = in_array( $v_id, $existing, true );
                                    ?>
                                        <option value="<?php echo esc_attr( $v_id ); ?>" <?php echo $already ? 'disabled' : ''; ?>>
                                            <?php echo esc_html( $v_name ); ?> (ID: <?php echo esc_html( $v_id ); ?>)
                                            <?php echo $already ? ' — already configured' : ''; ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <?php if ( empty( $dokan_vendors ) ) : ?>
                                    <p class="description" style="color:#dc3232;">
                                        No Dokan vendors found. Make sure Dokan is active and vendors are registered.
                                    </p>
                                <?php endif; ?>
                            <?php endif; ?>
                        </td>
                    </tr>

                    <!-- Label -->
                    <tr>
                        <th scope="row"><label for="wcss_label">Display Name</label></th>
                        <td>
                            <input type="text" name="label" id="wcss_label" class="regular-text"
                                   value="<?php echo esc_attr( $label ); ?>"
                                   placeholder="e.g., Brothers Antiques">
                            <p class="description">Optional. Used in logs and the dashboard.</p>
                        </td>
                    </tr>

                    <!-- Platform -->
                    <tr>
                        <th scope="row"><label for="wcss_platform">Platform</label></th>
                        <td>
                            <select name="platform" id="wcss_platform" onchange="wcssTogglePlatform(this.value)">
                                <option value="square" <?php selected( $platform, 'square' ); ?>>Square</option>
                                <option value="shopify" <?php selected( $platform, 'shopify' ); ?>>Shopify</option>
                                <option value="etsy" <?php selected( $platform, 'etsy' ); ?>>Etsy</option>
                            </select>
                        </td>
                    </tr>

                    <!-- Square Fields -->
                    <tr class="wcss-square-field">
                        <th scope="row"><label for="wcss_sq_token">Square Access Token</label></th>
                        <td>
                            <input type="password" name="square_access_token" id="wcss_sq_token" class="regular-text"
                                   value="<?php echo esc_attr( $sq_token ); ?>"
                                   autocomplete="off">
                            <button type="button" class="button button-small" onclick="wcssTogglePassword('wcss_sq_token')">Show</button>
                            <p class="description">From <a href="https://developer.squareup.com/apps" target="_blank">Square Developer Dashboard</a> → Credentials tab.</p>
                        </td>
                    </tr>
                    <tr class="wcss-square-field">
                        <th scope="row"><label for="wcss_sq_location">Square Location ID</label></th>
                        <td>
                            <input type="text" name="square_location_id" id="wcss_sq_location" class="regular-text"
                                   value="<?php echo esc_attr( $sq_location ); ?>"
                                   placeholder="e.g., LXXXXXXXXXXXX">
                            <p class="description">From Square Dashboard → Locations.</p>
                        </td>
                    </tr>

                    <!-- Shopify Fields -->
                    <tr class="wcss-shopify-field">
                        <th scope="row"><label for="wcss_sh_domain">Shopify Store Domain</label></th>
                        <td>
                            <input type="text" name="shopify_shop_domain" id="wcss_sh_domain" class="regular-text"
                                   value="<?php echo esc_attr( $sh_domain ); ?>"
                                   placeholder="e.g., mystore.myshopify.com">
                        </td>
                    </tr>
                    <tr class="wcss-shopify-field">
                        <th scope="row"><label for="wcss_sh_token">Shopify Access Token</label></th>
                        <td>
                            <input type="password" name="shopify_access_token" id="wcss_sh_token" class="regular-text"
                                   value="<?php echo esc_attr( $sh_token ); ?>"
                                   autocomplete="off">
                            <button type="button" class="button button-small" onclick="wcssTogglePassword('wcss_sh_token')">Show</button>
                            <p class="description">From Shopify Admin → Settings → Apps → Develop apps → your app.</p>
                        </td>
                    </tr>
                    <tr class="wcss-shopify-field">
                        <th scope="row"><label for="wcss_sh_location">Shopify Location ID</label></th>
                        <td>
                            <input type="text" name="shopify_location_id" id="wcss_sh_location" class="regular-text"
                                   value="<?php echo esc_attr( $sh_location ); ?>"
                                   placeholder="e.g., 12345678901">
                        </td>
                    </tr>

                    <!-- Etsy Fields -->
                    <tr class="wcss-etsy-field">
                        <th scope="row"><label for="wcss_et_api_key">Etsy API Key</label></th>
                        <td>
                            <input type="password" name="etsy_api_key" id="wcss_et_api_key" class="regular-text"
                                   value="<?php echo esc_attr( $et_api_key ); ?>"
                                   autocomplete="off">
                            <button type="button" class="button button-small" onclick="wcssTogglePassword('wcss_et_api_key')">Show</button>
                            <p class="description">From <a href="https://www.etsy.com/developers/your-apps" target="_blank">Etsy Developer Portal</a> → Your App → Keystring.</p>
                        </td>
                    </tr>
                    <tr class="wcss-etsy-field">
                        <th scope="row"><label for="wcss_et_shop_id">Etsy Shop ID</label></th>
                        <td>
                            <input type="text" name="etsy_shop_id" id="wcss_et_shop_id" class="regular-text"
                                   value="<?php echo esc_attr( $et_shop_id ); ?>"
                                   placeholder="e.g., 12345678">
                            <p class="description">
                                Numeric shop ID. Find it in your Etsy shop URL or via the
                                <a href="https://developers.etsy.com/documentation/essentials/authentication#requesting-an-oauth-token" target="_blank">Etsy API</a>.
                            </p>
                        </td>
                    </tr>
                    <tr class="wcss-etsy-field">
                        <th scope="row"><label for="wcss_et_token">Etsy Access Token</label></th>
                        <td>
                            <input type="password" name="etsy_access_token" id="wcss_et_token" class="regular-text"
                                   value="<?php echo esc_attr( $et_token ); ?>"
                                   autocomplete="off">
                            <button type="button" class="button button-small" onclick="wcssTogglePassword('wcss_et_token')">Show</button>
                            <p class="description">OAuth 2.0 access token. Required for inventory updates. See Etsy API docs for the OAuth flow.</p>
                        </td>
                    </tr>

                    <!-- Sync Interval -->
                    <tr>
                        <th scope="row"><label for="wcss_interval">Sync Frequency</label></th>
                        <td>
                            <select name="sync_interval" id="wcss_interval">
                                <option value="1800"  <?php selected( $sync_interval, 1800 ); ?>>Every 30 minutes</option>
                                <option value="3600"  <?php selected( $sync_interval, 3600 ); ?>>Every 1 hour</option>
                                <option value="7200"  <?php selected( $sync_interval, 7200 ); ?>>Every 2 hours</option>
                                <option value="14400" <?php selected( $sync_interval, 14400 ); ?>>Every 4 hours</option>
                                <option value="21600" <?php selected( $sync_interval, 21600 ); ?>>Every 6 hours (default)</option>
                                <option value="43200" <?php selected( $sync_interval, 43200 ); ?>>Every 12 hours</option>
                                <option value="86400" <?php selected( $sync_interval, 86400 ); ?>>Every 24 hours</option>
                            </select>
                            <p class="description">How often to pull inventory from the platform. High-volume stores should use a shorter interval.</p>
                        </td>
                    </tr>

                    <!-- Enabled -->
                    <tr>
                        <th scope="row">Enabled</th>
                        <td>
                            <label>
                                <input type="checkbox" name="enabled" value="1" <?php checked( $enabled ); ?>>
                                Sync is active for this vendor
                            </label>
                        </td>
                    </tr>
                </table>

                <p class="submit">
                    <button type="submit" class="button button-primary">
                        <?php echo $is_edit ? 'Update Vendor' : 'Add Vendor'; ?>
                    </button>
                    <a href="<?php echo esc_url( $this->page_url() ); ?>" class="button">Cancel</a>

                    <?php if ( $is_edit ) : ?>
                        &nbsp;&nbsp;
                        <a href="#" style="color:#b32d2e; text-decoration:none;"
                           onclick="if(confirm('Remove this vendor from sync? This does not delete the vendor or their products.')){document.getElementById('wcss-delete-form').submit();}return false;">
                            Remove Vendor
                        </a>
                    <?php endif; ?>
                </p>
            </form>

            <?php if ( $is_edit ) : ?>
                <form id="wcss-delete-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:none;">
                    <?php wp_nonce_field( 'wcss_delete_vendor_' . $edit_vendor_id ); ?>
                    <input type="hidden" name="action" value="wcss_delete_vendor">
                    <input type="hidden" name="vendor_id" value="<?php echo esc_attr( $edit_vendor_id ); ?>">
                </form>
            <?php endif; ?>
        </div>

        <script>
        function wcssTogglePlatform(platform) {
            var squareRows  = document.querySelectorAll('.wcss-square-field');
            var shopifyRows = document.querySelectorAll('.wcss-shopify-field');
            var etsyRows    = document.querySelectorAll('.wcss-etsy-field');
            squareRows.forEach(function(row)  { row.style.display = platform === 'square'  ? '' : 'none'; });
            shopifyRows.forEach(function(row) { row.style.display = platform === 'shopify' ? '' : 'none'; });
            etsyRows.forEach(function(row)    { row.style.display = platform === 'etsy'    ? '' : 'none'; });
        }
        function wcssTogglePassword(id) {
            var input = document.getElementById(id);
            input.type = input.type === 'password' ? 'text' : 'password';
        }
        // Initialize visibility on page load.
        wcssTogglePlatform('<?php echo esc_js( $platform ); ?>');
        </script>
        <?php
    }

    // ------------------------------------------------------------------
    //  Logs Tab
    // ------------------------------------------------------------------

    /**
     * Render the logs tab.
     */
    private function render_logs_tab() {
        $upload_dir = wp_upload_dir();
        $log_dir    = $upload_dir['basedir'] . '/wc-square-sync-logs';
        $today_log  = $log_dir . '/' . current_time( 'Y-m-d' ) . '.log';

        echo '<h2>Today\'s Logs</h2>';

        if ( ! file_exists( $today_log ) ) {
            echo '<p><em>No logs for today yet. Logs appear after the first sync, import, or connection test.</em></p>';
            return;
        }

        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_get_contents
        $contents = file_get_contents( $today_log );
        $lines    = explode( "\n", trim( $contents ) );
        $lines    = array_slice( $lines, -100 );

        echo '<div style="background:#1d2327; color:#f0f0f0; padding:12px 16px; max-height:500px; overflow-y:auto; font-family:monospace; font-size:12px; line-height:1.6; white-space:pre-wrap; max-width:1100px;">';
        foreach ( $lines as $line ) {
            $line = esc_html( $line );
            $line = str_replace( '[ERROR]', '<span style="color:#dc3232;font-weight:bold;">[ERROR]</span>', $line );
            $line = str_replace( '[WARNING]', '<span style="color:#ffb900;font-weight:bold;">[WARNING]</span>', $line );
            $line = str_replace( '[INFO]', '<span style="color:#46b450;">[INFO]</span>', $line );
            echo $line . "\n";
        }
        echo '</div>';
    }

    // ------------------------------------------------------------------
    //  Form Handlers
    // ------------------------------------------------------------------

    /**
     * Handle add/edit vendor form submission.
     */
    public function handle_save_vendor() {
        check_admin_referer( 'wcss_save_vendor' );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( 'Unauthorized.' );
        }

        $is_edit   = ! empty( $_POST['edit_vendor_id'] );
        $vendor_id = $is_edit
            ? (int) $_POST['edit_vendor_id']
            : ( isset( $_POST['vendor_id'] ) ? (int) $_POST['vendor_id'] : 0 );

        if ( ! $vendor_id ) {
            $this->redirect_with_message( 'Please select a vendor.', 'error' );
            return;
        }

        $platform = sanitize_text_field( wp_unslash( $_POST['platform'] ?? 'square' ) );

        $config = array(
            'platform'      => $platform,
            'label'         => sanitize_text_field( wp_unslash( $_POST['label'] ?? '' ) ),
            'sync_interval' => (int) ( $_POST['sync_interval'] ?? WCSS_Vendor_Config::DEFAULT_SYNC_INTERVAL ),
            'enabled'       => ! empty( $_POST['enabled'] ),
        );

        // Platform-specific fields.
        if ( 'square' === $platform ) {
            $config['square_access_token'] = sanitize_text_field( wp_unslash( $_POST['square_access_token'] ?? '' ) );
            $config['square_location_id']  = sanitize_text_field( wp_unslash( $_POST['square_location_id'] ?? '' ) );
        } elseif ( 'shopify' === $platform ) {
            $config['shopify_shop_domain']  = sanitize_text_field( wp_unslash( $_POST['shopify_shop_domain'] ?? '' ) );
            $config['shopify_access_token'] = sanitize_text_field( wp_unslash( $_POST['shopify_access_token'] ?? '' ) );
            $config['shopify_location_id']  = sanitize_text_field( wp_unslash( $_POST['shopify_location_id'] ?? '' ) );
        } elseif ( 'etsy' === $platform ) {
            $config['etsy_api_key']      = sanitize_text_field( wp_unslash( $_POST['etsy_api_key'] ?? '' ) );
            $config['etsy_shop_id']      = sanitize_text_field( wp_unslash( $_POST['etsy_shop_id'] ?? '' ) );
            $config['etsy_access_token'] = sanitize_text_field( wp_unslash( $_POST['etsy_access_token'] ?? '' ) );
        }

        // Validate required fields.
        $required = WCSS_Vendor_Config::get_required_fields( $platform );
        foreach ( $required as $field ) {
            if ( empty( $config[ $field ] ) ) {
                $label = str_replace( '_', ' ', str_replace( array( 'square_', 'shopify_', 'etsy_' ), '', $field ) );
                $this->redirect_with_message(
                    sprintf( 'Missing required field: <strong>%s</strong>', esc_html( ucwords( $label ) ) ),
                    'error'
                );
                return;
            }
        }

        WCSS_Vendor_Config::save_vendor( $vendor_id, $config );

        $action_word = $is_edit ? 'updated' : 'added';
        $this->redirect_with_message(
            sprintf(
                'Vendor <strong>%s</strong> (ID: %d) has been %s.',
                esc_html( $config['label'] ?: $this->get_dokan_vendor_name( $vendor_id ) ),
                $vendor_id,
                $action_word
            ),
            'success'
        );
    }

    /**
     * Handle vendor deletion.
     */
    public function handle_delete_vendor() {
        $vendor_id = isset( $_POST['vendor_id'] ) ? (int) $_POST['vendor_id'] : 0;
        check_admin_referer( 'wcss_delete_vendor_' . $vendor_id );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( 'Unauthorized.' );
        }

        $name = $this->get_dokan_vendor_name( $vendor_id );
        WCSS_Vendor_Config::delete_vendor( $vendor_id );

        $this->redirect_with_message(
            sprintf( 'Vendor <strong>%s</strong> (ID: %d) has been removed from sync.', esc_html( $name ), $vendor_id ),
            'success'
        );
    }

    /**
     * Handle the "Test Connection" action.
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
            $provider->get_inventory_counts( array( '__connection_test__' ) );

            $this->redirect_with_message(
                sprintf(
                    '<strong>%s</strong>: Connection successful! %s API responded correctly.',
                    esc_html( $config['label'] ),
                    ucfirst( $config['platform'] )
                ),
                'success'
            );
        } catch ( Exception $e ) {
            $this->redirect_with_message(
                sprintf(
                    '<strong>%s</strong>: Connection failed — %s',
                    esc_html( $config['label'] ),
                    esc_html( $e->getMessage() )
                ),
                'error'
            );
        }
    }

    /**
     * Handle the "Sync Now" action.
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

        $scheduler = new WCSS_Sync_Scheduler( $this->vendor_config );
        $scheduler->run_sync();

        update_option( 'wcss_last_sync_' . $vendor_id, time(), false );

        $this->redirect_with_message(
            sprintf(
                '<strong>%s</strong>: Sync completed. Check the <a href="%s">Logs</a> tab for details.',
                esc_html( $config['label'] ),
                esc_url( $this->page_url( array( 'tab' => 'logs' ) ) )
            ),
            'success'
        );
    }

    /**
     * Handle the "Import Products" action.
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
                '<strong>%s</strong>: Import completed — Created: %d, Updated: %d, Skipped: %d, Errors: %d. See <a href="%s">Logs</a> for details.',
                esc_html( $config['label'] ),
                $summary['created'],
                $summary['updated'],
                $summary['skipped'],
                $summary['errors'],
                esc_url( $this->page_url( array( 'tab' => 'logs' ) ) )
            ),
            $summary['errors'] > 0 ? 'warning' : 'success'
        );
    }

    // ------------------------------------------------------------------
    //  Helpers
    // ------------------------------------------------------------------

    /**
     * Get all Dokan vendors as an array of ID => store name.
     *
     * @return array
     */
    private function get_dokan_vendors() {
        $vendors = array();

        // Dokan stores vendors as users with the 'seller' role.
        $args = array(
            'role__in' => array( 'seller', 'administrator' ),
            'orderby'  => 'display_name',
            'order'    => 'ASC',
            'number'   => 200,
        );

        $users = get_users( $args );

        foreach ( $users as $user ) {
            $store_name = '';
            // Try to get the Dokan store name.
            if ( function_exists( 'dokan_get_store_info' ) ) {
                $store_info = dokan_get_store_info( $user->ID );
                $store_name = $store_info['store_name'] ?? '';
            }
            if ( ! $store_name ) {
                $store_name = $user->display_name;
            }
            $vendors[ $user->ID ] = $store_name;
        }

        return $vendors;
    }

    /**
     * Get a single Dokan vendor's display name.
     *
     * @param int $vendor_id
     * @return string
     */
    private function get_dokan_vendor_name( $vendor_id ) {
        if ( function_exists( 'dokan_get_store_info' ) ) {
            $info = dokan_get_store_info( $vendor_id );
            if ( ! empty( $info['store_name'] ) ) {
                return $info['store_name'];
            }
        }

        $user = get_user_by( 'id', $vendor_id );
        return $user ? $user->display_name : 'Vendor #' . $vendor_id;
    }

    /**
     * Build a URL to this admin page with optional query args.
     *
     * @param array $extra_args
     * @return string
     */
    private function page_url( array $extra_args = array() ) {
        return add_query_arg(
            array_merge( array( 'page' => 'wc-inventory-sync' ), $extra_args ),
            admin_url( 'admin.php' )
        );
    }

    /**
     * Redirect back to the admin page with a message.
     *
     * @param string $message
     * @param string $type
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
     * Format seconds to a human-readable interval.
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
