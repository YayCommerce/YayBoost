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

    <div class="yayboost-fbt__products yayboost-fbt__products--<?php echo esc_attr( $layout ); ?>">
        <?php foreach ( $products as $product ) : ?>
            <?php
            $product_id    = $product->get_id();
            $product_name  = $product->get_name();
            $product_price = $product->get_price();
            $product_image = $product->get_image( 'woocommerce_thumbnail' );
            $product_link  = $product->get_permalink();
            ?>
            <div class="yayboost-fbt__product" data-product-id="<?php echo esc_attr( $product_id ); ?>" data-price="<?php echo esc_attr( $product_price ); ?>">
                <div class="yayboost-fbt__checkbox">
                    <input
                        type="checkbox"
                        name="fbt_products[]"
                        value="<?php echo esc_attr( $product_id ); ?>"
                        id="fbt-product-<?php echo esc_attr( $product_id ); ?>"
                        checked
                    >
                </div>

                <div class="yayboost-fbt__image">
                    <a href="<?php echo esc_url( $product_link ); ?>">
                        <?php echo wp_kses_post( $product_image ); ?>
                    </a>
                </div>

                <div class="yayboost-fbt__info">
                    <label for="fbt-product-<?php echo esc_attr( $product_id ); ?>" class="yayboost-fbt__name">
                        <a href="<?php echo esc_url( $product_link ); ?>">
                            <?php echo esc_html( $product_name ); ?>
                        </a>
                    </label>
                    <span class="yayboost-fbt__price">
                        <?php echo wp_kses_post( $product->get_price_html() ); ?>
                    </span>
                </div>
            </div>
        <?php endforeach; ?>
    </div>

    <div class="yayboost-fbt__footer">
        <div class="yayboost-fbt__total">
            <span class="yayboost-fbt__total-label"><?php esc_html_e( 'Total:', 'yayboost' ); ?></span>
            <span class="yayboost-fbt__total-price"></span>
        </div>
        <button type="button" class="yayboost-fbt__add-btn button alt">
            <?php esc_html_e( 'Add Selected to Cart', 'yayboost' ); ?>
        </button>
    </div>
</div>
