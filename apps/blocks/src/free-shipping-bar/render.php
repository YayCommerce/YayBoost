<?php
/**
 * Free Shipping Bar Block - Server-side render
 *
 * Supports both frontend (with Interactivity API) and editor preview (with mock data)
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block default content.
 * @var WP_Block $block      Block instance.
 *
 * @package YayBoost
 */

/**
 * Apply opacity to hex color
 *
 * @param string $hex Hex color code.
 * @param float  $opacity Opacity value (0-1).
 * @return string RGBA color string.
 */
function yayboost_apply_opacity( $hex, $opacity ) {
    $hex = ltrim( $hex, '#' );
    $r   = hexdec( substr( $hex, 0, 2 ) );
    $g   = hexdec( substr( $hex, 2, 2 ) );
    $b   = hexdec( substr( $hex, 4, 2 ) );
    return sprintf( 'rgba(%d, %d, %d, %.2f)', $r, $g, $b, $opacity );
}

// Get feature instance
$feature = null;
if ( class_exists( '\YayBoost\Features\FreeShippingBar\FreeShippingBarBlock' ) ) {
    $block_instance = \YayBoost\Features\FreeShippingBar\FreeShippingBarBlock::get_instance();
    $feature        = $block_instance->get_feature();
}

// If no feature or disabled, return empty
if ( ! $feature || ! $feature->is_enabled() ) {
    return '';
}

// Check if we're in the editor (admin context or REST API preview)
$is_editor = is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST );

