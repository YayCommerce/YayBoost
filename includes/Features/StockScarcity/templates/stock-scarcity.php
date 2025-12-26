<?php
if (empty($settings) || ! isset($settings['enabled']) || ! $settings['enabled']) {
    return;
}

if (! $current_product || ! $current_product->is_in_stock()) {
    return;
}

$urgent_threshold = $settings['urgent_threshold'] ?? '';
$show_alert_text = $settings['show_alert_text'] ?? false;
$show_progress_bar = $settings['show_progress_bar'] ?? false;
$default_message = $settings['default_message'] ?? '';
$urgent_message = $settings['urgent_message'] ?? '';
$fill_color = $settings['fill_color'] ?? '#E53935';
$background_color = $settings['background_color'] ?? '#EEEEEE';

$low_stock_threshold = $settings['low_stock_threshold'] ?? '';
$stock_quantity = $current_product->get_stock_quantity();
if ($stock_quantity === null || $stock_quantity <= 0 || $stock_quantity > $low_stock_threshold) {
    return;
}

// Check if urgent
$is_urgent = $stock_quantity <= $urgent_threshold;
$message = $is_urgent
    ? str_replace('{stock}', $stock_quantity, $urgent_message)
    : str_replace('{stock}', $stock_quantity, $default_message);

// Calculate progress
$progress = min(100, ($stock_quantity / $low_stock_threshold) * 100);

$use_fixed_number = $settings['fixed_stock_number']['is_enabled'] ?? false;
if ($use_fixed_number) {
    $fixed_stock_number = $settings['fixed_stock_number']['number'] ?? 0;

    if ($fixed_stock_number > 0) {
        // Calculate percentage SOLD, not remaining
        $sold = $fixed_stock_number - $stock_quantity;
        $progress = min(100, ($sold / $fixed_stock_number) * 100);
    }
}

?>

<div class="yayboost-stock-scarcity" style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
    <?php if ($show_alert_text) : ?>
        <div class="yayboost-stock-scarcity__message" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 14px; font-weight: 500; color: #111827;">
                <?php echo esc_html($message); ?>
            </span>
        </div>
    <?php endif; ?>

    <?php if ($show_progress_bar) : ?>
        <div class="yayboost-stock-scarcity__progress" style="display: flex; align-items: center; gap: 12px;">
            <div
                class="yayboost-stock-scarcity__progress-bar"
                style="
                    height: 8px;
                    min-width: 200px;
                    overflow: hidden;
                    border-radius: 9999px;
                    background-color: <?php echo esc_attr($background_color); ?>;
                ">
                <div
                    class="yayboost-stock-scarcity__progress-fill"
                    style="
                        height: 100%;
                        border-radius: 9999px;
                        background-color: <?php echo esc_attr($fill_color); ?>;
                        width: <?php echo esc_attr($progress); ?>%;
                        transition: width 0.3s ease;
                    ">
                </div>
            </div>
            <span style="font-size: 14px; color: #4b5563; white-space: nowrap; flex-shrink: 0;">
                <?php echo esc_html($stock_quantity); ?> left
            </span>
        </div>
    <?php endif; ?>
</div>