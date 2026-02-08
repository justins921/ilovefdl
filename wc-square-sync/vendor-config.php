<?php
/**
 * Vendor Configuration List
 *
 * This file maps Dokan vendor IDs to their Square credentials and sync settings.
 * To add a new vendor, copy one of the entries below and fill in their details.
 *
 * Required fields:
 *   'square_access_token' - The vendor's Square API access token
 *   'square_location_id'  - The vendor's Square location ID
 *
 * Optional fields:
 *   'sync_interval'       - How often to sync FROM Square, in seconds (default: 21600 = 6 hours)
 *   'enabled'             - Whether sync is active for this vendor (default: true)
 *   'label'               - A human-readable name for logging purposes
 *
 * Finding the vendor ID:
 *   In wp-admin, go to Dokan > Vendors. The vendor ID is the WordPress user ID
 *   shown in the URL when editing a vendor (e.g., user_id=42 means vendor ID is 42).
 *
 * Getting Square credentials:
 *   1. The vendor logs into https://developer.squareup.com/apps
 *   2. Creates an application (or uses an existing one)
 *   3. Copies the "Access Token" from the Credentials tab
 *   4. Copies the "Location ID" from the Locations tab in the Square Dashboard
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

return array(

    // === EXAMPLE VENDOR (remove or replace with real vendors) ===
    //
    // 42 => array(
    //     'label'                => 'Example Coffee Roasters',
    //     'square_access_token'  => 'EAAAl0Z...',        // Square access token
    //     'square_location_id'   => 'L1234ABC...',       // Square location ID
    //     'sync_interval'        => 3600,                 // every 1 hour (high-volume store)
    //     'enabled'              => true,
    // ),
    //
    // 87 => array(
    //     'label'                => 'Weekend Candle Co',
    //     'square_access_token'  => 'EAAAm9X...',
    //     'square_location_id'   => 'L5678DEF...',
    //     'sync_interval'        => 21600,                // every 6 hours (default, low-volume)
    //     'enabled'              => true,
    // ),

);
