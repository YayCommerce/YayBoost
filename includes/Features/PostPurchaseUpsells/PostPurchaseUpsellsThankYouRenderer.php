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

        $entities            = array_slice( $entities, 0, $max );
        $order_product_ids   = $this->get_order_product_ids( $order );
        $used_entity_ids     = $this->get_used_offer_entity_ids( $order );
        $offers              = [];

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
        $settings   = $this->feature->get_settings();
        $display    = $settings['display'] ?? [];
        $mode       = isset( $display['mode'] ) ? (string) $display['mode'] : 'all';
        $is_grid    = ( $mode === 'all' );
        $timing     = $settings['timing'] ?? [];
        $expires_in = isset( $timing['expires_after'] ) ? max( 1, (int) $timing['expires_after'] ) : 10;
        $show_timer = ! empty( $timing['show_countdown'] );

        $offers_style = $is_grid
            ? 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;'
            : 'display: grid; gap: 24px;';
        $card_style = $is_grid
            ? 'padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e9ecef;'
            : 'width: 60%; margin: 0 auto; padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e9ecef;';
        ?>
        <div class="yayboost-post-purchase-upsells" style="margin: 24px 0; padding: 0;">
            <?php if ( $is_grid ) : ?>
            <style type="text/css">
                .yayboost-ppu-offers.yayboost-ppu-offers--grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                @media (max-width: 992px) {
                    .yayboost-ppu-offers.yayboost-ppu-offers--grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 576px) {
                    .yayboost-ppu-offers.yayboost-ppu-offers--grid { grid-template-columns: 1fr; }
                }
            </style>
            <?php endif; ?>
            <div class="yayboost-ppu-offers <?php echo $is_grid ? 'yayboost-ppu-offers--grid' : ''; ?>" style="<?php echo esc_attr( $offers_style ); ?>">
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
                    <div class="yayboost-ppu-offer yayboost-ppu-modal <?php echo $is_grid ? 'yayboost-ppu-offer--grid' : ''; ?>" style="<?php echo esc_attr( $card_style ); ?>">
                        <div class="yayboost-ppu-offer-header" style="margin-bottom: 16px;text-align: center;">
                            <?php if ( $headline !== '' ) : ?>
                                <h4 class="yayboost-ppu-offer-headline" style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                                    <?php echo esc_html( $headline ); ?>
                                </h4>
                            <?php endif; ?>
                            <?php if ( ! empty( $offer['description'] ) ) : ?>
                                <p class="yayboost-ppu-offer-desc" style="margin: 0 0 6px 0; font-size: 14px; color: #4a4a4a; line-height: 1.5;">
                                    <?php echo esc_html( $offer['description'] ); ?>
                                </p>
                            <?php endif; ?>
                            <?php if ( ! empty( $offer['offer_highlight'] ) ) : ?>
                                <p class="yayboost-ppu-offer-highlight" style="margin: 0; font-size: 14px; color: #1a1a1a;">
                                    <?php echo esc_html( $offer['offer_highlight'] ); ?>
                                </p>
                            <?php endif; ?>
                        </div>

                        <div class="yayboost-ppu-product-box" style="display: flex; gap: 16px; padding: 16px; margin-bottom: 16px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px;">
                            <?php if ( $img_url ) : ?>
                                <div class="yayboost-ppu-offer-image" style="flex-shrink: 0; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; background: #fff;">
                                    <img src="<?php echo esc_url( $img_url ); ?>" alt="<?php echo esc_attr( $product->get_name() ); ?>" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" />
                                </div>
                            <?php endif; ?>
                            <div class="yayboost-ppu-product-details" style="flex: 1; min-width: 0;">
                                <div class="yayboost-ppu-offer-name" style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px;">
                                    <?php echo esc_html( $product->get_name() ); ?>
                                </div>
                                <div class="yayboost-ppu-pricing" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                    <?php if ( $offer['regular_price'] > $offer['offer_price'] ) : ?>
                                        <span class="yayboost-ppu-regular-price" style="font-size: 14px; color: #6c757d; text-decoration: line-through;">
                                            <?php echo wp_kses_post( $offer['regular_price_html'] ); ?>
                                        </span>
                                    <?php endif; ?>
                                    <span class="yayboost-ppu-offer-price" style="font-size: 18px; font-weight: 700; color: #1a1a1a;">
                                        <?php echo wp_kses_post( $offer['price_html'] ); ?>
                                    </span>
                                    <?php if ( $offer['savings_text'] !== '' ) : ?>
                                        <span class="yayboost-ppu-savings" style="font-size: 14px; color: #1a1a1a;">
                                            <?php echo wp_kses_post( $offer['savings_text'] ); ?>
                                        </span>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>

                        <?php if ( $show_timer ) : ?>
                            <p class="yayboost-ppu-timer" style="margin: 0 0 16px 0; font-size: 13px; color: #6c757d;text-align: center;" <?php echo $expires_at > 0 ? ' data-expires-at="' . (int) $expires_at . '"' : ' data-expires-minutes="' . (int) $expires_in . '"'; ?>>
                                <span style="display: inline-block; margin-right: 6px; vertical-align: middle;">🕐</span>
                                <span class="yayboost-ppu-timer-text"><?php echo esc_html( __( 'This offer expires in', 'yayboost-sales-booster-for-woocommerce' ) ); ?> <span class="yayboost-ppu-countdown">--:--</span></span>
                            </p>
                        <?php endif; ?>

                        <div class="yayboost-ppu-actions" style="display: flex; flex-direction: column; align-items: stretch; gap: 12px;">
                            <a href="<?php echo esc_url( $offer['add_to_cart_url'] ); ?>" class="button yayboost-ppu-add-btn" style="display: block; width: 100%; padding: 14px 20px; font-size: 16px; font-weight: 600; text-align: center; background: #2563eb; color: #fff; border: none; border-radius: 8px; text-decoration: none; box-sizing: border-box;">
                                <?php echo esc_html( $offer['accept_button'] ); ?>
                            </a>
                            <a href="<?php echo esc_url( \wc_get_page_permalink( 'shop' ) ); ?>" class="yayboost-ppu-decline" style="display: block; text-align: center; font-size: 14px; color: #4a4a4a; text-decoration: none;">
                                <?php echo esc_html( $offer['decline_button'] ); ?>
                            </a>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            <?php if ( $show_timer && ! empty( $offers ) ) : ?>
                <script>
                (function(){
                    var timers = document.querySelectorAll('.yayboost-ppu-timer[data-expires-at], .yayboost-ppu-timer[data-expires-minutes]');
                    function pad(n){ return n < 10 ? '0' + n : n; }
                    timers.forEach(function(el){
                        var endMs;
                        if (el.hasAttribute('data-expires-at')) {
                            endMs = parseInt(el.getAttribute('data-expires-at'), 10) * 1000;
                        } else {
                            var min = parseInt(el.getAttribute('data-expires-minutes'), 10) || 10;
                            endMs = Date.now() + min * 60 * 1000;
                        }
                        function tick(){
                            var left = Math.max(0, endMs - Date.now());
                            if (left <= 0) {
                                var txt = el.querySelector('.yayboost-ppu-timer-text');
                                if (txt) txt.textContent = '<?php echo esc_js( __( 'Offer expired', 'yayboost-sales-booster-for-woocommerce' ) ); ?>';
                                return;
                            }
                            var m = Math.floor(left / 60000);
                            var s = Math.floor((left % 60000) / 1000);
                            var countdown = el.querySelector('.yayboost-ppu-countdown');
                            if (countdown) countdown.textContent = pad(m) + ':' + pad(s);
                            setTimeout(tick, 1000);
                        }
                        tick();
                    });
                })();
                </script>
            <?php endif; ?>
        </div>
        <?php
    }
}
