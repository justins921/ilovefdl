<?php
/**
 * Platform Provider Factory
 *
 * Creates the correct inventory-sync provider based on the vendor's configured platform.
 * Supports "square" and "shopify". Adding a new platform only requires:
 *   1. Creating a new class that implements WCSS_Platform_Provider_Interface.
 *   2. Registering it in the $providers map below.
 *   3. Setting 'platform' => 'newplatform' in vendor-config.php for the relevant vendor.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Interface that every platform provider must implement.
 */
interface WCSS_Platform_Provider_Interface {

    /**
     * Fetch inventory counts for a list of SKUs from the external platform.
     *
     * @param array $skus List of product SKUs to look up.
     * @return array Associative array of SKU => quantity (int). SKUs not found should be omitted.
     */
    public function get_inventory_counts( array $skus );

    /**
     * Adjust (decrement) inventory on the external platform after a WooCommerce sale.
     *
     * @param string $sku   The product SKU.
     * @param int    $quantity The quantity sold (positive number to subtract).
     * @return bool True on success, false on failure.
     */
    public function adjust_inventory( $sku, $quantity );

    /**
     * Fetch all products from the external platform for import into WooCommerce.
     *
     * Returns a normalized array of products. Each product array contains:
     *   'name'        => (string) Product title
     *   'description' => (string) Product description / body HTML
     *   'sku'         => (string) SKU (for simple products or the parent-level SKU)
     *   'price'       => (string) Regular price
     *   'stock'       => (int|null) Stock quantity (null if not tracked)
     *   'images'      => (array) List of image URLs
     *   'categories'  => (array) List of category names
     *   'variations'  => (array) For variable products, each with: name, sku, price, stock, attributes
     *   'weight'      => (string) Weight
     *   'status'      => (string) 'active' or 'inactive'
     *
     * @return array List of normalized product arrays.
     */
    public function get_products();
}

class WCSS_Platform_Factory {

    /**
     * Map of platform slug => class name.
     *
     * @var array
     */
    private static $providers = array(
        'square'  => 'WCSS_Square_Provider',
        'shopify' => 'WCSS_Shopify_Provider',
        'etsy'    => 'WCSS_Etsy_Provider',
    );

    /**
     * Create a provider instance for the given vendor config.
     *
     * @param array $vendor_config Normalized vendor configuration array.
     * @return WCSS_Platform_Provider_Interface
     * @throws InvalidArgumentException If the platform is not supported.
     */
    public static function create( array $vendor_config ) {
        $platform = isset( $vendor_config['platform'] ) ? $vendor_config['platform'] : 'square';

        if ( ! isset( self::$providers[ $platform ] ) ) {
            throw new InvalidArgumentException(
                sprintf( 'Unsupported inventory platform: %s', esc_html( $platform ) )
            );
        }

        $class = self::$providers[ $platform ];
        return new $class( $vendor_config );
    }

    /**
     * Get the list of supported platform slugs.
     *
     * @return array
     */
    public static function get_supported_platforms() {
        return array_keys( self::$providers );
    }
}
