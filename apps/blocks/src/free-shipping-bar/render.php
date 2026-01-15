<?php
/**
 * Free Shipping Bar Block - Server-side render
 * Frontend only (editor preview is handled in edit.js)
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block default content.
 * @var WP_Block $block      Block instance.
 *
 * @package YayBoost
 */

// Get feature instance
$feature = null;
if ( isset( $block->block_type->provides_context['feature'] ) ) {
	$feature = $block->block_type->provides_context['feature'];
}

// If no feature or disabled, return empty
if ( ! $feature || ! $feature->is_enabled() ) {
    return '';
}

// Frontend: use real cart data
$bar_data = $feature->get_bar_data();

if ( ! $bar_data ) {
    return '';
}

// Get the bar HTML from feature (reuse existing templates)
$bar_html = $feature->get_bar_html( $bar_data );

if ( empty( $bar_html ) ) {
    return '';
}

// Get localization data for Interactivity API state
$localization_data = $feature->get_localization_data();

// Set global state for the store (hydrates view.js state)
wp_interactivity_state(
	'yayboost/free-shipping-bar',
	[
		'settings'      => $localization_data['settings'] ?? [],
		'thresholdInfo' => $localization_data['thresholdInfo'] ?? [],
		'templates'     => $localization_data['templates'] ?? [],
		'appliedCoupons' => $localization_data['appliedCoupons'] ?? [],
	]
);

wp_enqueue_script( 'wc-accounting' );

// Prepare context for Interactivity API (per-block instance data)
$context = [
    'threshold'    => $bar_data['threshold'],
    'current'      => $bar_data['current'],
    'remaining'    => $bar_data['remaining'],
    'progress'     => $bar_data['progress'],
    'achieved'     => $bar_data['achieved'],
    'message'      => $bar_data['message'],
    'primaryColor' => $bar_data['primary_color'] ?? '#4CAF50',
];

?>
<div
    <?php echo get_block_wrapper_attributes( [ 'class' => 'yayboost-shipping-bar-block-wrapper' ] ); ?>
    data-wp-interactive="yayboost/free-shipping-bar"
    data-wp-init="callbacks.init"
	data-wp-watch="callbacks.watchCartUpdates"
    <?php echo wp_interactivity_data_wp_context( $context ); ?>
>
    <div class="yayboost-shipping-bar-content">
        <?php echo $bar_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
    </div>
</div>