if ( $is_editor ) {
    // Editor preview: use mock data
    $settings      = $feature->get_settings();
    $primary_color = $settings['primary_color'] ?? '#4CAF50';
    $display_style = $settings['display_style'] ?? 'minimal_text';

    // Mock preview data
    $mock_message = $settings['message_progress'] ?? __( 'Add {remaining} more for free shipping!', 'yayboost' );
    $mock_message = str_replace(
        [ '{remaining}', '{threshold}', '{current}' ],
        [ wc_price( 25 ), wc_price( 100 ), wc_price( 75 ) ],
        $mock_message
    );

    $mock_data = [
        'threshold'           => 100,
        'current'             => 75,
        'remaining'           => 25,
        'progress'            => 75,
        'achieved'            => false,
        'message'             => $mock_message,
        'show_coupon_message' => false,
    ];

    // Get HTML using feature's template system
    ob_start();
    ?>
    <div <?php echo get_block_wrapper_attributes( [ 'class' => 'yayboost-shipping-bar-block-wrapper yayboost-shipping-bar-block-wrapper--preview' ] ); ?>>
        <?php
        // Render based on display style
        if ( 'minimal_text' === $display_style ) {
            $bg_color   = yayboost_apply_opacity( $primary_color, 0.2 );
            $text_color = $primary_color;
            ?>
            <div class="yayboost-shipping-bar yayboost-shipping-bar--minimal-text" 
                 style="background-color: <?php echo esc_attr( $bg_color ); ?>; color: <?php echo esc_attr( $text_color ); ?>;">
                <div class="yayboost-shipping-bar__icon" style="color: <?php echo esc_attr( $text_color ); ?>;">🚚</div>
                <div class="yayboost-shipping-bar__message"><?php echo wp_kses_post( $mock_data['message'] ); ?></div>
            </div>
            <?php
        } elseif ( 'progress_bar' === $display_style ) {
            $bar_color        = $primary_color;
            $background_color = yayboost_apply_opacity( $primary_color, 0.2 );
            $text_color       = $primary_color;
            ?>
            <div class="yayboost-shipping-bar yayboost-shipping-bar--progress-bar" style="background:none">
                <div class="yayboost-shipping-bar__progress" style="background-color: <?php echo esc_attr( $background_color ); ?>;">
                    <div class="yayboost-shipping-bar__progress-fill" 
                         style="width: <?php echo esc_attr( $mock_data['progress'] ); ?>%; background-color: <?php echo esc_attr( $bar_color ); ?>;"></div>
                </div>
                <div class="yayboost-shipping-bar__message" style="color: <?php echo esc_attr( $text_color ); ?>; text-align: center;">
                    <?php echo wp_kses_post( $mock_data['message'] ); ?>
                </div>
            </div>
            <?php
        } elseif ( 'full_detail' === $display_style ) {
            $bar_color        = $primary_color;
            $background_color = yayboost_apply_opacity( $primary_color, 0.2 );
            $text_color       = $primary_color;
            $currency_symbol  = get_woocommerce_currency_symbol();
            ?>
            <div class="yayboost-shipping-bar yayboost-shipping-bar--full-detail">
                <div class="yayboost-shipping-bar__header">
                    <div class="yayboost-shipping-bar__header-left">
                        <div class="yayboost-shipping-bar__icon-circle" style="background-color: <?php echo esc_attr( $bar_color ); ?>;">
                            <span style="color: #ffffff;">🚚</span>
                        </div>
                        <div class="yayboost-shipping-bar__info">
                            <div class="yayboost-shipping-bar__title" style="color: <?php echo esc_attr( $text_color ); ?>;">Free Shipping</div>
                            <div class="yayboost-shipping-bar__subtitle" style="color: <?php echo esc_attr( $text_color ); ?>;">
                                On orders over <?php echo esc_html( $currency_symbol . number_format( $mock_data['threshold'], 2 ) ); ?>
                            </div>
                        </div>
                    </div>
                    <div class="yayboost-shipping-bar__header-right">
                        <div class="yayboost-shipping-bar__cart-total" style="color: <?php echo esc_attr( $text_color ); ?>;">
                            <?php echo esc_html( $currency_symbol . number_format( $mock_data['current'], 2 ) ); ?>
                        </div>
                        <div class="yayboost-shipping-bar__cart-label" style="color: <?php echo esc_attr( $text_color ); ?>;">Cart total</div>
                    </div>
                </div>
                <div class="yayboost-shipping-bar__progress-section">
                    <div class="yayboost-shipping-bar__progress" style="background-color: <?php echo esc_attr( $background_color ); ?>;">
                        <div class="yayboost-shipping-bar__progress-fill" 
                             style="width: <?php echo esc_attr( $mock_data['progress'] ); ?>%; background-color: <?php echo esc_attr( $bar_color ); ?>;"></div>
                    </div>
                    <div class="yayboost-shipping-bar__progress-icon" style="background-color: <?php echo esc_attr( $background_color ); ?>;">
                        <span style="color: #ffffff;">🎁</span>
                    </div>
                </div>
                <a class="yayboost-shipping-bar__cta" 
                   style="text-decoration: none; background-color: <?php echo esc_attr( $background_color ); ?>; color: <?php echo esc_attr( $text_color ); ?>;" 
                   href="#">
                    <?php echo wp_kses_post( $mock_data['message'] ); ?>
                </a>
            </div>
            <?php
        }
        ?>
    </div>
    <?php
    return ob_get_clean();
}

// Frontend: use real cart data
$bar_data = $feature->get_bar_data();

if ( ! $bar_data ) {
    return '';
}

// Get settings
$settings      = $feature->get_settings();
$primary_color = $settings['primary_color'] ?? '#4CAF50';

// Prepare context for Interactivity API
$context = [
    'threshold'    => $bar_data['threshold'],
    'current'      => $bar_data['current'],
    'remaining'    => $bar_data['remaining'],
    'progress'     => $bar_data['progress'],
    'achieved'     => $bar_data['achieved'],
    'message'      => $bar_data['message'],
    'primaryColor' => $primary_color,
];

// Get the bar HTML from feature (reuse existing templates)
$bar_html = $feature->get_bar_html();

if ( empty( $bar_html ) ) {
    return '';
}

?>
<div
    <?php echo get_block_wrapper_attributes( [ 'class' => 'yayboost-shipping-bar-block-wrapper' ] ); ?>
    data-wp-interactive="yayboost/shipping-bar"
    <?php echo wp_interactivity_data_wp_context( $context ); ?>
>
    <?php echo $bar_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
