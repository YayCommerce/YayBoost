<?php
/**
 * Product List Template
 *
 * Display recommended products in a list layout
 *
 * @package YayBoost
 */

defined( 'ABSPATH' ) || exit;

if ( empty( $products ) ) {
    return;
}
?>

<div class="yayboost-recommendations__list">
    <?php foreach ( $products as $product ) : ?>
        <?php
        $product_id = $product->get_id();
        $product_name = $product->get_name();
        $product_price = $product->get_price_html();
        $product_image = wp_get_attachment_image_src( $product->get_image_id(), 'woocommerce_gallery_thumbnail' );
        $product_url = $product->get_permalink();
        $add_to_cart_url = $product->add_to_cart_url();
        $add_to_cart_text = $product->add_to_cart_text();
        $is_purchasable = $product->is_purchasable();
        $short_description = $product->get_short_description();
        ?>
        
        <div class="yayboost-recommendations__list-item" data-product-id="<?php echo esc_attr( $product_id ); ?>">
            <div class="yayboost-recommendations__list-image">
                <a href="<?php echo esc_url( $product_url ); ?>">
                    <?php if ( $product_image ) : ?>
                        <img src="<?php echo esc_url( $product_image[0] ); ?>" 
                             alt="<?php echo esc_attr( $product_name ); ?>"
                             width="<?php echo esc_attr( $product_image[1] ); ?>"
                             height="<?php echo esc_attr( $product_image[2] ); ?>">
                    <?php else : ?>
                        <div class="yayboost-recommendations__no-image">
                            <?php esc_html_e( 'No image', 'yayboost' ); ?>
                        </div>
                    <?php endif; ?>
                </a>
            </div>

            <div class="yayboost-recommendations__list-content">
                <h4 class="yayboost-recommendations__list-title">
                    <a href="<?php echo esc_url( $product_url ); ?>">
                        <?php echo esc_html( $product_name ); ?>
                    </a>
                </h4>

                <div class="yayboost-recommendations__list-price">
                    <?php echo wp_kses_post( $product_price ); ?>
                </div>

                <?php if ( $product->get_rating_count() > 0 ) : ?>
                    <div class="yayboost-recommendations__list-rating">
                        <?php echo wp_kses_post( wc_get_rating_html( $product->get_average_rating() ) ); ?>
                    </div>
                <?php endif; ?>

                <?php if ( $short_description ) : ?>
                    <div class="yayboost-recommendations__list-description">
                        <?php echo wp_kses_post( wp_trim_words( $short_description, 15 ) ); ?>
                    </div>
                <?php endif; ?>
            </div>

            <div class="yayboost-recommendations__list-actions">
                <?php if ( $is_purchasable ) : ?>
                    <a href="<?php echo esc_url($add_to_cart_url); ?>"
                        data-quantity="1"
                        class="button product_type_<?php echo esc_attr($product->get_type()); ?> add_to_cart_button ajax_add_to_cart yayboost-recommendations__add-to-cart"
                        data-product_id="<?php echo esc_attr($product_id); ?>"
                        data-product_sku="<?php echo esc_attr($product->get_sku()); ?>"
                        aria-label="<?php echo esc_attr($product->add_to_cart_description()); ?>"
                        rel="nofollow">
                        <?php echo esc_html($add_to_cart_text); ?>
                    </a>
                <?php else : ?>
                    <a href="<?php echo esc_url( $product_url ); ?>" class="button">
                        <?php esc_html_e( 'View Product', 'yayboost' ); ?>
                    </a>
                <?php endif; ?>
            </div>
        </div>
    <?php endforeach; ?>
</div>
