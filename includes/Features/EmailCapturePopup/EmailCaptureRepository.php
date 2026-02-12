<?php
/**
 * Email Capture Repository
 *
 * @package YayBoost
 */

namespace YayBoost\Features\EmailCapturePopup;

defined( 'ABSPATH' ) || exit;

/**
 * Handles database operations for captured emails
 */
class EmailCaptureRepository {

    /**
     * Valid status values
     */
    const STATUS_PENDING         = 'pending';
    const STATUS_SENT            = 'sent';
    const STATUS_SKIPPED         = 'skipped';
    const STATUS_ACCOUNT_CREATED = 'account_created';
    const STATUS_FAILED          = 'failed';

    /**
     * Get table name
     *
     * @return string
     */
    protected static function get_table(): string {
        return EmailCaptureTable::get_table_name();
    }

    /**
     * Insert a new captured email
     *
     * @param array $data Keys: email, status, captured_at, scheduled_at, source, session_id.
     * @return int|false Inserted row ID or false on failure
     */
    public static function insert( array $data ) {
        global $wpdb;

        $insert_data = [
            'email'        => sanitize_email( $data['email'] ?? '' ),
            'status'       => self::sanitize_status( $data['status'] ?? self::STATUS_PENDING ),
            'captured_at'  => $data['captured_at'] ?? current_time( 'mysql' ),
            'scheduled_at' => $data['scheduled_at'] ?? current_time( 'mysql' ),
            'sent_at'      => $data['sent_at'] ?? null,
            'source'       => sanitize_text_field( $data['source'] ?? 'email_capture_popup' ),
            'session_id'   => isset( $data['session_id'] ) ? sanitize_text_field( (string) $data['session_id'] ) : null,
        ];

        $result = $wpdb->insert( self::get_table(), $insert_data );

        if ( $result === false ) {
            return false;
        }

        return (int) $wpdb->insert_id;
    }

    /**
     * Find pending row by email
     *
     * @param string $email
     * @return array|null
     */
    public static function find_pending_by_email( string $email ): ?array {
        global $wpdb;

        $table  = self::get_table();
        $result = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE email = %s AND status = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                $email,
                self::STATUS_PENDING
            ),
            ARRAY_A
        );

        return $result ? self::hydrate( $result ) : null;
    }

    /**
     * Update scheduled_at for a row
     *
     * @param int    $id
     * @param string $scheduled_at MySQL datetime
     * @return bool
     */
    public static function update_scheduled_at( int $id, string $scheduled_at ): bool {
        global $wpdb;

        $result = $wpdb->update(
            self::get_table(),
            [ 'scheduled_at' => $scheduled_at ],
            [ 'id' => $id ]
        );

        return $result !== false;
    }

    /**
     * Find row by ID
     *
     * @param int $id
     * @return array|null
     */
    public static function find_by_id( int $id ): ?array {
        global $wpdb;

        $table  = self::get_table();
        $result = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE id = %d LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                $id
            ),
            ARRAY_A
        );

        return $result ? self::hydrate( $result ) : null;
    }

    /**
     * Update status (and optionally sent_at)
     *
     * @param int         $id
     * @param string      $status
     * @param string|null $sent_at Optional MySQL datetime for sent_at
     * @return bool
     */
    public static function update_status( int $id, string $status, ?string $sent_at = null ): bool {
        global $wpdb;

        $update_data = [ 'status' => self::sanitize_status( $status ) ];

        if ( $sent_at !== null ) {
            $update_data['sent_at'] = $sent_at;
        }

        $result = $wpdb->update(
            self::get_table(),
            $update_data,
            [ 'id' => $id ]
        );

        return $result !== false;
    }

    /**
     * Get all captured emails with pagination and filters
     *
     * @param array $args Keys: status, orderby, order, limit, offset.
     * @return array
     */
    public static function get_all( array $args = [] ): array {
        global $wpdb;

        $defaults = [
            'status'  => null,
            'orderby' => 'captured_at',
            'order'   => 'DESC',
            'limit'   => 50,
            'offset'  => 0,
        ];

        $args = wp_parse_args( $args, $defaults );

        $table = self::get_table();
        $where = '1=1';

        if ( $args['status'] ) {
            $where .= $wpdb->prepare( ' AND status = %s', $args['status'] );
        }

        $allowed_orderby = [ 'id', 'email', 'status', 'captured_at', 'scheduled_at', 'sent_at' ];
        $orderby_col     = in_array( $args['orderby'], $allowed_orderby, true ) ? $args['orderby'] : 'captured_at';
        $order           = strtoupper( $args['order'] ) === 'ASC' ? 'ASC' : 'DESC';
        $limit           = max( 1, min( 500, (int) $args['limit'] ) );
        $offset          = max( 0, (int) $args['offset'] );

        $sql = "SELECT * FROM {$table} WHERE {$where} ORDER BY {$orderby_col} {$order} LIMIT %d OFFSET %d";

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $results = $wpdb->get_results( $wpdb->prepare( $sql, $limit, $offset ), ARRAY_A );

        return array_map( [ self::class, 'hydrate' ], $results ?: [] );
    }

    /**
     * Count rows (optionally filtered by status)
     *
     * @param string|null $status
     * @return int
     */
    public static function count( ?string $status = null ): int {
        global $wpdb;

        $table = self::get_table();
        $where = '1=1';

        if ( $status ) {
            $where .= $wpdb->prepare( ' AND status = %s', $status );
        }

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE {$where}" );
    }

    /**
     * Hydrate row data
     *
     * @param array $row
     * @return array
     */
    protected static function hydrate( array $row ): array {
        $row['id'] = (int) $row['id'];
        return $row;
    }

    /**
     * Sanitize status value
     *
     * @param string $status
     * @return string
     */
    protected static function sanitize_status( string $status ): string {
        $allowed = [
            self::STATUS_PENDING,
            self::STATUS_SENT,
            self::STATUS_SKIPPED,
            self::STATUS_ACCOUNT_CREATED,
            self::STATUS_FAILED,
        ];
        return in_array( $status, $allowed, true ) ? $status : self::STATUS_PENDING;
    }
}
