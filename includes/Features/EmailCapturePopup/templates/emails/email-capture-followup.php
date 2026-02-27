<?php
/**
 * Email Capture Follow-up (HTML)
 *
 * @package YayBoost
 * @var \WC_Email $email
 * @var string $email_heading
 * @var string $email_content
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_email_header', $email_heading, $email );
?>

<?php if ( ! empty( $email_content ) ) : ?>
    <?php echo wp_kses_post( wpautop( wptexturize( $email_content ) ) ); ?> 
<?php endif; ?>

<?php if ( ! empty( $additional_content ) ) : ?>
    <?php echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) ); ?>
<?php endif; ?>

<?php
do_action( 'woocommerce_email_footer', $email );
