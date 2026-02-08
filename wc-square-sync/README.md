# WC Square Inventory Sync

A WordPress plugin that syncs WooCommerce product inventory with Square for Dokan multi-vendor marketplaces.

## How It Works

There are two sync directions:

### Square → WooCommerce (Periodic Cron)
A WordPress cron job runs **every hour**. For each configured vendor, it checks whether enough time has elapsed since the last sync (based on that vendor's `sync_interval`). If a sync is due, it:

1. Fetches all the vendor's WooCommerce products that have SKUs
2. Queries the Square Inventory API for current stock counts (matched by SKU)
3. Updates WooCommerce stock quantities to match Square

**Square is always the source of truth** in this direction.

### WooCommerce → Square (On Purchase)
When a customer completes a purchase on the WooCommerce store, the plugin:

1. Checks whether the product's vendor is configured for Square sync
2. If so, calls the Square Inventory API to decrement stock by the quantity purchased

This is the **only** time WooCommerce pushes changes to Square.

## Requirements

- WordPress 5.8+
- PHP 7.4+
- WooCommerce (active)
- Dokan (for multi-vendor support)
- Each synced product must have a **SKU in WooCommerce that matches the SKU in Square**

## Installation

1. Copy the `wc-square-sync` folder into `wp-content/plugins/`
2. Activate the plugin in WordPress admin → Plugins
3. Edit `wp-content/plugins/wc-square-sync/vendor-config.php` to add your vendors

## Vendor Configuration

Open `vendor-config.php` and add entries for each vendor you want to sync:

```php
return array(
    // Vendor ID => configuration
    42 => array(
        'label'                => 'Example Coffee Roasters',
        'square_access_token'  => 'EAAAl0Z...',       // from Square Developer Dashboard
        'square_location_id'   => 'L1234ABC...',      // from Square Dashboard → Locations
        'sync_interval'        => 3600,                // sync every 1 hour (in seconds)
        'enabled'              => true,
    ),
    87 => array(
        'label'                => 'Weekend Candle Co',
        'square_access_token'  => 'EAAAm9X...',
        'square_location_id'   => 'L5678DEF...',
        'sync_interval'        => 21600,               // sync every 6 hours
        'enabled'              => true,
    ),
);
```

### Configuration Fields

| Field | Required | Default | Description |
|---|---|---|---|
| `square_access_token` | Yes | — | Square API access token for this vendor |
| `square_location_id` | Yes | — | Square location ID to sync inventory from |
| `sync_interval` | No | `21600` (6h) | Seconds between periodic syncs. Use `3600` for high-volume stores |
| `enabled` | No | `true` | Set to `false` to temporarily disable sync without removing the entry |
| `label` | No | `''` | Human-readable name for log messages |
| `platform` | No | `'square'` | Platform provider (future: `'shopify'`) |

### Getting Square Credentials

1. Vendor logs into [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Creates an application (or selects an existing one)
3. Copies the **Access Token** from the Credentials tab
4. Finds the **Location ID** in the Square Dashboard under Locations

## Logging

Logs are written to `wp-content/uploads/wc-square-sync-logs/YYYY-MM-DD.log`. Errors are also surfaced in WooCommerce → Status → Logs (source: `wc-square-sync`).

## WP-CLI

You can manually trigger a sync from the command line:

```bash
# Sync all vendors (ignores sync_interval, runs immediately)
wp wcss sync

# Sync a specific vendor
wp wcss sync --vendor=42
```

## Architecture

```
wc-square-sync/
├── wc-square-sync.php              # Plugin bootstrap
├── vendor-config.php               # Vendor list (edit this file to add vendors)
├── includes/
│   ├── class-vendor-config.php     # Loads and validates vendor-config.php
│   ├── class-platform-factory.php  # Factory pattern — creates the right provider
│   ├── class-square-provider.php   # Square API client (inventory read + adjust)
│   ├── class-sync-scheduler.php    # Cron job: Square → WooCommerce
│   ├── class-purchase-handler.php  # Order hook: WooCommerce → Square
│   └── class-logger.php           # File + WooCommerce logging
```

The **factory pattern** (`WCSS_Platform_Factory`) makes it straightforward to add support for other platforms like Shopify in the future — just create a new provider class that implements `WCSS_Platform_Provider_Interface` and register it in the factory.

## Future Enhancements

- **Vendor self-registration UI**: Let vendors input their own Square credentials from the Dokan dashboard
- **Square Orders API**: Automatically create a corresponding Square order when a WooCommerce sale occurs (keeps accounting in sync)
- **Shopify support**: Add a `WCSS_Shopify_Provider` using the same factory pattern
- **Webhook-based sync**: Instead of polling, use Square webhooks for real-time inventory updates
