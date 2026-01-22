<?php
/**
 * FBT Products Template
 *
 * Displays frequently bought together products on single product page.
 *
 * @var array $products   Array of WC_Product objects
 * @var int   $product_id Current product ID
 * @var array $settings   Feature settings
 *
 * @package YayBoost
 */

defined( 'ABSPATH' ) || exit;

$layout = $settings['layout'] ?? 'grid';
$title  = $settings['section_title'] ?? __( 'Frequently Bought Together', 'yayboost' );
?>

<div class="yayboost-fbt" data-product-id="<?php echo esc_attr( $product_id ); ?>">
    <h2 class="yayboost-fbt__title"><?php echo esc_html( $title ); ?></h2>

    <!-- Top Section: Product Images with Summary -->
    <div class="yayboost-fbt__images-section">
        <button type="button" class="yayboost-fbt__info-icon" aria-label="<?php esc_attr_e( 'Information', 'yayboost' ); ?>">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 12H7V7h2v5zm0-6H7V4h2v2z" fill="currentColor"/>
            </svg>
        </button>
        
        <div class="yayboost-fbt__images-scroll">
            <?php
            $product_count = count( $products );
            $index = 0;
            foreach ( $products as $product ) :
                $fbt_product_id = $product->get_id();
                $product_image = $product->get_image( 'woocommerce_thumbnail' );
                $product_link  = $product->get_permalink();
                ?>
                <div class="yayboost-fbt__image-item">
                    <a href="<?php echo esc_url( $product_link ); ?>">
                        <?php echo wp_kses_post( $product_image ); ?>
                    </a>
                </div>
                <?php if ( $index < $product_count - 1 ) : ?>
                    <span class="yayboost-fbt__image-separator">+</span>
                <?php endif; ?>
                <?php
                $index++;
            endforeach;
            ?>
        </div>

        <div class="yayboost-fbt__summary">
            <div class="yayboost-fbt__total">
                <span class="yayboost-fbt__total-label"><?php esc_html_e( 'Total price:', 'yayboost' ); ?></span>
                <span class="yayboost-fbt__total-price"></span>
            </div>
            <button type="button" class="yayboost-fbt__add-btn yayboost-fbt__add-btn--summary button alt wp-block-button__link wp-element-button">
                <?php esc_html_e( 'Add all to Basket', 'yayboost' ); ?>
            </button>
        </div>
    </div>

    <!-- Middle Section: Information Message -->
    <div class="yayboost-fbt__message">
        <svg class="yayboost-fbt__message-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.1"/>
            <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 12H7V7h2v5zm0-6H7V4h2v2z" fill="currentColor"/>
        </svg>
        <span class="yayboost-fbt__message-text">
            <?php esc_html_e( 'These items are dispatched from and sold by different sellers.', 'yayboost' ); ?>
        </span>
        <a href="#" class="yayboost-fbt__message-link"><?php esc_html_e( 'Show details', 'yayboost' ); ?></a>
    </div>

    <!-- Bottom Section: Product List with Checkboxes -->
    <div class="yayboost-fbt__products-list">
        <?php foreach ( $products as $product ) : ?>
            <?php
            $fbt_product_id = $product->get_id();
            $product_name  = $product->get_name();
            $product_price = $product->get_price();
            $product_link  = $product->get_permalink();
            $is_current    = ( $fbt_product_id == $product_id );
            $product_class = 'yayboost-fbt__product';
            if ( $is_current ) {
                $product_class .= ' yayboost-fbt__product--current';
            }
            ?>
            <label for="fbt-product-<?php echo esc_attr( $fbt_product_id ); ?>" class="<?php echo esc_attr( $product_class ); ?>" data-product-id="<?php echo esc_attr( $fbt_product_id ); ?>" data-price="<?php echo esc_attr( $product_price ); ?>">
                <div class="yayboost-fbt__checkbox">
                    <input
                        type="checkbox"
                        name="fbt_products[]"
                        value="<?php echo esc_attr( $fbt_product_id ); ?>"
                        id="fbt-product-<?php echo esc_attr( $fbt_product_id ); ?>"
                        checked
                    >
                </div>

                <div class="yayboost-fbt__info">
                    <h3 class="yayboost-fbt__name">
                        <?php if ( $is_current ) : ?>
                            <span class="yayboost-fbt__current-label"><?php esc_html_e( 'This item:', 'yayboost' ); ?></span>
                        <?php endif; ?>
                        <a href="<?php echo esc_url( $product_link ); ?>">
                            <?php echo esc_html( $product_name ); ?>
                        </a>
                    </h3>
                    <span class="yayboost-fbt__price">
                        <?php echo wp_kses_post( $product->get_price_html() ); ?>
                    </span>
                </div>
            </label>
        <?php endforeach; ?>
    </div>

    <!-- Footer: Total Price and Add to Cart Button -->
    <div class="yayboost-fbt__footer">
        <div class="yayboost-fbt__total">
            <span class="yayboost-fbt__total-label"><?php esc_html_e( 'Total:', 'yayboost' ); ?></span>
            <span class="yayboost-fbt__total-price"></span>
        </div>
        <button type="button" class="yayboost-fbt__add-btn button alt wp-block-button__link wp-element-button">
            <?php esc_html_e( 'Add Selected to Cart', 'yayboost' ); ?>
        </button>
    </div>
</div>
