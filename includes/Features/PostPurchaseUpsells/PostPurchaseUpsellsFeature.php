<?php
/**
 * Post Purchase Upsells Feature
 *
 * Display upsell offers on the thank you page after checkout. When the customer
 * clicks an offer, the product is added to cart and they are redirected to the cart.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\PostPurchaseUpsells;

use YayBoost\Analytics\AnalyticsTracker;
use YayBoost\Features\AbstractFeature;
use YayBoost\Utils\Price;

defined( 'ABSPATH' ) || exit;

/**
 * Post Purchase Upsells feature implementation
 */
class PostPurchaseUpsellsFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'post_purchase_upsells';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Post-Purchase Upsells';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display one-click upsell offers on the thank you page after checkout to increase order value';

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
    protected $icon = 'seal-percent';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 90;

    /**
     * Post Purchase Upsells repository
     *
     * @var PostPurchaseUpsellsRepository
     */
    protected $repository;

    /**
     * Thank you page renderer
     *
     * @var PostPurchaseUpsellsThankYouRenderer
     */
    protected $thank_you_renderer;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        $this->repository = new PostPurchaseUpsellsRepository();

        if ( ! $this->is_enabled() ) {
            return;
        }

        $this->thank_you_renderer = new PostPurchaseUpsellsThankYouRenderer( $this );

        add_action( 'woocommerce_before_thankyou', [ $this, 'render_thank_you_upsells' ], 10, 1 );
        add_action( 'template_redirect', [ $this, 'handle_add_upsell_to_cart' ] );
        add_filter( 'woocommerce_get_cart_item_from_session', [ $this, 'restore_ppu_cart_item' ], 10, 2 );
        add_action( 'woocommerce_before_calculate_totals', [ $this, 'apply_ppu_cart_item_price' ], 20, 1 );
    }

    /**
     * Get the repository instance
     *
     * @return PostPurchaseUpsellsRepository
     */
    public function get_repository(): PostPurchaseUpsellsRepository {
        return $this->repository;
    }

    /**
     * Render upsells on the thank you page
     *
     * @param int $order_id Order ID.
     * @return void
     */
    public function render_thank_you_upsells( int $order_id ): void {
        if ( ! $order_id ) {
            return;
        }
        $this->thank_you_renderer->render( $order_id );
    }

    /**
     * Handle add upsell to cart: validate order key, add product with PPU pricing, redirect to cart
     *
     * @return void
     */
    public function handle_add_upsell_to_cart(): void {
        $entity_id = isset( $_GET['yayboost_ppu_add'] ) ? absint( $_GET['yayboost_ppu_add'] ) : 0;
        $order_id  = isset( $_GET['oid'] ) ? absint( $_GET['oid'] ) : 0;
        $order_key = isset( $_GET['k'] ) ? sanitize_text_field( wp_unslash( $_GET['k'] ) ) : '';

        if ( ! $entity_id || ! $order_id || ! $order_key || ! function_exists( 'WC' ) || ! WC()->cart ) {
            return;
        }

        $order = wc_get_order( $order_id );
        if ( ! $order || $order->get_order_key() !== $order_key ) {
            return;
        }

        $entity = $this->repository->find( $entity_id );
        if ( ! $entity || empty( $entity['settings']['product_id'] ) ) {
            return;
        }

        $product_id = (int) $entity['settings']['product_id'];
        $product    = wc_get_product( $product_id );
        if ( ! $product || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
            return;
        }

        $cart_item_data = [
            '_yayboost_ppu' => [
                'entity_id'     => $entity_id,
                'order_id'      => $order_id,
                'pricing_type'  => $entity['settings']['pricing_type'] ?? 'no_discount',
                'pricing_value' => isset( $entity['settings']['pricing_value'] ) ? (float) $entity['settings']['pricing_value'] : 0,
            ],
        ];

        $variation_id = 0;
        $quantity     = 1;
        if ( $product->is_type( 'variable' ) ) {
            $variations = $product->get_available_variations();
            if ( ! empty( $variations ) ) {
                $first_var    = reset( $variations );
                $variation_id = (int) $first_var['variation_id'];
            }
        }

        WC()->cart->add_to_cart( $product_id, $quantity, $variation_id, [], $cart_item_data );

        wp_safe_redirect( wc_get_cart_url() );
        exit;
    }

    /**
     * Restore PPU cart item data from session
     *
     * @param array $cart_item Cart item.
     * @param array $values    Session values.
     * @return array
     */
    public function restore_ppu_cart_item( array $cart_item, array $values ): array {
        if ( ! empty( $values['_yayboost_ppu'] ) ) {
            $cart_item['_yayboost_ppu'] = $values['_yayboost_ppu'];
        }
        return $cart_item;
    }

    /**
     * Apply offer price to cart items that were added via post-purchase upsell
     *
     * @param \WC_Cart $cart Cart instance. // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
     * @return void
     */
    public function apply_ppu_cart_item_price( $cart ): void {
        if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
            return;
        }
        if ( ! $cart ) {
            return;
        }

        foreach ( $cart->get_cart() as $cart_item_key => $cart_item ) {
            if ( empty( $cart_item['_yayboost_ppu'] ) ) {
                continue;
            }

            $product = $cart_item['data'];
            if ( ! $product ) {
                continue;
            }

            $entity = $this->repository->find( (int) $cart_item['_yayboost_ppu']['entity_id'] );
            if ( ! $entity || empty( $entity['settings'] ) ) {
                continue;
            }

            $regular_price = (float) $product->get_regular_price();
            if ( $regular_price <= 0 ) {
                $regular_price = (float) $product->get_price();
            }
            $pricing_type  = $cart_item['_yayboost_ppu']['pricing_type'] ?? 'no_discount';
            $pricing_value = (float) ( $cart_item['_yayboost_ppu']['pricing_value'] ?? 0 );

            $offer_price = Price::get_discounted_price( $regular_price, $pricing_type, $pricing_value );

            $product->set_price( $offer_price );
        }//end foreach
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
                'enabled' => true,
                'display' => [
                    'mode'        => 'all',
                    'max_display' => 2,
                ],
                'timing'  => [
                    'show_countdown' => true,
                    'expires_after'  => 10,
                ],
            ]
        );
    }
}
