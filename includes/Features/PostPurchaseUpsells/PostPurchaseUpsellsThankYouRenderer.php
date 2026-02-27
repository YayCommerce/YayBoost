<?php
/**
 * Post Purchase Upsells – Thank You Page Renderer
 *
 * Renders upsell offers on the order received (thank you) page.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\PostPurchaseUpsells;

defined( 'ABSPATH' ) || exit;

use YayBoost\Utils\Price;

/**
 * Renders post-purchase upsells block on thank you page
 */
class PostPurchaseUpsellsThankYouRenderer {

    /**
     * Feature instance (for settings and repository)
     *
     * @var PostPurchaseUpsellsFeature
     */
    private $feature;

    /**
     * Constructor.
     *
     * @param PostPurchaseUpsellsFeature $feature Feature instance.
     */
    public function __construct( PostPurchaseUpsellsFeature $feature ) {
        $this->feature = $feature;
    }

    /**
     * Render upsells block on thank you page
     *
     * @param int $order_id Order ID (from woocommerce_thankyou).
     * @return void
     */
    public function render( int $order_id ): void {
        $order = \wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        $settings   = $this->feature->get_settings();
        $timing     = $settings['timing'] ?? [];
        $expires_in = isset( $timing['expires_after'] ) ? max( 0, (int) $timing['expires_after'] ) : 10;

        $order_date = $order->get_date_created();
        if ( $order_date && $expires_in > 0 ) {
            $expires_at = $order_date->getTimestamp() + ( $expires_in * 60 );
            if ( time() >= $expires_at ) {
                return;
            }
        } else {
            $expires_at = 0;
        }

        $display = $settings['display'] ?? [];
        $max     = isset( $display['max_display'] ) ? max( 1, (int) $display['max_display'] ) : 2;

        $entities = $this->feature->get_repository()->get_active();
        if ( empty( $entities ) ) {
            return;
        }

        $entities          = array_slice( $entities, 0, $max );
        $order_product_ids = $this->get_order_product_ids( $order );
        $used_entity_ids   = $this->get_used_offer_entity_ids( $order );
        $offers            = [];

        foreach ( $entities as $entity ) {
            if ( in_array( (int) $entity['id'], $used_entity_ids, true ) ) {
                continue;
            }

            $product_id = isset( $entity['settings']['product_id'] ) ? (int) $entity['settings']['product_id'] : 0;
            if ( ! $product_id ) {
                continue;
            }

            $behavior = isset( $entity['settings']['behavior'] ) ? (string) $entity['settings']['behavior'] : 'hide';
            if ( $behavior === 'hide' && in_array( $product_id, $order_product_ids, true ) ) {
                continue;
            }

            $product = \wc_get_product( $product_id );
            if ( ! $product || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
                continue;
            }

            if ( $behavior === 'hide' && $product->is_type( 'variable' ) ) {
                $variation_ids = $product->get_children();
                $in_order      = array_intersect( array_map( 'intval', $variation_ids ), $order_product_ids );
                if ( ! empty( $in_order ) ) {
                    continue;
                }
            }

            $regular_price = (float) $product->get_regular_price();
            if ( $regular_price <= 0 ) {
                $regular_price = (float) $product->get_price();
            }
            $offer_price     = $this->get_offer_price( $product, $entity['settings'] );
            $add_url         = $this->get_add_to_cart_url( $order_id, $order->get_order_key(), (int) $entity['id'] );
            $savings_text    = $this->get_savings_text( $regular_price, $offer_price, $entity['settings'] );
            $offer_highlight = $this->get_offer_highlight( $entity['settings'] );

            $offers[] = [
                'entity'             => $entity,
                'product'            => $product,
                'regular_price'      => $regular_price,
                'offer_price'        => $offer_price,
                'regular_price_html' => $this->format_price( $regular_price ),
                'price_html'         => $this->format_price( $offer_price ),
                'add_to_cart_url'    => $add_url,
                'headline'           => isset( $entity['settings']['headline'] ) ? (string) $entity['settings']['headline'] : '',
                'description'        => isset( $entity['settings']['description'] ) ? (string) $entity['settings']['description'] : '',
                'accept_button'      => isset( $entity['settings']['accept_button'] ) ? (string) $entity['settings']['accept_button'] : __( 'Add to cart', 'yayboost-sales-booster-for-woocommerce' ),
                'decline_button'     => isset( $entity['settings']['decline_button'] ) ? (string) $entity['settings']['decline_button'] : __( 'No, thanks', 'yayboost-sales-booster-for-woocommerce' ),
                'savings_text'       => $savings_text,
                'offer_highlight'    => $offer_highlight,
            ];
        } //end foreach

        if ( empty( $offers ) ) {
            return;
        }

        $this->output_html( $offers, $expires_at );
    }

