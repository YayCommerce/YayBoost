<?php
/**
 * Live Visitor Count Block - Frontend Render
 * Only renders on single product pages
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block default content.
 * @var WP_Block $block      Block instance.
 *
 * @package YayBoost
 */

use YayBoost\Features\LiveVisitorCount\LiveVisitorCountBlock;

// Get feature instance from static method
$feature = LiveVisitorCountBlock::get_feature_instance();

// If no feature or disabled, return empty
if ( ! $feature || ! $feature->is_enabled() ) {
	return '';
}

// Check if we're on a single product page
if ( ! function_exists( 'is_product' ) || ! is_product() ) {
	return '';
}

$settings = $feature->get_settings();
if ( ! $feature->should_apply_to_current_product( $settings ) ) {
	return '';
}

// Get the content from feature (same as hook render)
$content = $feature->get_content();

if ( empty( $content ) ) {
	return '';
}

?>
<div <?php echo get_block_wrapper_attributes( array( 'class' => 'yayboost-live-visitor-count-block-wrapper' ) ); ?>>
	<?php echo wp_kses_post( $content ); ?>
</div>