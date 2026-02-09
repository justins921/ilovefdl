<?php
/**
 * Vendor Configuration Registry
 *
 * Loads vendor configurations from the WordPress database (wp_options).
 * Falls back to vendor-config.php for backward compatibility.
 * Validates platform-specific required fields (Square vs Shopify).
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WCSS_Vendor_Config {

    /** @var array Vendor configurations keyed by vendor ID. */
    private $vendors = array();

    /** @var int Default sync interval in seconds (6 hours). */
    const DEFAULT_SYNC_INTERVAL = 21600;

    /** @var string WordPress option key for storing vendor configs. */
    const DB_OPTION_KEY = 'wcss_vendor_configs';

    /**
     * Required fields per platform.
     *
     * @var array
     */
    private static $platform_required_fields = array(
        'square'  => array( 'square_access_token', 'square_location_id' ),
        'shopify' => array( 'shopify_shop_domain', 'shopify_access_token', 'shopify_location_id' ),
        'etsy'    => array( 'etsy_api_key', 'etsy_shop_id', 'etsy_access_token' ),
    );

    /**
     * Load vendor configurations from the database, with file fallback.
     */
    public function __construct() {
        // Primary: load from database.
        $db_configs = get_option( self::DB_OPTION_KEY, array() );

        if ( ! empty( $db_configs ) && is_array( $db_configs ) ) {
            foreach ( $db_configs as $vendor_id => $config ) {
                if ( $this->validate_config( $vendor_id, $config ) ) {
                    $this->vendors[ (int) $vendor_id ] = $this->normalize_config( $config );
                }
            }
        }

        // Fallback: merge in vendor-config.php entries (file entries won't overwrite DB entries).
        $config_file = WCSS_PLUGIN_DIR . 'vendor-config.php';
        if ( file_exists( $config_file ) ) {
            $file_configs = include $config_file;
            if ( is_array( $file_configs ) ) {
                foreach ( $file_configs as $vendor_id => $config ) {
                    $vendor_id = (int) $vendor_id;
                    if ( ! isset( $this->vendors[ $vendor_id ] ) && $this->validate_config( $vendor_id, $config ) ) {
                        $this->vendors[ $vendor_id ] = $this->normalize_config( $config );
                    }
                }
            }
        }
    }

    /**
     * Check whether a vendor ID is registered and enabled.
     *
     * @param int $vendor_id
     * @return bool
     */
    public function has_vendor( $vendor_id ) {
        $vendor_id = (int) $vendor_id;
        return isset( $this->vendors[ $vendor_id ] ) && $this->vendors[ $vendor_id ]['enabled'];
    }

    /**
     * Get configuration for a single vendor.
     *
     * @param int $vendor_id
     * @return array|null
     */
    public function get_vendor( $vendor_id ) {
        $vendor_id = (int) $vendor_id;
        return $this->has_vendor( $vendor_id ) ? $this->vendors[ $vendor_id ] : null;
    }

    /**
     * Get all enabled vendor configurations.
     *
     * @return array Vendor configs keyed by vendor ID.
     */
    public function get_all_vendors() {
        return array_filter( $this->vendors, function ( $config ) {
            return $config['enabled'];
        } );
    }

    /**
     * Get ALL vendor configurations including disabled ones.
     *
     * @return array Vendor configs keyed by vendor ID.
     */
    public function get_all_vendors_raw() {
        return $this->vendors;
    }

    /**
     * Save a vendor configuration to the database.
     *
     * @param int   $vendor_id
     * @param array $config
     * @return bool
     */
    public static function save_vendor( $vendor_id, array $config ) {
        $vendor_id  = (int) $vendor_id;
        $all        = get_option( self::DB_OPTION_KEY, array() );
        $all[ $vendor_id ] = $config;
        return update_option( self::DB_OPTION_KEY, $all );
    }

    /**
     * Remove a vendor configuration from the database.
     *
     * @param int $vendor_id
     * @return bool
     */
    public static function delete_vendor( $vendor_id ) {
        $vendor_id = (int) $vendor_id;
        $all       = get_option( self::DB_OPTION_KEY, array() );
        unset( $all[ $vendor_id ] );
        return update_option( self::DB_OPTION_KEY, $all );
    }

    /**
     * Get the required fields for a given platform.
     *
     * @param string $platform
     * @return array
     */
    public static function get_required_fields( $platform ) {
        return isset( self::$platform_required_fields[ $platform ] )
            ? self::$platform_required_fields[ $platform ]
            : array();
    }

    /**
     * Validate that a vendor config has required fields for its platform.
     *
     * @param int   $vendor_id
     * @param mixed $config
     * @return bool
     */
    public function validate_config( $vendor_id, $config ) {
        if ( ! is_array( $config ) ) {
            return false;
        }

        $platform = isset( $config['platform'] ) ? $config['platform'] : 'square';

        if ( ! isset( self::$platform_required_fields[ $platform ] ) ) {
            if ( class_exists( 'WCSS_Logger' ) ) {
                WCSS_Logger::warning(
                    sprintf( 'Vendor %d has unsupported platform "%s" — skipped.', $vendor_id, $platform )
                );
            }
            return false;
        }

        $required = self::$platform_required_fields[ $platform ];
        foreach ( $required as $field ) {
            if ( empty( $config[ $field ] ) ) {
                if ( class_exists( 'WCSS_Logger' ) ) {
                    WCSS_Logger::warning(
                        sprintf( 'Vendor %d (%s) is missing required field "%s" — skipped.', $vendor_id, $platform, $field )
                    );
                }
                return false;
            }
        }

        return true;
    }

    /**
     * Fill in defaults for optional fields.
     *
     * @param array $config
     * @return array
     */
    private function normalize_config( $config ) {
        return array_merge(
            array(
                'label'         => '',
                'sync_interval' => self::DEFAULT_SYNC_INTERVAL,
                'enabled'       => true,
                'platform'      => 'square',
            ),
            $config
        );
    }
}
