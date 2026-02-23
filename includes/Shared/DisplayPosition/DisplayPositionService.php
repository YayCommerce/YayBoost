<?php
/**
 * Display Position Service
 *
 * Centralized service for managing display positions across WooCommerce pages.
 * Provides hook configurations and admin UI options for features.
 *
 * @package YayBoost
 */

namespace YayBoost\Shared\DisplayPosition;

defined( 'ABSPATH' ) || exit;
/**
 * Service for managing display positions on WooCommerce pages
 */
class DisplayPositionService {

    /** Page type constants */
    public const PAGE_PRODUCT  = 'product';
    public const PAGE_SHOP     = 'shop';
    public const PAGE_CART     = 'cart';
    public const PAGE_CHECKOUT = 'checkout';

    /** Special position for Gutenberg block usage */
    public const POSITION_USE_BLOCK = 'use_block';

    /**
     * Position providers for each page type
     *
     * @var array<string, PositionProviderInterface>
     */
    private array $providers = [];

    /**
     * Constructor - initializes position providers
     */
    public function __construct() {
        $this->providers = [
            self::PAGE_PRODUCT  => new ProductPagePositions(),
            self::PAGE_SHOP     => new ShopPagePositions(),
            self::PAGE_CART     => new CartPagePositions(),
            self::PAGE_CHECKOUT => new CheckoutPagePositions(),
        ];
    }

    /**
     * Get all positions for a page type
     *
     * @param string     $page_type Page type constant (PAGE_PRODUCT, PAGE_SHOP, etc.).
     * @param array|null $filter    Optional. Limit to specific position keys. Null = all.
     * @return array Position configurations.
     */
    public function get_positions( string $page_type, ?array $filter = null ): array {
        $provider = $this->providers[ $page_type ] ?? null;

        if ( ! $provider ) {
            return [];
        }

        $positions = $provider->get_all();

        if ( null === $filter ) {
            return $positions;
        }

        return array_intersect_key( $positions, array_flip( $filter ) );
    }

    /**
     * Get position configuration by key
     *
     * @param string $page_type    Page type constant.
     * @param string $position_key Position key.
     * @return array|null Position config or null if not found.
     */
    public function get_position( string $page_type, string $position_key ): ?array {
        $positions = $this->get_positions( $page_type );
        return $positions[ $position_key ] ?? null;
    }

    /**
     * Get positions formatted for admin select dropdown
     *
     * @param string     $page_type        Page type constant.
     * @param array|null $filter           Optional. Limit to specific position keys.
     * @param bool       $include_use_block Whether to include "Use Block" option.
     * @return array Options array with value/label pairs.
     */
    public function get_options_for_select( string $page_type, ?array $filter = null, bool $include_use_block = false ): array {
        $positions = $this->get_positions( $page_type, $filter );
        $options   = [];

        foreach ( $positions as $key => $config ) {
            $options[] = [
                'value' => $key,
                'label' => $config['label'],
            ];
        }

        // Add use_block option if feature opts in
        if ( $include_use_block ) {
            $options[] = [
                'value' => self::POSITION_USE_BLOCK,
                'label' => __( 'Use Gutenberg Block', 'yayboost-sales-booster-for-woocommerce' ),
            ];
        }

        return $options;
    }

    /**
     * Register a WordPress action hook for a position
     *
     * @param string   $page_type    Page type constant.
     * @param string   $position_key Position key.
     * @param callable $callback     Callback function to execute.
     * @return bool True if hook registered, false if position is use_block or not found.
     */
    public function register_hook( string $page_type, string $position_key, callable $callback ): bool {
        // Skip if using block - feature handles this separately
        if ( self::POSITION_USE_BLOCK === $position_key ) {
            return false;
        }

        $config = $this->get_position( $page_type, $position_key );

        if ( ! $config ) {
            return false;
        }

        add_action( $config['hook'], $callback, $config['priority'] );
        return true;
    }

