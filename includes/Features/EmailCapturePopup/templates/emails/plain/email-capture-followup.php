<?php
/**
 * Email Capture Follow-up (Plain)
 *
 * @package YayBoost
 * @var \WC_Email $email
 * @var string $email_heading
 * @var string $email_content
 */

defined( 'ABSPATH' ) || exit;

echo "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\n";
echo esc_html( wp_strip_all_tags( $email_heading ) );
echo "\n=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\n\n";
?>

<?php if ( ! empty( $email_content ) ) : ?>
    <?php echo esc_html( wp_strip_all_tags( wptexturize( $email_content ) ) ); ?> 
    <?php
endif;
