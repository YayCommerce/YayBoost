<?php
/**
 * Order Bump Feature
 *
 * Display upsell offers during checkout that customers can add
 * to their order with a single click.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\OrderBump;

use YayBoost\Features\AbstractFeature;

defined( 'ABSPATH' ) || exit;

/**
 * Order Bump feature implementation
 */
class OrderBumpFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'order_bump';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Order Bump';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display one-click upsell offers during checkout to increase order value';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'checkout_booster';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'plus-circle';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 100;

    /**
     * Bump repository
     *
     * @var BumpRepository
     */
    protected $repository;

    /**
     * Order bump renderer (checkout frontend).
     *
     * @var OrderBumpRenderer
     */
    protected $renderer;

    /**
     * Checkout handler (adds bump line items when place order is clicked).
     *
     * @var OrderBumpCheckoutHandler
     */
    protected $checkout_handler;

    /**
     * Cart handler (add/remove bump on checkbox toggle, apply bump price).
     *
     * @var OrderBumpCartHandler
     */
    protected $cart_handler;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        $this->repository   = new BumpRepository();
        $this->renderer     = new OrderBumpRenderer( $this, $this->repository );
        $this->cart_handler = new OrderBumpCartHandler( $this->renderer );

        if ( $this->is_enabled() ) {
            $this->register_checkout_hooks();
            $this->cart_handler->register();
            add_action( 'wp_enqueue_scripts', [ $this, 'maybe_enqueue_checkout_assets' ] );
        }
    }

    /**
     * Register WooCommerce checkout hooks so order bumps render at each position.
     *
     * @return void
     */
    protected function register_checkout_hooks(): void {
        foreach ( OrderBumpRenderer::get_position_keys() as $position ) {
            $hook = OrderBumpRenderer::get_hook_for_position( $position );
            add_action(
                $hook,
                function () use ( $position ) {
                    $this->renderer->render( $position );
                },
                10
            );
        }
    }

    /**
     * Enqueue order bump styles on checkout page when feature is enabled.
     *
     * @return void
     */
    public function maybe_enqueue_checkout_assets(): void {
        if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) {
            return;
        }

        if ( ! wp_style_is( 'yayboost-order-bump', 'enqueued' ) ) {
            wp_enqueue_style(
                'yayboost-order-bump',
                defined( 'YAYBOOST_URL' ) ? YAYBOOST_URL . 'assets/css/order-bump.css' : '',
                [],
                defined( 'YAYBOOST_VERSION' ) ? YAYBOOST_VERSION : '1.0.0'
            );
        }

        if ( ! wp_script_is( 'yayboost-order-bump', 'enqueued' ) ) {
            wp_enqueue_script(
                'yayboost-order-bump',
                defined( 'YAYBOOST_URL' ) ? YAYBOOST_URL . 'assets/js/order-bump.js' : '',
                [ 'jquery' ],
                defined( 'YAYBOOST_VERSION' ) ? YAYBOOST_VERSION : '1.0.0',
                true
            );
            wp_localize_script(
                'yayboost-order-bump',
                'yayboost_order_bump',
                [
                    'ajax_url' => admin_url( 'admin-ajax.php' ),
                    'nonce'    => wp_create_nonce( 'yayboost_order_bump' ),
                    'actions'  => [
                        'add'    => \YayBoost\Features\OrderBump\OrderBumpCartHandler::AJAX_ACTION_ADD,
                        'remove' => \YayBoost\Features\OrderBump\OrderBumpCartHandler::AJAX_ACTION_REMOVE,
                    ],
                ]
            );
        }//end if
    }

    /**
     * Get the order bump renderer (for block checkout or external use).
     *
     * @return OrderBumpRenderer
     */
    public function get_renderer(): OrderBumpRenderer {
        return $this->renderer;
    }

    /**
     * Get default settings
     *
     * @return array
     */
    protected function get_default_settings(): array {
        return array_merge(
            parent::get_default_settings(),
            [
                'enabled'          => false,
                'max_bump_display' => 2,
            ]
        );
    }
}