    /**
     * Get offer price from product and entity settings
     *
     * @param \WC_Product $product  Product. // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
     * @param array       $settings Entity settings.
     * @return float
     */
    private function get_offer_price( $product, array $settings ): float {
        $regular_price = (float) $product->get_regular_price();
        if ( $regular_price <= 0 ) {
            $regular_price = (float) $product->get_price();
        }
        $pricing_type  = $settings['pricing_type'] ?? 'no_discount';
        $pricing_value = isset( $settings['pricing_value'] ) ? (float) $settings['pricing_value'] : 0;

        return Price::get_discounted_price( $regular_price, $pricing_type, $pricing_value );
    }

    /**
     * Format price for display
     *
     * @param float $price Price.
     * @return string
     */
    private function format_price( float $price ): string {
        return \wc_price( $price );
    }

    /**
     * Get savings label (e.g. "Save 20%", "Save $3") for display
     *
     * @param float $regular_price Regular price.
     * @param float $offer_price   Offer price.
     * @param array $settings      Entity settings (pricing_type, pricing_value).
     * @return string
     */
    private function get_savings_text( float $regular_price, float $offer_price, array $settings ): string {
        if ( $regular_price <= 0 || $offer_price >= $regular_price ) {
            return '';
        }
        $pricing_type  = $settings['pricing_type'] ?? 'no_discount';
        $pricing_value = isset( $settings['pricing_value'] ) ? (float) $settings['pricing_value'] : 0;

        if ( $pricing_type === 'percent' && $pricing_value > 0 ) {
            return sprintf(
                /* translators: %s: discount percentage */
                __( 'Save %s%%', 'yayboost-sales-booster-for-woocommerce' ),
                (string) round( $pricing_value )
            );
        }
        if ( $pricing_type === 'fixed_amount' && $pricing_value > 0 ) {
            $saved = min( $pricing_value, $regular_price - $offer_price );
            return sprintf(
                /* translators: %s: amount saved (formatted price) */
                __( 'Save %s', 'yayboost-sales-booster-for-woocommerce' ),
                \wc_price( $saved )
            );
        }
        if ( $pricing_type === 'free' ) {
            return __( '100% off', 'yayboost-sales-booster-for-woocommerce' );
        }
        $pct = $regular_price > 0 ? round( ( 1 - $offer_price / $regular_price ) * 100 ) : 0;
        return $pct > 0 ? sprintf( __( 'Save %s%%', 'yayboost-sales-booster-for-woocommerce' ), (string) $pct ) : '';
    }

    /**
     * Get offer highlight line (e.g. "20% OFF – Today only!")
     *
     * @param array $settings Entity settings.
     * @return string
     */
    private function get_offer_highlight( array $settings ): string {
        $pricing_type  = $settings['pricing_type'] ?? 'no_discount';
        $pricing_value = isset( $settings['pricing_value'] ) ? (float) $settings['pricing_value'] : 0;

        if ( $pricing_type === 'percent' && $pricing_value > 0 ) {
            return sprintf(
                /* translators: %s: discount percentage */
                __( '%s%% OFF – Today only!', 'yayboost-sales-booster-for-woocommerce' ),
                (string) round( $pricing_value )
            );
        }
        if ( $pricing_type === 'free' ) {
            return __( 'FREE – Today only!', 'yayboost-sales-booster-for-woocommerce' );
        }
        if ( $pricing_type === 'fixed_amount' || $pricing_type === 'fixed_price' ) {
            return __( 'Special offer – Today only!', 'yayboost-sales-booster-for-woocommerce' );
        }
        return '';
    }

