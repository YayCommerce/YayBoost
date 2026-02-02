<?php
/**
 * FBT Products Template
 *
 * Displays frequently bought together products on single product page.
 * Structure matches sample: product images row + summary, then list with checkboxes.
 *
 * @var array $products   Array of WC_Product objects (related products)
 * @var int   $product_id Current product ID (main product on page)
 * @var array $settings   Feature settings
 *
 * @package YayBoost
 */

defined( 'ABSPATH' ) || exit;

$section_title    = $settings['section_title'] ?? __( 'Frequently Bought Together', 'yayboost' );
$main_product     = $product_id ? wc_get_product( $product_id ) : null;
$display_products = $main_product ? array_merge( [ $main_product ], $products ) : $products;

// SVG checkmark for checkbox (matches sample)
$svg_check = '<svg class="fbt-checkbox__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
?>

<section class="yayboost-fbt fbt-section" data-product-id="<?php echo esc_attr( $product_id ); ?>">
    <h2 class="yayboost-fbt__title fbt-section__title"><?php echo esc_html( $section_title ); ?></h2>

    <!-- Product images row (scrollable) + summary (fixed outside scroll) -->
    <div class="fbt-products yayboost-fbt__products">
        <div class="fbt-products-scroll">
            <?php foreach ( $display_products as $index => $product ) : ?>
                <?php
                $pid       = $product->get_id();
                $name      = $product->get_name();
                $img       = $product->get_image( 'woocommerce_thumbnail' );
                $permalink = $product->get_permalink();
                ?>
                <?php if ( $index > 0 ) : ?>
                    <span class="fbt-plus">+</span>
                <?php endif; ?>
                <div class="fbt-product-image">
                    <a href="<?php echo esc_url( $permalink ); ?>"><?php echo wp_kses_post( $img ); ?></a>
                </div>
            <?php endforeach; ?>
        </div>
        <div class="fbt-summary">
            <div class="fbt-summary__total-price">
                <p class="fbt-summary__total"><?php esc_html_e( 'Total price', 'yayboost' ); ?></p>
                <p class="fbt-summary__price yayboost-fbt__total-price"></p>
            </div>
            <button type="button" class="yayboost-fbt__add-btn fbt-add-btn">
                <?php esc_html_e( 'Add all to basket', 'yayboost' ); ?>
            </button>
        </div>
    </div>

    <!-- Product list with checkboxes -->
    <div class="fbt-list">
        <?php foreach ( $display_products as $index => $product ) : ?>
            <?php
            $pid       = $product->get_id();
            $name      = $product->get_name();
            $price     = (float) $product->get_price();
            $permalink = $product->get_permalink();
            $is_first  = ( $index === 0 );
            ?>
            <label for="fbt-product-<?php echo esc_attr( $pid ); ?>" class="yayboost-fbt__product fbt-item" data-product-id="<?php echo esc_attr( $pid ); ?>" data-price="<?php echo esc_attr( $price ); ?>">
                <div class="fbt-checkbox">
                    <input
                        type="checkbox"
                        name="fbt_products[]"
                        value="<?php echo esc_attr( $pid ); ?>"
                        id="fbt-product-<?php echo esc_attr( $pid ); ?>"
                        data-price="<?php echo esc_attr( $price ); ?>"
                        checked
                    >
                    <span class="fbt-checkbox__box"><?php echo $svg_check; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
                </div>
                <div class="fbt-item__content">
                    <p class="fbt-item__name">
                        <?php if ( $is_first ) : ?>
                            <span class="fbt-item__badge"><?php esc_html_e( 'This item:', 'yayboost' ); ?></span>
                        <?php endif; ?>
                        <a href="<?php echo esc_url( $permalink ); ?>"><?php echo esc_html( $name ); ?></a>
                    </p>
                    <span class="fbt-item__price"><?php echo wp_kses_post( $product->get_price_html() ); ?></span>
                </div>
            </label>
        <?php endforeach; ?>
    </div>
</section>
