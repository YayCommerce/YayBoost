<?php
/**
 * Smart Recommendations Feature
 *
 * Stream music and manage playlists for your workspace..
 *
 * @package YayBoost
 */

namespace YayBoost\Features\SmartRecommendations;

use YayBoost\Features\AbstractFeature;

/**
 * Free Shipping Bar feature implementation
 */
class SmartRecommendationsFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'smart_recommendations';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Smart Recommendations';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Manage your product recommendation rules';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'product_discovery';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'record';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 100;

     /**
     * Feature status
     *
     * @var string
     */
    protected $status = 'coming_soon';

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        // Display bar based on position setting
        $settings = $this->get_settings();
        $position = $settings['position'] ?? 'top';

        // Hook into appropriate locations based on show_on setting
        $show_on = $settings['show_on'] ?? [ 'cart', 'checkout' ];

        if (in_array( 'cart', $show_on, true )) {
            add_action( 'woocommerce_before_cart', [ $this, 'render_bar' ] );
        }

        if (in_array( 'checkout', $show_on, true )) {
            add_action( 'woocommerce_before_checkout_form', [ $this, 'render_bar' ] );
        }

        if (in_array( 'mini_cart', $show_on, true )) {
            add_action( 'woocommerce_before_mini_cart', [ $this, 'render_bar' ] );
        }

        // Enqueue styles
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );

        // AJAX endpoint for dynamic updates
        add_action( 'wp_ajax_yayboost_get_shipping_bar', [ $this, 'ajax_get_bar_data' ] );
        add_action( 'wp_ajax_nopriv_yayboost_get_shipping_bar', [ $this, 'ajax_get_bar_data' ] );
    }

    /**
     * Enqueue frontend assets
     *
     * @return void
     */
    public function enqueue_assets(): void {
        if ( ! is_cart() && ! is_checkout()) {
            return;
        }

        $settings = $this->get_settings();

        // Inline styles for the bar
        $custom_css = $this->generate_custom_css( $settings );
        wp_add_inline_style( 'yayboost-frontend', $custom_css );
    }

    /**
     * Generate custom CSS based on settings
     *
     * @param array $settings
     * @return string
     */
    protected function generate_custom_css(array $settings): string {
        $bar_color  = $settings['bar_color'] ?? '#4CAF50';
        $bg_color   = $settings['background_color'] ?? '#e0e0e0';
        $text_color = $settings['text_color'] ?? '#333333';

        return "
            .yayboost-shipping-bar {
                background: {$bg_color};
                color: {$text_color};
                padding: 15px 20px;
                margin-bottom: 20px;
                border-radius: 8px;
            }
            .yayboost-shipping-bar__progress {
                background: {$bg_color};
                border-radius: 10px;
                height: 10px;
                margin-top: 10px;
                overflow: hidden;
            }
            .yayboost-shipping-bar__progress-fill {
                background: {$bar_color};
                height: 100%;
                border-radius: 10px;
                transition: width 0.3s ease;
            }
            .yayboost-shipping-bar--achieved {
                background: {$bar_color};
                color: #ffffff;
            }
        ";
    }

    /**
     * Render the shipping bar
     *
     * @return void
     */
    public function render_bar(): void {
        $data = $this->get_bar_data();

        if ( ! $data) {
            return;
        }

        $settings       = $this->get_settings();
        $achieved_class = $data['achieved'] ? ' yayboost-shipping-bar--achieved' : '';
        ?>
        <div class="yayboost-shipping-bar<?php echo esc_attr( $achieved_class ); ?>">
            <div class="yayboost-shipping-bar__message">
                <?php echo wp_kses_post( $data['message'] ); ?>
            </div>
            <?php if ( ! $data['achieved']) : ?>
                <div class="yayboost-shipping-bar__progress">
                    <div
                        class="yayboost-shipping-bar__progress-fill"
                        style="width: <?php echo esc_attr( $data['progress'] ); ?>%"
                    ></div>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Get bar data based on cart contents
     *
     * @return array|null
     */
    protected function get_bar_data(): ?array {
        if ( ! WC()->cart) {
            return null;
        }

        $settings   = $this->get_settings();
        $threshold  = (float) ($settings['threshold'] ?? 50);
        $cart_total = (float) WC()->cart->get_subtotal();

        $remaining = $threshold - $cart_total;
        $achieved  = $remaining <= 0;
        $progress  = $threshold > 0 ? min( 100, ($cart_total / $threshold) * 100 ) : 100;

        // Get appropriate message
        if ($achieved) {
            $message = $settings['message_achieved'] ?? __( 'You have free shipping!', 'yayboost' );
        } else {
            $message = $settings['message_progress'] ?? __( 'Add {remaining} more for free shipping!', 'yayboost' );
            $message = str_replace( '{remaining}', wc_price( $remaining ), $message );
            $message = str_replace( '{threshold}', wc_price( $threshold ), $message );
            $message = str_replace( '{current}', wc_price( $cart_total ), $message );
        }

        return [
            'threshold' => $threshold,
            'current'   => $cart_total,
            'remaining' => max( 0, $remaining ),
            'progress'  => round( $progress, 2 ),
            'achieved'  => $achieved,
            'message'   => $message,
        ];
    }

    /**
     * AJAX handler to get bar data
     *
     * @return void
     */
    public function ajax_get_bar_data(): void {
        $data = $this->get_bar_data();
        wp_send_json_success( $data );
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
                'threshold'         => 50,
                'message_progress'  => __( 'Add {remaining} more for free shipping!', 'yayboost' ),
                'message_achieved'  => __( '🎉 Congratulations! You have free shipping!', 'yayboost' ),
                'bar_color'         => '#4CAF50',
                'background_color'  => '#e8f5e9',
                'text_color'        => '#2e7d32',
                'position'          => 'top',
                'show_on'           => [ 'cart', 'checkout' ],
                'show_progress_bar' => true,
            ]
        );
    }
}