    /**
     * Get entity IDs for offers the customer already accepted ("Add to My Order") for this order.
     * Those offers are hidden on subsequent thank you page views.
     *
     * @param \WC_Order $order Order. // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
     * @return int[]
     */
    private function get_used_offer_entity_ids( $order ): array {
        $used = $order->get_meta( '_yayboost_ppu_offer_used_entities' );
        if ( ! is_array( $used ) ) {
            return [];
        }
        return array_map( 'intval', $used );
    }

    /**
     * Get all product IDs (and variation IDs) present in the order.
     * Used to hide offers when "If product already in order: Hide this offer" is set.
     *
     * @param \WC_Order $order Order. // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
     * @return int[]
     */
    private function get_order_product_ids( $order ): array {
        $ids = [];
        foreach ( $order->get_items() as $item ) {
            if ( ! $item instanceof \WC_Order_Item_Product ) {
                continue;
            }
            $ids[]        = (int) $item->get_product_id();
            $variation_id = (int) $item->get_variation_id();
            if ( $variation_id > 0 ) {
                $ids[] = $variation_id;
            }
        }
        return array_values( array_unique( $ids ) );
    }

    /**
     * Build URL that adds this upsell to cart and redirects to cart
     *
     * @param int    $order_id  Order ID.
     * @param string $order_key Order key.
     * @param int    $entity_id Entity ID.
     * @return string
     */
    private function get_add_to_cart_url( int $order_id, string $order_key, int $entity_id ): string {
        return \add_query_arg(
            [
                'yayboost_ppu_add' => $entity_id,
                'oid'              => $order_id,
                'k'                => $order_key,
            ],
            \home_url( '/' )
        );
    }

