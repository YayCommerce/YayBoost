<?php
/**
 * FBT Renderer
 *
 * Handles rendering of FBT sections on product pages.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

/**
 * Handles FBT rendering logic
 */
class FBTRenderer {
    /**
     * FBT Repository instance
     *
     * @var FBTRepository
     */
    protected FBTRepository $repository;

    /**
     * Flag to track if currently rendering FBT section
     *
     * @var bool
     */
    protected static bool $is_rendering_fbt = false;

    /**
     * Constructor
     *
     * @param FBTRepository $repository FBT Repository instance
     */
    public function __construct( FBTRepository $repository ) {
        $this->repository = $repository;
    }

    /**
     * Render FBT section for a product
     *
     * @param int   $product_id Product ID
     * @param array $settings Feature settings
     * @return void
     */
    public function render( int $product_id, array $settings ): void {
        if ( ! $this->should_display( $product_id ) ) {
            return;
        }

        $products = $this->repository->get_recommendations(
            $product_id,
            $settings['max_products'] ?? 4,
            $settings
        );

        if ( empty( $products ) ) {
            return;
        }

        $this->render_template( $product_id, $products, $settings );
    }

    /**
     * Check if FBT section should be displayed
     *
     * @param int $product_id Product ID
     * @return bool
     */
    protected function should_display( int $product_id ): bool {
        $product = wc_get_product( $product_id );
        if ( ! $product || ! $product->is_purchasable() ) {
            return false;
        }

        return true;
    }

    /**
     * Render template
     *
     * @param int   $current_product_id Current product ID
     * @param array $fbt_products FBT products
     * @param array $settings Settings
     * @return void
     */
    protected function render_template( int $current_product_id, array $fbt_products, array $settings ): void {
        $section_title = $settings['section_title'] ?? __( 'Frequently Bought Together', 'yayboost' );
        $layout        = $settings['layout'] ?? 'grid';
        $max_products  = $settings['max_products'] ?? 4;

        $template_path = YAYBOOST_PATH . 'includes/views/features/frequently-bought-together/template.php';

        if ( ! file_exists( $template_path ) ) {
            return;
        }

        // Set flag to indicate we're rendering FBT section
        self::$is_rendering_fbt = true;

        include $template_path;

        // Reset flag after rendering
        self::$is_rendering_fbt = false;
    }

    /**
     * Render FBT checkbox via WooCommerce hook
     *
     * @return void
     */
    public function render_fbt_checkbox(): void {
        global $product;

        if ( ! $product || ! self::$is_rendering_fbt ) {
            return;
        }

        ?>
        <div>
            <label class="yayboost-fbt-checkbox-label">
                <input type="checkbox"
                        class="yayboost-fbt-selectable"
                        checked
                        data-product-id="<?php echo esc_attr( $product->get_id() ); ?>"
                        data-price="<?php echo esc_attr( $product->get_price() ); ?>">
                <span><?php echo esc_html( $product->get_name() ); ?></span>
            </label>
        </div>
        <?php
    }

    /**
     * Check if currently rendering FBT section
     *
     * @return bool
     */
    public static function is_rendering(): bool {
        return self::$is_rendering_fbt;
    }
}
