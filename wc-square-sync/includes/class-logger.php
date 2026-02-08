<?php
/**
 * Simple Logger
 *
 * Writes to a dedicated log file inside wp-content/uploads/wc-square-sync-logs/.
 * Also surfaces errors in the WooCommerce status logs when WC is available.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WCSS_Logger {

    const LOG_DIR_NAME = 'wc-square-sync-logs';

    /**
     * Log an informational message.
     *
     * @param string $message
     */
    public static function info( $message ) {
        self::log( 'INFO', $message );
    }

    /**
     * Log a warning.
     *
     * @param string $message
     */
    public static function warning( $message ) {
        self::log( 'WARNING', $message );
    }

    /**
     * Log an error.
     *
     * @param string $message
     */
    public static function error( $message ) {
        self::log( 'ERROR', $message );
    }

    /**
     * Write a log entry to file and optionally to WooCommerce logger.
     *
     * @param string $level
     * @param string $message
     */
    private static function log( $level, $message ) {
        $timestamp = current_time( 'Y-m-d H:i:s' );
        $entry     = sprintf( "[%s] [%s] %s\n", $timestamp, $level, $message );

        // Write to plugin log file.
        $log_dir = self::get_log_dir();
        if ( $log_dir ) {
            $log_file = $log_dir . '/' . current_time( 'Y-m-d' ) . '.log';
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
            file_put_contents( $log_file, $entry, FILE_APPEND | LOCK_EX );
        }

        // Mirror errors to WooCommerce logger if available.
        if ( 'ERROR' === $level && function_exists( 'wc_get_logger' ) ) {
            wc_get_logger()->error( $message, array( 'source' => 'wc-square-sync' ) );
        }
    }

    /**
     * Get (and create if needed) the log directory.
     *
     * @return string|false
     */
    private static function get_log_dir() {
        $upload_dir = wp_upload_dir();
        $log_dir    = $upload_dir['basedir'] . '/' . self::LOG_DIR_NAME;

        if ( ! file_exists( $log_dir ) ) {
            wp_mkdir_p( $log_dir );

            // Protect logs from public access.
            $htaccess = $log_dir . '/.htaccess';
            if ( ! file_exists( $htaccess ) ) {
                // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
                file_put_contents( $htaccess, "Deny from all\n" );
            }
        }

        return is_dir( $log_dir ) ? $log_dir : false;
    }
}