    /**
     * Get all available page types
     *
     * @return array List of page type constants.
     */
    public function get_page_types(): array {
        return array_keys( $this->providers );
    }

    /**
     * Map a position from one page type to another
     *
     * Useful when a feature displays on multiple pages but user only selects
     * one position. Maps the selected position to equivalent position on other page.
     *
     * @param string $position       Position key from source page.
     * @param string $from_page_type Source page type constant.
     * @param string $to_page_type   Target page type constant.
     * @param string $fallback       Fallback position if no mapping found.
     * @return string Mapped position key for target page.
     */
    public function map_position( string $position, string $from_page_type, string $to_page_type, string $fallback = '' ): string {
        $mappings = $this->get_position_mappings();

        $map_key = "{$from_page_type}_to_{$to_page_type}";

        if ( ! isset( $mappings[ $map_key ] ) ) {
            return $fallback;
        }

        return $mappings[ $map_key ][ $position ] ?? $fallback;
    }

    /**
     * Get cross-page position mappings
     *
     * Defines how positions on one page type correspond to positions on another.
     * Format: 'sourcePage_to_targetPage' => ['source_position' => 'target_position']
     *
     * @return array<string, array<string, string>> Position mappings.
     */
    protected function get_position_mappings(): array {
        return [
            // Product page → Shop page mappings
            'product_to_shop'     => [
                'below_product_title'      => 'after_shop_loop_item_title',
                'below_price'              => 'after_shop_loop_item_title',
                'above_add_to_cart_button' => 'after_shop_loop_item',
                'below_add_to_cart_button' => 'after_shop_loop_item',
                'below_short_description'  => 'after_shop_loop_item',
                'below_meta'               => 'after_shop_loop_item_late',
            ],

            // Shop page → Product page mappings (reverse)
            'shop_to_product'     => [
                'before_shop_loop_item'       => 'below_product_title',
                'before_shop_loop_item_title' => 'below_product_title',
                'after_shop_loop_item_title'  => 'below_product_title',
                'after_shop_loop_item'        => 'below_add_to_cart_button',
                'after_shop_loop_item_late'   => 'below_meta',
            ],

            // Product page → Cart page mappings
            'product_to_cart'     => [
                'below_product_title'      => 'before_cart_table',
                'below_add_to_cart_button' => 'after_cart_table',
            ],

            // Product page → Checkout page mappings
            'product_to_checkout' => [
                'below_product_title'      => 'before_checkout_form',
                'below_add_to_cart_button' => 'review_order_before_payment',
            ],
        ];
    }

    /**
     * Register hook with automatic position mapping for another page type
     *
     * Registers a hook on a target page using a position mapped from the source page.
     * Useful for features that show on multiple pages with one position setting.
     *
     * @param string   $position        Position key (from source page).
     * @param string   $from_page_type  Source page type where position was selected.
     * @param string   $to_page_type    Target page type to register hook on.
     * @param callable $callback        Callback function to execute.
     * @param string   $fallback        Fallback position if mapping not found.
     * @return bool True if hook registered, false otherwise.
     */
    public function register_mapped_hook(
        string $position,
        string $from_page_type,
        string $to_page_type,
        callable $callback,
        string $fallback = ''
    ): bool {
        $mapped_position = $this->map_position( $position, $from_page_type, $to_page_type, $fallback );

        if ( empty( $mapped_position ) ) {
            return false;
        }

        return $this->register_hook( $to_page_type, $mapped_position, $callback );
    }

