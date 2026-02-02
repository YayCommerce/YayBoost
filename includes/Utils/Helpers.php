<?php

namespace YayBoost\Utils;

/**
 * Helpers class
 */
class Helpers {

    /**
     * Format number to pretty display format
     *
     * @param int $number The number to format.
     * @return string Formatted number string.
     */
    public static function format_pretty_number( int $number ): string {
        // Less than 100: return as is
        if ( $number < 100 ) {
            return (string) $number;
        }

        // 100 to 999: round down to nearest 100 (100+, 200+, etc.)
        if ( $number < 1000 ) {
            $rounded = floor( $number / 100 ) * 100;
            return $rounded . '+';
        }

        // 1000 to 9999: round down to nearest 1000 (1k+, 2k+, etc.)
        if ( $number < 10000 ) {
            $rounded = floor( $number / 1000 );
            return $rounded . 'k+';
        }

        // 10000 to 999999: round down to nearest 1000 (10k+, 11k+, 20k+, etc.)
        if ( $number < 1000000 ) {
            $rounded = floor( $number / 1000 );
            return $rounded . 'k+';
        }

        // 1000000 and above: round down to nearest million (1M+, 2M+, etc.)
        $rounded = floor( $number / 1000000 );
        return $rounded . 'M+';
    }
}
