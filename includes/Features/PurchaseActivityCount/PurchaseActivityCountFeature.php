<?php
/**
 * Purchase Activity Count Feature
 *
 * Displays a purchase activity count on single product pages or category pages.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\PurchaseActivityCount;

use YayBoost\Features\AbstractFeature;
// use YayBoost\Shared\DisplayPosition\DisplayPositionService;

/**
 * Purchase Activity Count feature implementation
 */
class PurchaseActivityCountFeature extends AbstractFeature {

	/**
	 * Feature ID
	 *
	 * @var string
	 */
	protected $id = 'purchase_activity_count';

	/**
	 * Feature name
	 *
	 * @var string
	 */
	protected $name = 'Purchase Activity Count';

	/**
	 * Feature description
	 *
	 * @var string
	 */
	protected $description = 'Display a short text with the number of purchases processed for the current product or category';

	/**
	 * Feature category
	 *
	 * @var string
	 */
	protected $category = 'others';

	/**
	 * Feature icon (Phosphor icon name)
	 *
	 * @var string
	 */
	protected $icon = 'shopping-cart';

	/**
	 * Display priority
	 *
	 * @var int
	 */
	protected $priority = 1;

	/**
	 * Tracker instance
	 *
	 * @var PurchaseActivityCountTracker
	 */
	private $tracker;

	/**
	 * Renderer instance
	 *
	 * @var PurchaseActivityCountRenderer
	 */
	private $renderer;

	/**
	 * AJAX handler instance
	 *
	 * @var PurchaseActivityCountAjaxHandler
	 */
	private $ajax_handler;

	/**
	 * Constructor
	 *
	 * @param \YayBoost\Container\Container $container DI container.
	 */
	public function __construct( $container ) {
		parent::__construct( $container );

		// Initialize modules
		// $this->tracker      = new LiveVisitorCountTracker( $this );
		// $this->renderer     = new LiveVisitorCountRenderer( $this, $this->tracker );
		// $this->ajax_handler = new LiveVisitorCountAjaxHandler( $this->tracker );

		// Register AJAX hooks
		// $this->ajax_handler->register_hooks();
	}

	/**
	 * Initialize the feature
	 *
	 * @return void
	 */
	public function init(): void {
		if ( ! $this->is_enabled() ) {
			return;
		}

		// Register hooks after query is parsed
		add_action( 'wp', array( $this, 'register_product_hooks' ) );

		// Initialize block
		//new LiveVisitorCountBlock( $this );
	}

	/**
	 * Register product-specific hooks after query is parsed
	 *
	 * @return void
	 */
	public function register_product_hooks(): void {
		if ( ! function_exists( 'is_product' ) || ! is_product() ) {
			return;
		}

		// $position = $this->get( 'display.position' );

		// $this->position_service->register_hook(
		//  DisplayPositionService::PAGE_PRODUCT,
		//  $position,
		//  array( $this, 'render_content' )
		// );
	}

	/**
	 * Get position options for admin UI
	 *
	 * @return array Options array with value/label pairs.
	 */
	// public function get_position_options(): array {
	//  return $this->position_service->get_options_for_select(
	//      DisplayPositionService::PAGE_PRODUCT,
	//      $this->allowed_positions,
	//      true // Include "Use Block" option
	//  );
	// }

	/**
	 * Check if the feature should apply to the current product
	 *
	 * @return bool True if feature should apply.
	 */
	// public function should_apply_to_current_product(): bool {
	//  $apply = $this->get( 'apply_on.apply' );

	//  if ( 'all' === $apply ) {
	//      return true;
	//  }

	//  $product_id = get_the_ID();
	//  if ( ! $product_id ) {
	//      return false;
	//  }

	//  if ( 'specific_products' === $apply ) {
	//      return $this->matches_specific_products( $product_id );
	//  }

	//  if ( 'specific_categories' === $apply ) {
	//      return $this->matches_specific_categories( $product_id );
	//  }

	//  return false;
	// }

	/**
	 * Check if product matches specific products setting
	 *
	 * @param int $product_id Product ID.
	 * @return bool True if matches.
	 */
	// private function matches_specific_products( int $product_id ): bool {
	//  $specific_products = $this->get( 'apply_on.products' ) ?? array();
	//  if ( empty( $specific_products ) ) {
	//      return false;
	//  }

	//  $specific_products = array_map( 'intval', $specific_products );
	//  return in_array( $product_id, $specific_products, true );
	// }

	/**
	 * Check if product matches specific categories setting
	 *
	 * @param int $product_id Product ID.
	 * @return bool True if matches.
	 */
	// private function matches_specific_categories( int $product_id ): bool {
	//  $specific_categories = $this->get( 'apply_on.categories' ) ?? array();
	//  if ( empty( $specific_categories ) ) {
	//      return false;
	//  }
	//  $categories = array();
	//  // $specific_categories = array_map( 'intval', $specific_categories );
	//  foreach ( $specific_categories as $category ) {
	//      $category = get_term_by( 'slug', $category, 'product_cat' );
	//      if ( $category ) {
	//          $categories[] = $category->term_id;
	//          //if category has children, add them to the categories array
	//          $children = get_term_children( $category->term_id, 'product_cat' );
	//          if ( ! empty( $children ) ) {
	//              $categories = array_merge( $categories, $children );
	//          }
	//      }
	//  }

	//  if ( empty( $categories ) ) {
	//      return false;
	//  }

	//  $product_categories = wp_get_post_terms( $product_id, 'product_cat', array( 'fields' => 'ids' ) );

	//  if ( is_wp_error( $product_categories ) ) {
	//      return false;
	//  }

	//  return ! empty( array_intersect( array_map( 'intval', $product_categories ), $categories ) );
	// }

	/**
	 * Render visitor count content (delegated to renderer)
	 *
	 * @return void
	 */
	public function render_content(): void {
		$this->renderer->render();
	}

	/**
	 * Get rendered content (for block rendering)
	 *
	 * @return string HTML content.
	 */
	public function get_content(): string {
		return $this->renderer->get_content();
	}

	/**
	 * Enqueue frontend assets (for block rendering)
	 *
	 * @return void
	 */
	public function enqueue_assets(): void {
		$this->renderer->enqueue_assets();
	}

	/**
	 * Get default settings
	 *
	 * @return array Default settings.
	 */
	protected function get_default_settings(): array {
		return array_merge(
			parent::get_default_settings(),
			array(
				'enabled'               => true,
				'minimum_count_display' => 3,
				'count_from'            => 'all',
				'display'               => array(
					'text'                 => '{count} customers bought this product',
					'position'             => 'below_price',
					'show_on_product_page' => true,
					'show_on_shop_page'    => false,
				),
				'target_products'       => array(
					'apply'      => 'all',
					'categories' => array(),
					'products'   => array(),
					'exclude'    => array(),
				),
			)
		);
	}
}
