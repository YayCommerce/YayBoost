<?php

namespace YayBoost\Utils;

class Localize {
    
    public static function get_data() {
        if (!class_exists('WooCommerce')) {
            return [
                'enabled' => false,
                'message' => __('WooCommerce is not active', 'yayboost'),
            ];
        }

        return [
            'enabled'    => true,
            'categories' => self::get_categories(),
            'tags'       => self::get_tags(),
            'products'   => self::get_products(),
            'attributes' => self::get_attributes(),
            'currency'   => self::get_currency_data(),
            'settings'   => self::get_wc_settings(),
        ];
    }

    private static function get_categories() {
        $categories = get_terms([
            'taxonomy'   => 'product_cat',
            'hide_empty' => false,
            'number'     => 200,
        ]);

        if (is_wp_error($categories)) {
            return [];
        }

        return array_map([self::class, 'format_term'], $categories);
    }

    private static function get_tags() {
        $tags = get_terms([
            'taxonomy'   => 'product_tag',
            'hide_empty' => false,
            'number'     => 200,
        ]);

        if (is_wp_error($tags)) {
            return [];
        }

        return array_map([self::class, 'format_term'], $tags);
    }

    private static function get_products() {
        $args = [
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => 200,
            'orderby'        => 'title',
            'order'          => 'ASC',
        ];

        $products = get_posts($args);

        if (empty($products)) {
            return [];
        }

        return array_map(function($product) {
            return [
                'id'    => $product->ID,
                'value' => (string)$product->ID,
                'label' => $product->post_title,
            ];
        }, $products);
    }

    private static function get_attributes() {
        $attributes = wc_get_attribute_taxonomies();
        
        $formatted = [];
        foreach ($attributes as $attribute) {
            $taxonomy = wc_attribute_taxonomy_name($attribute->attribute_name);
            $terms = get_terms([
                'taxonomy'   => $taxonomy,
                'hide_empty' => false,
            ]);

            if (!is_wp_error($terms)) {
                $formatted[] = [
                    'id'       => $attribute->attribute_id,
                    'name'     => $attribute->attribute_name,
                    'label'    => $attribute->attribute_label,
                    'taxonomy' => $taxonomy,
                    'terms'    => array_map([self::class, 'format_term'], $terms),
                ];
            }
        }

        return $formatted;
    }

    private static function get_currency_data() {
        return [
            'code'               => get_woocommerce_currency(),
            'symbol'             => get_woocommerce_currency_symbol(),
            'position'           => get_option('woocommerce_currency_pos'),
            'decimal_separator'  => wc_get_price_decimal_separator(),
            'thousand_separator' => wc_get_price_thousand_separator(),
            'decimals'          => wc_get_price_decimals(),
        ];
    }

    private static function get_wc_settings() {
        return [
            'shop_page_id'     => wc_get_page_id('shop'),
            'cart_page_id'     => wc_get_page_id('cart'),
            'checkout_page_id' => wc_get_page_id('checkout'),
            'myaccount_page_id'=> wc_get_page_id('myaccount'),
            'enable_reviews'   => get_option('woocommerce_enable_reviews'),
            'review_rating_required' => get_option('woocommerce_review_rating_required'),
        ];
    }

    private static function format_term($term) {
        return [
            'id'     => $term->term_id,
            'value'  => $term->slug,
            'label'  => $term->name,
            'count'  => $term->count ?? 0,
            'parent' => $term->parent ?? 0,
        ];
    }
}