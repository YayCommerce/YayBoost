<?php
/**
 * Recommendation Section Template
 *
 * Main container for displaying product recommendations
 *
 * @package YayBoost
 */

defined( 'ABSPATH' ) || exit;

if ( empty( $products ) || empty( $section_title ) ) {
    return;
}

$container_class = 'yayboost-recommendations';
$layout_class = 'yayboost-recommendations--' . esc_attr( $layout );
?>

<div class="<?php echo esc_attr( $container_class . ' ' . $layout_class ); ?>" data-rule-id="<?php echo esc_attr( $rule['id'] ?? '' ); ?>">
    <div class="yayboost-recommendations__header">
        <h3 class="yayboost-recommendations__title"><?php echo esc_html( $section_title ); ?></h3>
    </div>

    <div class="yayboost-recommendations__content">
        <?php if ( $layout === 'grid' ) : ?>
            <?php include plugin_dir_path( __FILE__ ) . 'product-grid.php'; ?>
        <?php else : ?>
            <?php include plugin_dir_path( __FILE__ ) . 'product-list.php'; ?>
        <?php endif; ?>
    </div>

    <div class="yayboost-recommendations__loading" style="display: none;">
        <div class="yayboost-recommendations__spinner"></div>
        <p><?php esc_html_e( 'Updating recommendations...', 'yayboost' ); ?></p>
    </div>
</div>
