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
    $settings = $feature->get_settings();

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

    // Use feature's HTML builder with mock data
    $bar_html = $feature->get_bar_html( $mock_data );

    if ( empty( $bar_html ) ) {
        return '';
    }

    ?>
    <div <?php echo get_block_wrapper_attributes( [ 'class' => 'yayboost-shipping-bar-block-wrapper yayboost-shipping-bar-block-wrapper--preview' ] ); ?>>
        <?php echo wp_kses_post( $bar_html ); ?>
    </div>
    <?php
    return;
}

// Frontend: use real cart data
$bar_data = $feature->get_bar_data();

if ( ! $bar_data ) {
    return '';
}

// Get settings
$settings      = $feature->get_settings();
$primary_color = $settings['primary_color'] ?? '#4CAF50';

// Get the bar HTML from feature (reuse existing templates)
$bar_html = $feature->get_bar_html();

if ( empty( $bar_html ) ) {
    return '';
}

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

?>
<div
    <?php echo get_block_wrapper_attributes( [ 'class' => 'yayboost-shipping-bar-block-wrapper' ] ); ?>
    data-wp-interactive="yayboost/shipping-bar"
    data-wp-init="callbacks.init"
    <?php echo wp_interactivity_data_wp_context( $context ); ?>
>
    <div class="yayboost-shipping-bar-content">
        <?php echo $bar_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
    </div>
</div>
