<?php
/**
 * Product Grid Template
 *
 * Display recommended products in a grid layout
 *
 * @package YayBoost
 */

defined( 'ABSPATH' ) || exit;

if ( empty( $products ) ) {
    return;
}
?>

<div class="yayboost-recommendations__grid">
    <?php foreach ( $products as $product ) : ?>
        <?php
        $product_id = $product->get_id();
        $product_name = $product->get_name();
        $product_price = $product->get_price_html();
        $product_image = wp_get_attachment_image_src( $product->get_image_id(), 'woocommerce_thumbnail' );
        $product_url = $product->get_permalink();
        $add_to_cart_url = $product->add_to_cart_url();
        $add_to_cart_text = $product->add_to_cart_text();
        $is_purchasable = $product->is_purchasable();
        ?>
        
        <div class="yayboost-recommendations__item" data-product-id="<?php echo esc_attr( $product_id ); ?>">
            <div class="yayboost-recommendations__item-image">
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

            <div class="yayboost-recommendations__item-content">
                <h4 class="yayboost-recommendations__item-title">
                    <a href="<?php echo esc_url( $product_url ); ?>">
                        <?php echo esc_html( $product_name ); ?>
                    </a>
                </h4>

                <div class="yayboost-recommendations__item-price">
                    <?php echo wp_kses_post( $product_price ); ?>
                </div>

                <?php if ( $product->get_rating_count() > 0 ) : ?>
                    <div class="yayboost-recommendations__item-rating">
                        <?php echo wp_kses_post( wc_get_rating_html( $product->get_average_rating() ) ); ?>
                    </div>
                <?php endif; ?>

                <div class="yayboost-recommendations__item-actions">
                    <?php if ( $is_purchasable ) : ?>
                        <button type="button" 
                                class="yayboost-recommendations__add-to-cart button alt"
                                data-product-id="<?php echo esc_attr( $product_id ); ?>"
                                data-product-type="<?php echo esc_attr( $product->get_type() ); ?>">
                            <?php echo esc_html( $add_to_cart_text ); ?>
                        </button>
                    <?php else : ?>
                        <a href="<?php echo esc_url( $product_url ); ?>" class="button">
                            <?php esc_html_e( 'View Product', 'yayboost' ); ?>
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
</div>
