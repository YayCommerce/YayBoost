<?php
/**
 * Live Visitor Count Renderer
 *
 * Handles content rendering and asset enqueuing for live visitor count display.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\LiveVisitorCount;

/**
 * Content rendering for live visitor count
 */
class LiveVisitorCountRenderer {

	/**
	 * Feature instance
	 *
	 * @var LiveVisitorCountFeature
	 */
	private $feature;

	/**
	 * Tracker instance
	 *
	 * @var LiveVisitorCountTracker
	 */
	private $tracker;

	/**
	 * Constructor
	 *
	 * @param LiveVisitorCountFeature $feature Feature instance.
	 * @param LiveVisitorCountTracker $tracker Tracker instance.
	 */
	public function __construct( LiveVisitorCountFeature $feature, LiveVisitorCountTracker $tracker ) {
		$this->feature = $feature;
		$this->tracker = $tracker;
	}

	/**
	 * Render visitor count content
	 *
	 * @return void
	 */
	public function render(): void {
		if ( ! $this->feature->should_apply_to_current_product() ) {
			return;
		}

		$this->enqueue_assets();
		echo wp_kses_post( $this->get_content() );
	}

	/**
	 * Get rendered HTML content
	 *
	 * @return string HTML content.
	 */
	public function get_content(): string {
		$tracking_mode         = $this->feature->get( 'tracking_mode' );
		$minimum_count_display = (int) ( $this->feature->get( 'real_tracking.minimum_count_display' ) ?? 1 );
		$style                 = $this->feature->get( 'style.style' ) ?? 'style_1';
		$text_color            = $this->feature->get( 'style.text_color' ) ?? '#a74c3c';
		$background_color      = $this->feature->get( 'style.background_color' ) ?? '#fff3f3';
		$display_text          = $this->feature->get( 'display.text' ) ?? '👁️ {count} visitors are viewing this page';
		$count                 = $this->tracker->get_visitor_count();

		$is_hidden = 'real-tracking' === $tracking_mode && $count < $minimum_count_display;
		$text      = str_replace( '{count}', $count, $display_text );

		return $this->render_style( $style, $text, $count, $display_text, $text_color, $background_color, $is_hidden );
	}

	/**
	 * Render content based on style
	 *
	 * @param string $style            Style name (style_1, style_2, style_3).
	 * @param string $text             Rendered text with count.
	 * @param int    $count            Visitor count.
	 * @param string $display_text     Original display text template.
	 * @param string $text_color       Text color hex.
	 * @param string $background_color Background color hex.
	 * @param bool   $is_hidden        Whether element should be hidden.
	 * @return string HTML content.
	 */
	private function render_style( string $style, string $text, int $count, string $display_text, string $text_color, string $background_color, bool $is_hidden ): string {
		$hidden_class = $is_hidden ? 'hidden' : '';
		$data_attrs   = 'data-text="' . esc_attr( $display_text ) . '" data-count="' . esc_attr( $count ) . '"';

		if ( 'style_2' === $style ) {
			return sprintf(
				'<div class="yayboost-lvc yayboost-lvc-style-2 %s" style="color: %s; background-color: %s;" %s>%s</div>',
				$hidden_class,
				esc_attr( $text_color ),
				esc_attr( $background_color ),
				$data_attrs,
				wp_kses_post( $text )
			);
		}

		if ( 'style_3' === $style ) {
			return sprintf(
				'<div class="yayboost-lvc yayboost-lvc-style-3 %s" %s><div class="yayboost-lvc-text" style="color: %s; background-color: %s;">%s</div><span id="yayboost-lvc-number">%s</span></div>',
				$hidden_class,
				$data_attrs,
				esc_attr( $text_color ),
				esc_attr( $background_color ),
				wp_kses_post( $text ),
				esc_html( $count )
			);
		}

		// Default: style_1
		return sprintf(
			'<div class="yayboost-lvc yayboost-lvc-style-1 %s" style="color: %s" %s>%s</div>',
			$hidden_class,
			esc_attr( $text_color ),
			$data_attrs,
			wp_kses_post( $text )
		);
	}

	/**
	 * Enqueue frontend assets
	 *
	 * @return void
	 */
	public function enqueue_assets(): void {
		$this->enqueue_styles();

		if ( 'real-tracking' === $this->feature->get( 'tracking_mode' ) ) {
			$this->enqueue_scripts();
		}
	}

	/**
	 * Enqueue CSS styles
	 *
	 * @return void
	 */
	private function enqueue_styles(): void {
		if ( wp_style_is( 'yayboost-live-visitor-count', 'enqueued' ) ) {
			return;
		}

		wp_enqueue_style(
			'yayboost-live-visitor-count',
			YAYBOOST_URL . 'assets/dist/blocks/live-visitor-count/style-index.css',
			array(),
			YAYBOOST_VERSION
		);
	}

	/**
	 * Enqueue JavaScript and localize data
	 *
	 * @return void
	 */
	private function enqueue_scripts(): void {
		if ( wp_script_is( 'yayboost-live-visitor-count', 'enqueued' ) ) {
			return;
		}

		wp_enqueue_script(
			'yayboost-live-visitor-count',
			YAYBOOST_URL . 'assets/dist/blocks/live-visitor-count/view.js',
			array( 'jquery' ),
			YAYBOOST_VERSION,
			true
		);

		$page_id = $this->tracker->get_current_page_id();
		if ( $page_id > 0 ) {
			wp_localize_script(
				'yayboost-live-visitor-count',
				'yayboostLiveVisitorCount',
				array(
					'ajaxUrl'             => admin_url( 'admin-ajax.php' ),
					'nonce'               => wp_create_nonce( LiveVisitorCountAjaxHandler::NONCE_ACTION ),
					'pageId'              => $page_id,
					'activeWindow'        => $this->feature->get( 'real_tracking.active_window' ),
					'minimumCountDisplay' => $this->feature->get( 'real_tracking.minimum_count_display' ),
				)
			);
		}
	}
}
