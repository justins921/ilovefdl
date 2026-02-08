<?php
/**
 * Vendor Configuration Registry
 *
 * Loads the vendor list from vendor-config.php and provides lookup methods.
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

    /**
     * Required fields per platform.
     *
     * @var array
     */
    private static $platform_required_fields = array(
        'square'  => array( 'square_access_token', 'square_location_id' ),
        'shopify' => array( 'shopify_shop_domain', 'shopify_access_token', 'shopify_location_id' ),
    );

    /**
     * Load vendor configurations from the config file.
     */
    public function __construct() {
        $config_file = WCSS_PLUGIN_DIR . 'vendor-config.php';

        if ( file_exists( $config_file ) ) {
            $raw = include $config_file;
            if ( is_array( $raw ) ) {
                foreach ( $raw as $vendor_id => $config ) {
                    if ( $this->validate_config( $vendor_id, $config ) ) {
                        $this->vendors[ (int) $vendor_id ] = $this->normalize_config( $config );
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
     * Validate that a vendor config has required fields for its platform.
     *
     * @param int   $vendor_id
     * @param mixed $config
     * @return bool
     */
    private function validate_config( $vendor_id, $config ) {
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