    /**
     * Output thank you block HTML (layout matches admin preview)
     *
     * @param array $offers    Array of offer data.
     * @param int   $expires_at Unix timestamp when offer expires (0 = no expiry).
     * @return void
     */
    private function output_html( array $offers, int $expires_at = 0 ): void {
        $settings          = $this->feature->get_settings();
        $display           = $settings['display'] ?? [];
        $mode              = isset( $display['mode'] ) ? (string) $display['mode'] : 'all';
        $is_grid           = ( $mode === 'all' );
        $timing            = $settings['timing'] ?? [];
        $expires_in        = isset( $timing['expires_after'] ) ? max( 1, (int) $timing['expires_after'] ) : 10;
        $show_timer        = ! empty( $timing['show_countdown'] );
        $countdown_initial = '';
        if ( $show_timer && $expires_at > 0 ) {
            $remaining         = max( 0, $expires_at - time() );
            $countdown_initial = sprintf( '%02d:%02d', (int) floor( $remaining / 60 ), (int) ( $remaining % 60 ) );
        } elseif ( $show_timer ) {
            $countdown_initial = sprintf( '%02d:%02d', $expires_in, 0 );
        }

        wp_enqueue_style(
            'yayboost-post-purchase-upsells',
            YAYBOOST_URL . 'assets/css/post-purchase-upsells.css',
            [],
            defined( 'YAYBOOST_VERSION' ) ? YAYBOOST_VERSION : '1.0.0'
        );

        if ( $show_timer && ! empty( $offers ) ) {
            wp_enqueue_script(
                'yayboost-post-purchase-upsells',
                YAYBOOST_URL . 'assets/js/post-purchase-upsells.js',
                [],
                defined( 'YAYBOOST_VERSION' ) ? YAYBOOST_VERSION : '1.0.0',
                true
            );
        }
        ?>
        <div class="yayboost-post-purchase-upsells">
            <div class="yayboost-ppu-offers <?php echo $is_grid ? 'yayboost-ppu-offers--grid' : ''; ?>">
                <?php foreach ( $offers as $offer ) : ?>
                    <?php
                    $product  = $offer['product'];
                    $img_id   = $product->get_image_id();
                    $img_url  = $img_id ? \wp_get_attachment_image_url( $img_id, 'woocommerce_thumbnail' ) : \wc_placeholder_img_src( 'woocommerce_thumbnail' );
                    $headline = $offer['headline'];
                    if ( $headline !== '' && strpos( $headline, '⚡' ) === false && strpos( $headline, '&#9883;' ) === false ) {
                        $headline = '⚡ ' . $headline;
                    }
                    ?>
                    <div class="yayboost-ppu-offer yayboost-ppu-modal <?php echo $is_grid ? 'yayboost-ppu-offer--grid' : ''; ?>">
                        <div class="yayboost-ppu-offer-header">
                            <?php if ( $headline !== '' ) : ?>
                                <h4 class="yayboost-ppu-offer-headline"><?php echo esc_html( $headline ); ?></h4>
                            <?php endif; ?>
                            <?php if ( ! empty( $offer['description'] ) ) : ?>
                                <p class="yayboost-ppu-offer-desc"><?php echo esc_html( $offer['description'] ); ?></p>
                            <?php endif; ?>
                            <?php if ( ! empty( $offer['offer_highlight'] ) ) : ?>
                                <p class="yayboost-ppu-offer-highlight"><?php echo esc_html( $offer['offer_highlight'] ); ?></p>
                            <?php endif; ?>
                        </div>

                        <div class="yayboost-ppu-product-box">
                            <?php if ( $img_url ) : ?>
                                <div class="yayboost-ppu-offer-image">
                                    <img src="<?php echo esc_url( $img_url ); ?>" alt="<?php echo esc_attr( $product->get_name() ); ?>" loading="lazy" />
                                </div>
                            <?php endif; ?>
                            <div class="yayboost-ppu-product-details">
                                <div class="yayboost-ppu-offer-name"><?php echo esc_html( $product->get_name() ); ?></div>
                                <div class="yayboost-ppu-pricing">
                                    <?php if ( $offer['regular_price'] > $offer['offer_price'] ) : ?>
                                        <span class="yayboost-ppu-regular-price"><?php echo wp_kses_post( $offer['regular_price_html'] ); ?></span>
                                    <?php endif; ?>
                                    <span class="yayboost-ppu-offer-price"><?php echo wp_kses_post( $offer['price_html'] ); ?></span>
                                    <?php if ( $offer['savings_text'] !== '' ) : ?>
                                        <span class="yayboost-ppu-savings"><?php echo wp_kses_post( $offer['savings_text'] ); ?></span>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>

                        <?php if ( $show_timer ) : ?>
                            <p class="yayboost-ppu-timer" <?php echo $expires_at > 0 ? ' data-expires-at="' . (int) $expires_at . '"' : ' data-expires-minutes="' . (int) $expires_in . '"'; ?>>
                                <span class="yayboost-ppu-timer-icon" aria-hidden="true">🕐</span>
                                <span class="yayboost-ppu-timer-text"><?php echo esc_html( __( 'This offer expires in', 'yayboost-sales-booster-for-woocommerce' ) ); ?> <span class="yayboost-ppu-countdown"><?php echo esc_html( $countdown_initial ); ?></span></span>
                            </p>
                        <?php endif; ?>

                        <div class="yayboost-ppu-actions">
                            <a href="<?php echo esc_url( $offer['add_to_cart_url'] ); ?>" class="button yayboost-ppu-add-btn"><?php echo esc_html( $offer['accept_button'] ); ?></a>
                            <a href="<?php echo esc_url( \wc_get_page_permalink( 'shop' ) ); ?>" class="yayboost-ppu-decline"><?php echo esc_html( $offer['decline_button'] ); ?></a>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php
    }
}
