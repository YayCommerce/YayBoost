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
				'label' => __( 'Use Gutenberg Block', 'yayboost' ),
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
}
