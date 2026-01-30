<?php
/**
 * Code Generator Utility
 *
 * Generate short unique codes from numbers using hash algorithms.
 * Uses md5/sha256 (no bcmath/gmp required).
 *
 * @package YayBoost
 */

namespace YayBoost\Utils;

/**
 * Code generator class
 *
 * Usage:
 *   $generator = new CodeGenerator('salt', 8);
 *   $code = $generator->encode(12345);
 */
class CodeGenerator {
    /**
     * Salt for hashing
     *
     * @var string
     */
    private $salt;

    /**
     * Minimum output length
     *
     * @var int
     */
    private $min_length;

    /**
     * Custom alphabet (optional)
     *
     * @var string|null
     */
    private $alphabet;

    /**
     * Hash algorithm
     *
     * @var string
     */
    private $algorithm;

    /**
     * Constructor
     *
     * @param string $salt      Salt for hashing (default: '').
     * @param int    $min_length Minimum output length (default: 0).
     * @param string $alphabet  Custom alphabet (default: null, uses hex).
     * @param string $algorithm Hash algorithm: 'md5', 'sha256', 'sha1' (default: 'md5').
     */
    public function __construct( string $salt = '', int $min_length = 0, ?string $alphabet = null, string $algorithm = 'md5' ) {
        $this->salt       = $salt;
        $this->min_length = max( 0, $min_length );
        $this->alphabet   = $alphabet;
        $this->algorithm  = $algorithm;
    }

    /**
     * Encode numbers to short code
     *
     * @param int|string ...$numbers One or more numbers to encode.
     * @return string Encoded code.
     */
    public function encode( ...$numbers ): string {
        if ( empty( $numbers ) ) {
            return '';
        }

        // Combine all numbers into string
        $input = $this->salt . implode( '-', $numbers );

        // Generate hash
        $hash = hash( $this->algorithm, $input );

        // Extract code with minimum length
        $code = substr( $hash, 0, max( $this->min_length, 8 ) );

        // Apply custom alphabet if provided
        if ( $this->alphabet !== null && ! empty( $this->alphabet ) ) {
            $code = $this->map_to_alphabet( $code, $this->alphabet );
        } else {
            // Default: uppercase hex
            $code = strtoupper( $code );
        }

        return $code;
    }

    /**
     * Map hash characters to custom alphabet
     *
     * @param string $hash    Hash string.
     * @param string $alphabet Custom alphabet.
     * @return string Mapped code.
     */
    private function map_to_alphabet( string $hash, string $alphabet ): string {
        $alphabet_length = strlen( $alphabet );
        $hash_length     = strlen( $hash );
        $result          = '';

        // Convert each hex char to alphabet index
        for ( $i = 0; $i < $hash_length; $i++ ) {
            $hex_value = hexdec( $hash[ $i ] );
            $index     = $hex_value % $alphabet_length;
            $result   .= $alphabet[ $index ];
        }

        return $result;
    }
}
