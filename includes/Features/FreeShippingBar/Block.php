<?php
/**
 * Free Shipping Bar Gutenberg Block
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FreeShippingBar;

use YayBoost\Register\RegisterDev;

/**
 * Register Gutenberg block for Free Shipping Bar
 */
class Block {
    /**
     * Feature instance
     *
     * @var FreeShippingBarFeature|null
     */
    protected static $feature_instance = null;

    /**
     * Initialize block registration
     *
     * @param FreeShippingBarFeature|null $feature Feature instance
     * @return void
     */
    public static function init(FreeShippingBarFeature $feature = null): void {
        if ($feature) {
            self::$feature_instance = $feature;
        }
        add_action( 'init', [ __CLASS__, 'register_block' ] );
    }

    /**
     * Register the block
     *
     * @return void
     */
    public static function register_block(): void {
        // Check if dev mode
        $is_dev = defined( 'YAYBOOST_DEV' ) && YAYBOOST_DEV;

        if ($is_dev) {
            // Dev mode: load from Vite dev server
            $script_url = 'http://localhost:3000/blocks/free-shipping-bar/index.tsx';

            // Register empty script handle for block registration
            wp_register_script(
                'yayboost-free-shipping-bar-block',
                '',
                [ 'wp-blocks', 'wp-element', 'wp-i18n', 'wp-block-editor' ],
                YAYBOOST_VERSION,
                true
            );

            // Load block script in admin_footer after React Refresh (priority 10 > 5)
            // React Refresh is already rendered by RegisterDev, so we only need to load the module
            add_action(
                'admin_footer',
                function () use ($script_url) {
                    RegisterDev::render_vite_module( $script_url );
                },
                10
            );
        } else {
            // Production: load from built assets
            wp_register_script(
                'yayboost-free-shipping-bar-block',
                YAYBOOST_URL . 'assets/dist/blocks/free-shipping-bar/block.js',
                [ 'wp-blocks', 'wp-element', 'wp-i18n', 'wp-block-editor' ],
                YAYBOOST_VERSION,
                true
            );
        }//end if

        // Register block type
        register_block_type(
            'yayboost/free-shipping-bar',
            [
                'editor_script'   => 'yayboost-free-shipping-bar-block',
                'render_callback' => [ __CLASS__, 'render_block' ],
            ]
        );
    }

    /**
     * Server-side render callback
     *
     * @param array $attributes Block attributes
     * @return string
     */
    public static function render_block(array $attributes): string {
        // Get feature instance
        $feature = self::$feature_instance;

        if ( ! $feature || ! $feature->is_enabled()) {
            return '';
        }

        // Get bar data
        $data = $feature->get_bar_data();

        if ( ! $data) {
            return '';
        }

        $achieved_class = $data['achieved'] ? ' yayboost-shipping-bar--achieved' : '';
        $align_class    = ! empty( $attributes['align'] ) ? ' align' . $attributes['align'] : '';
        $class_name     = ! empty( $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

        ob_start();
        ?>
        <div class="yayboost-shipping-bar<?php echo esc_attr( $achieved_class . $align_class . $class_name ); ?>">
            <div class="yayboost-shipping-bar__message">
                <?php echo wp_kses_post( $data['message'] ); ?>
            </div>
            <?php if ( ! $data['achieved']) : ?>
                <div class="yayboost-shipping-bar__progress">
                    <div
                        class="yayboost-shipping-bar__progress-fill"
                        style="width: <?php echo esc_attr( $data['progress'] ); ?>%"
                    ></div>
                </div>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }
}