<?php

defined( 'ABSPATH' ) || exit;

$plugins_allowed_tags = [
    'a'       => [
        'href'   => [],
        'title'  => [],
        'target' => [],
    ],
    'abbr'    => [ 'title' => [] ],
    'acronym' => [ 'title' => [] ],
    'code'    => [],
    'pre'     => [],
    'em'      => [],
    'strong'  => [],
    'ul'      => [],
    'ol'      => [],
    'li'      => [],
    'p'       => [],
    'br'      => [],
];

foreach ( (array) $recommended_plugins as $recommended_plugin ) {
    if ( is_object( $recommended_plugin ) ) {
        $recommended_plugin = (array) $recommended_plugin;
    }

        $plugin_title = wp_kses( $recommended_plugin['name'], $plugins_allowed_tags );

        // Remove any HTML from the description.
        $description = wp_strip_all_tags( $recommended_plugin['short_description'] );

        $name = wp_strip_all_tags( $plugin_title );

        $download_link = isset( $recommended_plugin['download_link'] ) ? $recommended_plugin['download_link'] : null;

        $compatible_php = true;
        $compatible_wp  = true;
        $tested_wp      = true;

        $action_links = [];

        $plugin_status = '<span class="plugin-status-not-install">Not installed</span>';

    if ( current_user_can( 'install_plugins' ) || current_user_can( 'update_plugins' ) ) {
        $plugin_pro_ver = $this->check_pro_version_exists( $recommended_plugin );
        if ( false === $plugin_pro_ver ) {
            if ( 'yaypricing' === $recommended_plugin['slug'] ) {
                $install_status = [
                    'status'  => 'install',
                    'url'     => $recommended_plugin['download_link'],
                    'version' => '',
                    'file'    => $plugin_pro_ver,
                ];
            } else {
                $install_status = \install_plugin_install_status( $recommended_plugin );
            }
        } else {
            $install_status = [
                'status'  => 'latest_installed',
                'url'     => false,
                'version' => '',
                'file'    => $plugin_pro_ver,
            ];
        }

        switch ( $install_status['status'] ) {
            case 'install':
                if ( $install_status['url'] ) {
                    if ( $compatible_php && $compatible_wp ) {
                        if ( 'yaymail' === $recommended_plugin['slug'] ) {
                            $action_links[] = sprintf(
                                '<a href="%s" target="_bank"><button class="button button-primary" data-install-url="%s" aria-label="%s">%s</button></a>',
                                esc_attr( $download_link ),
                                esc_attr( $download_link ),
                                /* translators: %s: Plugin name and version. */
                                esc_attr( sprintf( _x( 'Install %s now', 'plugin', 'yay-customer-reviews-woocommerce' ), $name ) ),
                                __( 'Install Now', 'yay-customer-reviews-woocommerce' )
                            );
                        } else {
                            $action_links[] = sprintf(
                                '<button class="install-now button button-primary" data-install-url="%s" aria-label="%s">%s</button>',
                                esc_attr( $download_link ),
                                /* translators: %s: Plugin name and version. */
                                esc_attr( sprintf( _x( 'Install %s now', 'plugin', 'yay-customer-reviews-woocommerce' ), $name ) ),
                                __( 'Install Now', 'yay-customer-reviews-woocommerce' )
                            );
                        }
                    } else {
                        $action_links[] = sprintf(
                            '<button type="button" class="button button-disabled" disabled="disabled">%s</button>',
                            _x( 'Cannot Install', 'plugin', 'yay-customer-reviews-woocommerce' )
                        );
                    }//end if
                }//end if
                $plugin_status = '<span class="plugin-status-not-install" data-plugin-url="' . esc_attr( $download_link ) . '">Not installed</span>';
                break;

            case 'update_available':
                if ( $install_status['url'] ) {
                    if ( $compatible_php && $compatible_wp ) {
                        if ( 'yaymail' === $recommended_plugin['slug'] ) {
                            $action_links[] = sprintf(
                                '<button class="button aria-button-if-js" data-plugin="%s" data-slug="%s" data-update-url="%s" aria-label="%s" data-name="%s">%s</button>',
                                esc_attr( $install_status['file'] ),
                                esc_attr( $recommended_plugin['slug'] ),
                                esc_url( $install_status['url'] ),
                                /* translators: %s: Plugin name and version. */
                                esc_attr( sprintf( _x( 'Update %s now', 'plugin', 'yay-customer-reviews-woocommerce' ), $name ) ),
                                esc_attr( $name ),
                                __( 'Update Now', 'yay-customer-reviews-woocommerce' )
                            );
                        } else {
                            $action_links[] = sprintf(
                                '<button class="update-now button aria-button-if-js" data-plugin="%s" data-slug="%s" data-update-url="%s" aria-label="%s" data-name="%s">%s</button>',
                                esc_attr( $install_status['file'] ),
                                esc_attr( $recommended_plugin['slug'] ),
                                esc_url( $install_status['url'] ),
                                /* translators: %s: Plugin name and version. */
                                esc_attr( sprintf( _x( 'Update %s now', 'plugin', 'yay-customer-reviews-woocommerce' ), $name ) ),
                                esc_attr( $name ),
                                __( 'Update Now', 'yay-customer-reviews-woocommerce' )
                            );
                        }//end if
                    } else {
                        $action_links[] = sprintf(
                            '<button type="button" class="button button-disabled" disabled="disabled">%s</button>',
                            _x( 'Cannot Update', 'plugin', 'yay-customer-reviews-woocommerce' )
                        );
                    }//end if
                }//end if
                if ( is_plugin_active( $install_status['file'] ) ) {
                    $plugin_status = '<span class="plugin-status-active">Active</span>';
                } else {
                    $plugin_status = '<span class="plugin-status-inactive" data-plugin-file="' . esc_attr( $install_status['file'] ) . '">Inactive</span>';
                }
                break;

            case 'latest_installed':
            case 'newer_installed':
                if ( is_plugin_active( $install_status['file'] ) ) {
                    $plugin_status  = '<span class="plugin-status-active">Active</span>';
                    $action_links[] = sprintf(
                        '<button type="button" class="button button-disabled" disabled="disabled">%s</button>',
                        _x( 'Activated', 'plugin', 'yay-customer-reviews-woocommerce' )
                    );
                } elseif ( current_user_can( 'activate_plugin', $install_status['file'] ) ) {
                    $plugin_status = '<span class="plugin-status-inactive" data-plugin-file="' . esc_attr( $install_status['file'] ) . '">Inactive</span>';
                    if ( $compatible_php && $compatible_wp ) {
                        $button_text = __( 'Activate', 'yay-customer-reviews-woocommerce' );
                        /* translators: %s: Plugin name. */
                        $button_label = _x( 'Activate %s', 'plugin', 'yay-customer-reviews-woocommerce' );
                        $activate_url = add_query_arg(
                            [
                                '_wpnonce' => wp_create_nonce( 'activate-plugin_' . $install_status['file'] ),
                                'action'   => 'activate',
                                'plugin'   => $install_status['file'],
                            ],
                            network_admin_url( 'plugins.php' )
                        );

                        if ( is_network_admin() ) {
                            $button_text = __( 'Network Activate', 'yay-customer-reviews-woocommerce' );
                            /* translators: %s: Plugin name. */
                            $button_label = _x( 'Network Activate %s', 'plugin', 'yay-customer-reviews-woocommerce' );
                            $activate_url = add_query_arg( [ 'networkwide' => 1 ], $activate_url );
                        }

                        $action_links[] = sprintf(
                            '<button class="button activate-now" data-plugin-file="%1$s" aria-label="%2$s">%3$s</button>',
                            esc_attr( $install_status['file'] ),
                            esc_attr( sprintf( $button_label, $recommended_plugin['name'] ) ),
                            $button_text
                        );
                    } else {
                        $action_links[] = sprintf(
                            '<button type="button" class="button button-disabled" disabled="disabled">%s</button>',
                            _x( 'Cannot Activate', 'plugin', 'yay-customer-reviews-woocommerce' )
                        );
                    }//end if
                } else {
                    $action_links[] = sprintf(
                        '<button type="button" class="button button-disabled" disabled="disabled">%s</button>',
                        _x( 'Installed', 'plugin', 'yay-customer-reviews-woocommerce' )
                    );
                }//end if
                break;
        }//end switch
    }//end if

        $details_link = self_admin_url(
            'plugin-install.php?tab=plugin-information&amp;plugin=' . $recommended_plugin['slug'] .
            '&amp;TB_iframe=true&amp;width=600&amp;height=550'
        );

        $plugin_icon_url = $recommended_plugin['icon'];

        /**
         * Filters the install action links for a plugin.
         *
         * @since 2.7.0
         *
         * @param string[] $action_links An array of plugin action links. Defaults are links to Details and Install Now.
         * @param array    $plugin       The plugin currently being listed.
         */
        $action_links = apply_filters( 'plugin_install_action_links', $action_links, $recommended_plugin );

    ?>
    <div class="plugin-card plugin-card-<?php echo sanitize_html_class( $recommended_plugin['slug'] ); ?>">
        <?php
        if ( ! $compatible_php || ! $compatible_wp ) {
            echo '<div class="notice inline notice-error notice-alt"><p>';
            if ( ! $compatible_php && ! $compatible_wp ) {
                echo esc_html__( 'This plugin doesn&#8217;t work with your versions of WordPress and PHP.', 'yay-customer-reviews-woocommerce' );
                if ( current_user_can( 'update_core' ) && current_user_can( 'update_php' ) ) {
                    printf(
                        /* translators: 1: URL to WordPress Updates screen, 2: URL to Update PHP page. */
                        ' ' . esc_html__( '<a href="%1$s">Please update WordPress</a>, and then <a href="%2$s">learn more about updating PHP</a>.', 'yay-customer-reviews-woocommerce' ),
                        esc_url( self_admin_url( 'update-core.php' ) ),
                        esc_url( wp_get_update_php_url() )
                    );
                    wp_update_php_annotation( '</p><p><em>', '</em>' );
                } elseif ( current_user_can( 'update_core' ) ) {
                    printf(
                        /* translators: %s: URL to WordPress Updates screen. */
                        ' ' . esc_html__( '<a href="%s">Please update WordPress</a>.', 'yay-customer-reviews-woocommerce' ),
                        esc_url( self_admin_url( 'update-core.php' ) )
                    );
                } elseif ( current_user_can( 'update_php' ) ) {
                    printf(
                        /* translators: %s: URL to Update PHP page. */
                        ' ' . esc_html__( '<a href="%s">Learn more about updating PHP</a>.', 'yay-customer-reviews-woocommerce' ),
                        esc_url( wp_get_update_php_url() )
                    );
                    wp_update_php_annotation( '</p><p><em>', '</em>' );
                }//end if
            } elseif ( ! $compatible_wp ) {
                echo esc_html__( 'This plugin doesn&#8217;t work with your version of WordPress.', 'yay-customer-reviews-woocommerce' );
                if ( current_user_can( 'update_core' ) ) {
                    printf(
                        /* translators: %s: URL to WordPress Updates screen. */
                        ' ' . esc_html__( '<a href="%s">Please update WordPress</a>.', 'yay-customer-reviews-woocommerce' ),
                        esc_url( self_admin_url( 'update-core.php' ) )
                    );
                }
            } elseif ( ! $compatible_php ) {
                echo esc_html__( 'This plugin doesn&#8217;t work with your version of PHP.', 'yay-customer-reviews-woocommerce' );
                if ( current_user_can( 'update_php' ) ) {
                    printf(
                        /* translators: %s: URL to Update PHP page. */
                        ' ' . esc_html__( '<a href="%s">Learn more about updating PHP</a>.', 'yay-customer-reviews-woocommerce' ),
                        esc_url( wp_get_update_php_url() )
                    );
                    wp_update_php_annotation( '</p><p><em>', '</em>' );
                }
            }//end if
            echo '</p></div>';
        }//end if
        ?>
        <div class="plugin-card-top">
            <div class="name column-name">
                <h3>
                    <a href="<?php echo esc_url( $details_link ); ?>" class="thickbox open-plugin-details-modal">
                    <?php echo wp_kses_post( $plugin_title ); ?>
                    <?php
					/* @codingStandardsIgnoreStart */
					 ?>
					<img src="<?php echo esc_url( $plugin_icon_url ); ?>" class="plugin-icon" alt="" />
					<?php /* @codingStandardsIgnoreEnd */ ?>
                    </a>
                </h3>
            </div>
            <div class="desc column-description">
                <p><?php echo wp_kses_post( $description ); ?></p>
            </div>
        </div>
        <div class="plugin-card-bottom">
            <div class="vers column-rating">
                <?php printf( '<span class="plugin-status" >%s: %s</span>', esc_html( 'Status' ), wp_kses_post( $plugin_status ) ); ?>
            </div>
            <div class="column-updated">
                <?php
                if ( $action_links ) {
                    echo '<ul class="plugin-action-buttons"><li>' . wp_kses_post( implode( '</li><li>', $action_links ) ) . '</li></ul>';
                }
                ?>
            </div>
        </div>
    </div>
<?php }//end foreach
?>
