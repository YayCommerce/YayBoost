<?php
/**
 * Price Utility
 *
 * @package YayBoost
 */

namespace YayBoost\Utils;

defined( 'ABSPATH' ) || exit;

/**
 * Price utility class
 */
class Price {
    public static function get_discounted_price( $regular_price, $pricing_type, $pricing_value ) {
        $price = $regular_price;
        if ( $pricing_type === 'percent' ) {
            $price = $regular_price * ( 1 - $pricing_value / 100 );
        } elseif ( $pricing_type === 'fixed_amount' ) {
            $price = max( 0, $regular_price - $pricing_value );
        } elseif ( $pricing_type === 'fixed_price' ) {
            $price = $pricing_value;
        } elseif ( $pricing_type === 'free' ) {
            $price = 0;
        }

        return (float) $price;
    }
}
