<?php
/**
 * Vendor Configuration Registry
 *
 * Loads the vendor list from vendor-config.php and provides lookup methods.
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
     * Validate that a vendor config has required fields.
     *
     * @param int   $vendor_id
     * @param mixed $config
     * @return bool
     */
    private function validate_config( $vendor_id, $config ) {
        if ( ! is_array( $config ) ) {
            return false;
        }

        $required = array( 'square_access_token', 'square_location_id' );
        foreach ( $required as $field ) {
            if ( empty( $config[ $field ] ) ) {
                if ( class_exists( 'WCSS_Logger' ) ) {
                    WCSS_Logger::warning(
                        sprintf( 'Vendor %d is missing required field "%s" — skipped.', $vendor_id, $field )
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
