<?php
/**
 * Smart Recommendations Block - Server-side render
 * Frontend only (editor preview is handled in edit.js)
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block default content.
 * @var WP_Block $block      Block instance.
 *
 * @package YayBoost
 */

// Get feature instance from block context
$feature = null;
if ( isset( $block->block_type->provides_context['feature'] ) ) {
	$feature = $block->block_type->provides_context['feature'];
}

// If no feature or disabled, return empty
if ( ! $feature || ! $feature->is_enabled() ) {
    return '';
}

// Get current product
global $product;
if ( ! $product || ! $product instanceof \WC_Product ) {
    return '';
}

$current_product = $product;

// Get matching rules for current product
$matching_rules = $feature->get_matching_rules( $current_product );

if ( empty( $matching_rules ) ) {
    return '';
}

// Start output buffering
ob_start();

// Render each matching rule
foreach ( $matching_rules as $rule ) {
    $settings = $rule['settings'] ?? [];
    
    // Check if rule is active
    if ( ( $rule['status'] ?? 'active' ) !== 'active' ) {
        continue;
    }

    // Get recommended products for this rule
    $recommended_products = $feature->get_recommended_products( $rule, $current_product );

    if ( ! empty( $recommended_products ) ) {
        // Render recommendation section using feature's method
        $feature->render_recommendation_section( $rule, $recommended_products );
    }
}

$recommendations_html = ob_get_clean();

// If no recommendations were rendered, return empty
if ( empty( trim( $recommendations_html ) ) ) {
    return '';
}

?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'yayboost-recommendations-block-wrapper' ] ); ?>>
    <?php echo $recommendations_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>

