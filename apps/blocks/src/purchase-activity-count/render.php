<?php
/**
 * Purchase Activity Count Block - Frontend Render
 * Only renders on product or category pages
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block default content.
 * @var WP_Block $block      Block instance.
 *
 * @package YayBoost
 */

defined( 'ABSPATH' ) || exit;

// Get feature instance
$feature = null;
if ( isset( $block->block_type->provides_context['feature'] ) ) {
	$feature = $block->block_type->provides_context['feature'];
}

// If no feature or disabled, return empty
if ( ! $feature || ! $feature->is_enabled() ) {
	return '';
}

// Product context: from block (inside product-template) or from single product page
$context_post_id   = isset( $block->context['postId'] ) ? (int) $block->context['postId'] : 0;
$context_post_type = isset( $block->context['postType'] ) ? $block->context['postType'] : '';
$is_product_block_context = ( $context_post_type === 'product' && $context_post_id > 0 );
$is_single_product = function_exists( 'is_product' ) && is_product();

if ( ! $is_single_product && ! $is_product_block_context ) {
	return '';
}

$renderer = $feature->get_renderer();

ob_start();
$renderer->render( $is_product_block_context ? $context_post_id : null );
$content = ob_get_clean();

if ( empty( $content ) ) {
	return '';
}

?>
<div <?php echo get_block_wrapper_attributes(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php echo wp_kses_post( $content ); ?>
</div>