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

use YayBoost\Features\PurchaseActivityCount\PurchaseActivityCountBlock;

// Get feature instance from static method
$feature = PurchaseActivityCountBlock::get_feature_instance();

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

// Get the content: use product from block context when inside product-template, else current product
if ( $is_product_block_context ) {
	$content = $feature->get_content_for_product( $context_post_id );
} else {
	if ( ! $feature->should_apply_to_current_product() ) {
		return '';
	}
	$content = $feature->get_content();
}

if ( empty( $content ) ) {
	return '';
}

?>
<div <?php echo get_block_wrapper_attributes(); ?>>
	<?php echo wp_kses_post( $content ); ?>
</div>