    /**
     * Get grouped options for multi-select UI across multiple page types
     *
     * Returns options organized by page type for grouped multi-select components.
     *
     * @param array      $page_types Page types to include.
     * @param array|null $filters    Optional filters per page type. ['product' => ['pos1', 'pos2'], 'shop' => null]
     * @return array Grouped options: ['product' => ['label' => 'Product Page', 'options' => [...]], ...]
     */
    public function get_grouped_options( array $page_types, ?array $filters = null ): array {
        $page_labels = [
            self::PAGE_PRODUCT  => __( 'Product Page', 'yayboost-sales-booster-for-woocommerce' ),
            self::PAGE_SHOP     => __( 'Shop / Category Pages', 'yayboost-sales-booster-for-woocommerce' ),
            self::PAGE_CART     => __( 'Cart Page', 'yayboost-sales-booster-for-woocommerce' ),
            self::PAGE_CHECKOUT => __( 'Checkout Page', 'yayboost-sales-booster-for-woocommerce' ),
        ];

        $grouped = [];

        foreach ( $page_types as $page_type ) {
            $filter  = $filters[ $page_type ] ?? null;
            $options = $this->get_options_for_select( $page_type, $filter );

            if ( empty( $options ) ) {
                continue;
            }

            $grouped[ $page_type ] = [
                'label'   => $page_labels[ $page_type ] ?? ucfirst( $page_type ),
                'options' => $options,
            ];
        }

        return $grouped;
    }

    /**
     * Register hooks for multiple pages from grouped position settings
     *
     * Used when admin selects positions across multiple page types.
     * Settings format: ['product' => ['pos1', 'pos2'], 'shop' => ['pos1'], ...]
     *
     * @param array    $positions_by_page Positions grouped by page type.
     * @param callable $callback          Callback function to execute for all hooks.
     * @return array<string, int> Count of registered hooks per page type.
     */
    public function register_multi_page_hooks( array $positions_by_page, callable $callback ): array {
        $registered = [];

        foreach ( $positions_by_page as $page_type => $positions ) {
            if ( ! is_array( $positions ) || empty( $positions ) ) {
                continue;
            }

            $count = 0;
            foreach ( $positions as $position ) {
                if ( $this->register_hook( $page_type, $position, $callback ) ) {
                    ++$count;
                }
            }

            $registered[ $page_type ] = $count;
        }

        return $registered;
    }

    /**
     * Check if any positions are selected for a specific page type
     *
     * @param array  $positions_by_page Positions grouped by page type.
     * @param string $page_type         Page type to check.
     * @return bool True if page type has positions selected.
     */
    public function has_positions_for_page( array $positions_by_page, string $page_type ): bool {
        return ! empty( $positions_by_page[ $page_type ] ) && is_array( $positions_by_page[ $page_type ] );
    }

    /**
     * Get flat list of all selected positions with page type prefix
     *
     * Useful for validation or display purposes.
     * Returns: ['product:below_title', 'shop:after_loop_item', ...]
     *
     * @param array $positions_by_page Positions grouped by page type.
     * @return array Flat list of prefixed positions.
     */
    public function flatten_positions( array $positions_by_page ): array {
        $flat = [];

        foreach ( $positions_by_page as $page_type => $positions ) {
            if ( ! is_array( $positions ) ) {
                continue;
            }

            foreach ( $positions as $position ) {
                $flat[] = "{$page_type}:{$position}";
            }
        }

        return $flat;
    }

    /**
     * Expand flat position list to grouped format
     *
     * Reverse of flatten_positions().
     * Input: ['product:below_title', 'shop:after_loop_item']
     * Output: ['product' => ['below_title'], 'shop' => ['after_loop_item']]
     *
     * @param array $flat_positions Flat list of prefixed positions.
     * @return array Positions grouped by page type.
     */
    public function expand_positions( array $flat_positions ): array {
        $grouped = [];

        foreach ( $flat_positions as $prefixed ) {
            $parts = explode( ':', $prefixed, 2 );
            if ( count( $parts ) !== 2 ) {
                continue;
            }

            [ $page_type, $position ] = $parts;

            if ( ! isset( $grouped[ $page_type ] ) ) {
                $grouped[ $page_type ] = [];
            }

            $grouped[ $page_type ][] = $position;
        }

        return $grouped;
    }
}
