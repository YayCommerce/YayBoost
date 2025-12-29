<?php
/**
 * Frequently Bought Together Template
 *
 * This template is used to display frequently bought together products.
 *
 * @package YayBoost
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
    // Exit if accessed directly
}

// Prepare FBT products only (no current product)
$all_products = [];

// Add FBT products
foreach ( $fbt_products as $fbt_product ) {
    if ( $fbt_product && $fbt_product->is_purchasable() ) {
        $all_products[] = $fbt_product;
    }
}

if ( empty( $all_products ) ) {
    return;
}

/**
 * Ensure all images of FBT products are lazy loaded by increasing the
 * current media count to WordPress's lazy loading threshold if needed.
 * Because wp_increase_content_media_count() is a private function, we
 * check for its existence before use.
 */
if ( function_exists( 'wp_increase_content_media_count' ) ) {
    $content_media_count = wp_increase_content_media_count( 0 );
    if ( $content_media_count < wp_omit_loading_attr_threshold() ) {
        wp_increase_content_media_count( wp_omit_loading_attr_threshold() - $content_media_count );
    }
}

// Add FBT class filter once before loop
$fbt_class_filter = function ( $classes ) {
    $classes[] = 'yayboost-fbt-product-item';
    return $classes;
};
add_filter( 'post_class', $fbt_class_filter, 10, 1 );
?>

<section class="yayboost-fbt-container products related">
    <h2 class="yayboost-fbt-title"><?php echo esc_html( $section_title ); ?></h2>

    <div class="yayboost-fbt-products yayboost-fbt-layout-<?php echo esc_attr( $layout ); ?>">
        <?php

        woocommerce_product_loop_start();

        foreach ( $all_products as $product_obj ) :

            $post_object = get_post( $product_obj->get_id() );

            if ( ! $post_object ) {
                continue;
            }

            // Setup postdata like related.php
            setup_postdata( $GLOBALS['post'] = $post_object ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited, Squiz.PHP.DisallowMultipleAssignments.Found

            global $product, $post;
            $product = $product_obj;

            // Check if product is visible
            if ( ! is_a( $product, WC_Product::class ) || ! $product->is_visible() ) {
                continue;
            }

            wc_get_template_part( 'content', 'product' );

        endforeach;

        woocommerce_product_loop_end();

        remove_filter( 'post_class', $fbt_class_filter, 10 );
        ?>
    </div>

    <!-- FBT Footer with total and batch button -->
    <div class="yayboost-fbt-footer">
        <div class="yayboost-fbt-total">
            <?php esc_html_e( 'Total:', 'yayboost' ); ?> <span class="yayboost-fbt-total-price"><?php echo wc_price( 0 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
        </div>
        <button type="button" class="button yayboost-fbt-batch-add">
            <?php esc_html_e( 'Add Selected to Cart', 'yayboost' ); ?>
        </button>
    </div>
</section>

<?php
wp_reset_postdata();
?>
