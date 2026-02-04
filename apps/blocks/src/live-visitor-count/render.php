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

defined( 'ABSPATH' ) || exit;

// Get feature instance from static method
$feature = null;
if ( isset( $block->block_type->provides_context['feature'] ) ) {
	$feature = $block->block_type->provides_context['feature'];
}

// If no feature or disabled, return empty
if ( ! $feature || ! $feature->is_enabled() ) {
	return '';
}

// Check if we're on a single product page
if ( ! function_exists( 'is_product' ) || ! is_product() ) {
	return '';
}

$renderer = $feature->get_renderer();

ob_start();
$renderer->render();
$content = ob_get_clean();

if ( empty( $content ) ) {
	return '';
}

?>
<div <?php echo get_block_wrapper_attributes( array( 'class' => 'yayboost-lvc-block-wrapper' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php echo wp_kses_post( $content ); ?>
</div>