# WC Inventory Sync

A WordPress plugin that syncs WooCommerce product inventory with **Square** and **Shopify** for Dokan multi-vendor marketplaces. Also supports importing products from those platforms into WooCommerce.

## How It Works

### Inventory Sync

There are two sync directions:

**Platform → WooCommerce (Periodic Cron)**

A WordPress cron job runs **every hour**. For each configured vendor, it checks whether enough time has elapsed since the last sync (based on that vendor's `sync_interval`). If a sync is due, it:

1. Fetches all the vendor's WooCommerce products that have SKUs
2. Queries the platform's Inventory API for current stock counts (matched by SKU)
3. Updates WooCommerce stock quantities to match the platform

**The external platform (Square/Shopify) is always the source of truth** in this direction.

**WooCommerce → Platform (On Purchase)**

When a customer completes a purchase on the WooCommerce store, the plugin:

1. Checks whether the product's vendor is configured for sync
2. If so, calls the platform's API to decrement stock by the quantity purchased

This is the **only** time WooCommerce pushes changes to the external platform.

### Product Import

You can pull products from a vendor's Square or Shopify catalog and create them as WooCommerce products assigned to that vendor. The importer:

- Creates new products or updates existing ones (matched by SKU)
- Handles both simple and variable products (with variations/attributes)
- Downloads and attaches product images
- Creates WooCommerce categories from the platform's category names
- Sets stock levels from the platform's inventory data
- Assigns products to the correct Dokan vendor

## Requirements

- WordPress 5.8+
- PHP 7.4+
- WooCommerce (active)
- Dokan (for multi-vendor support)
- Each synced product must have a **SKU in WooCommerce that matches the SKU on the external platform**

## Installation

1. Copy the `wc-square-sync` folder into `wp-content/plugins/`
2. Activate the plugin in WordPress admin → Plugins
3. Edit `wp-content/plugins/wc-square-sync/vendor-config.php` to add your vendors

## Vendor Configuration

Open `vendor-config.php` and add entries for each vendor. Each vendor specifies which platform they use.

### Square Vendor

```php
42 => array(
    'platform'             => 'square',             // or omit — square is the default
    'label'                => 'Example Coffee Roasters',
    'square_access_token'  => 'EAAAl0Z...',         // from Square Developer Dashboard
    'square_location_id'   => 'L1234ABC...',        // from Square Dashboard → Locations
    'sync_interval'        => 3600,                  // sync every 1 hour (in seconds)
    'enabled'              => true,
),
```

### Shopify Vendor

```php
87 => array(
    'platform'              => 'shopify',
    'label'                 => 'Weekend Candle Co',
    'shopify_shop_domain'   => 'weekend-candle-co.myshopify.com',
    'shopify_access_token'  => 'shpat_xxxxxxxxxxxx',   // Shopify Admin API token
    'shopify_location_id'   => '12345678901',           // Shopify location ID
    'sync_interval'         => 21600,                    // sync every 6 hours
    'enabled'               => true,
),
```

### Configuration Fields

| Field | Required | Default | Description |
|---|---|---|---|
| `platform` | No | `'square'` | Platform provider: `'square'` or `'shopify'` |
| `sync_interval` | No | `21600` (6h) | Seconds between periodic syncs. Use `3600` for high-volume stores |
| `enabled` | No | `true` | Set to `false` to temporarily disable sync |
| `label` | No | `''` | Human-readable name for log messages |

**Square-specific (required when `platform` is `'square'`):**

| Field | Description |
|---|---|
| `square_access_token` | Square API access token |
| `square_location_id` | Square location ID to sync inventory from |

**Shopify-specific (required when `platform` is `'shopify'`):**

| Field | Description |
|---|---|
| `shopify_shop_domain` | Shopify store domain (e.g., `mystore.myshopify.com`) |
| `shopify_access_token` | Shopify Admin API access token |
| `shopify_location_id` | Shopify location ID |

### Getting Square Credentials

1. Vendor logs into [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Creates an application (or selects an existing one)
3. Copies the **Access Token** from the Credentials tab
4. Finds the **Location ID** in the Square Dashboard under Locations

### Getting Shopify Credentials

1. In the Shopify admin, go to **Settings → Apps and sales channels → Develop apps**
2. Create a custom app with these Admin API scopes:
   - `read_products`
   - `read_inventory`
   - `write_inventory`
3. Install the app and copy the **Admin API access token**
4. Find the **Location ID** under Settings → Locations (or via the API)
5. The **shop domain** is your `*.myshopify.com` URL

## WP-CLI

### Inventory Sync

```bash
# Sync all vendors (ignores sync_interval, runs immediately)
wp wcss sync

# Sync a specific vendor
wp wcss sync --vendor=42
```

### Product Import

```bash
# Import products from a vendor's platform into WooCommerce
wp wcss import --vendor=42

# Preview what would be imported without making changes
wp wcss import --vendor=42 --dry-run
```

## Logging

Logs are written to `wp-content/uploads/wc-square-sync-logs/YYYY-MM-DD.log`. Errors are also surfaced in WooCommerce → Status → Logs (source: `wc-square-sync`).

## Architecture

```
wc-square-sync/
├── wc-square-sync.php              # Plugin bootstrap + WP-CLI commands
├── vendor-config.php               # Vendor list (edit this to add vendors)
├── includes/
│   ├── class-vendor-config.php     # Loads and validates vendor-config.php
│   ├── class-platform-factory.php  # Factory pattern — creates the right provider
│   ├── class-square-provider.php   # Square API client (inventory + catalog)
│   ├── class-shopify-provider.php  # Shopify API client (inventory + products)
│   ├── class-sync-scheduler.php    # Cron job: Platform → WooCommerce
│   ├── class-purchase-handler.php  # Order hook: WooCommerce → Platform
│   ├── class-product-importer.php  # Imports products from platform into WooCommerce
│   └── class-logger.php           # File + WooCommerce logging
```

The **factory pattern** (`WCSS_Platform_Factory` + `WCSS_Platform_Provider_Interface`) keeps platform-specific logic isolated. Each provider implements three methods:

- `get_inventory_counts( $skus )` — fetch stock levels by SKU
- `adjust_inventory( $sku, $quantity )` — decrement stock after a sale
- `get_products()` — fetch the full product catalog for import

Adding another platform means creating one new class and registering it in the factory — the scheduler, purchase handler, and importer all work automatically via the interface.

## Future Enhancements

- **Vendor self-registration UI**: Let vendors input their own credentials from the Dokan dashboard
- **Square Orders API**: Automatically create a corresponding Square order when a WooCommerce sale occurs (keeps accounting in sync)
- **Webhook-based sync**: Instead of polling, use Square/Shopify webhooks for real-time inventory updates
- **Selective import**: Filter which products to import by category or status
