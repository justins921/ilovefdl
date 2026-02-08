<?php
/**
 * Vendor Configuration List
 *
 * This file maps Dokan vendor IDs to their platform credentials and sync settings.
 * To add a new vendor, copy one of the examples below and fill in their details.
 *
 * COMMON FIELDS (all platforms):
 *   'platform'       - Which platform: 'square' (default) or 'shopify'
 *   'sync_interval'  - How often to sync inventory, in seconds (default: 21600 = 6 hours)
 *   'enabled'        - Whether sync is active for this vendor (default: true)
 *   'label'          - A human-readable name for logging purposes
 *
 * SQUARE-SPECIFIC FIELDS (required when platform is 'square'):
 *   'square_access_token' - The vendor's Square API access token
 *   'square_location_id'  - The vendor's Square location ID
 *
 * SHOPIFY-SPECIFIC FIELDS (required when platform is 'shopify'):
 *   'shopify_shop_domain'   - The vendor's Shopify store domain (e.g., "mystore.myshopify.com")
 *   'shopify_access_token'  - The vendor's Shopify Admin API access token
 *   'shopify_location_id'   - The vendor's Shopify location ID
 *
 * Finding the vendor ID:
 *   In wp-admin, go to Dokan > Vendors. The vendor ID is the WordPress user ID
 *   shown in the URL when editing a vendor (e.g., user_id=42 means vendor ID is 42).
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

return array(

    // === EXAMPLE: SQUARE VENDOR ===
    //
    // 42 => array(
    //     'platform'             => 'square',
    //     'label'                => 'Example Coffee Roasters',
    //     'square_access_token'  => 'EAAAl0Z...',        // Square access token
    //     'square_location_id'   => 'L1234ABC...',       // Square location ID
    //     'sync_interval'        => 3600,                 // every 1 hour (high-volume store)
    //     'enabled'              => true,
    // ),

    // === EXAMPLE: SHOPIFY VENDOR ===
    //
    // 87 => array(
    //     'platform'              => 'shopify',
    //     'label'                 => 'Weekend Candle Co',
    //     'shopify_shop_domain'   => 'weekend-candle-co.myshopify.com',
    //     'shopify_access_token'  => 'shpat_xxxxxxxxxxxx',   // Shopify Admin API token
    //     'shopify_location_id'   => '12345678901',           // Shopify location ID
    //     'sync_interval'         => 21600,                   // every 6 hours (default, low-volume)
    //     'enabled'               => true,
    // ),

);
