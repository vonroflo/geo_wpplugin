<?php
/**
 * WordPress admin integration for GEO Optimizer.
 *
 * - Settings page (API URL, toggles).
 * - Post / page metabox for on-demand analysis.
 * - Auto-analysis on save_post when enabled.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class GEO_Admin {

    /** @var GEO_API_Client */
    private $api;

    public function __construct( GEO_API_Client $api ) {
        $this->api = $api;

        // Settings page.
        add_action( 'admin_menu', array( $this, 'add_menu_page' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );

        // Post metabox.
        add_action( 'add_meta_boxes', array( $this, 'add_meta_box' ) );

        // Auto-analyze on save.
        add_action( 'save_post', array( $this, 'on_save_post' ), 20, 2 );

        // Admin styles.
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );

        // AJAX handler for manual analysis.
        add_action( 'wp_ajax_geo_optimizer_analyze', array( $this, 'ajax_analyze' ) );
    }

    /* ==================================================================
       Settings Page
       ================================================================== */

    public function add_menu_page() {
        add_options_page(
            __( 'GEO Optimizer', 'geo-optimizer' ),
            __( 'GEO Optimizer', 'geo-optimizer' ),
            'manage_options',
            'geo-optimizer',
            array( $this, 'render_settings_page' )
        );
    }

    public function register_settings() {
        register_setting( 'geo_optimizer', 'geo_optimizer_settings', array(
            'type'              => 'array',
            'sanitize_callback' => array( $this, 'sanitize_settings' ),
        ) );

        add_settings_section(
            'geo_optimizer_main',
            __( 'General Settings', 'geo-optimizer' ),
            null,
            'geo-optimizer'
        );

        add_settings_field( 'api_url', __( 'API Endpoint', 'geo-optimizer' ), array( $this, 'field_api_url' ), 'geo-optimizer', 'geo_optimizer_main' );
        add_settings_field( 'auto_analyze', __( 'Auto-Analyze', 'geo-optimizer' ), array( $this, 'field_auto_analyze' ), 'geo-optimizer', 'geo_optimizer_main' );
        add_settings_field( 'auto_schema', __( 'Auto-Inject Schema', 'geo-optimizer' ), array( $this, 'field_auto_schema' ), 'geo-optimizer', 'geo_optimizer_main' );
    }

    public function sanitize_settings( $input ) {
        $sanitized = array();
        $sanitized['api_url']      = isset( $input['api_url'] ) ? esc_url_raw( $input['api_url'] ) : GEO_OPTIMIZER_DEFAULT_API;
        $sanitized['auto_analyze'] = ! empty( $input['auto_analyze'] );
        $sanitized['auto_schema']  = ! empty( $input['auto_schema'] );
        return $sanitized;
    }

    public function field_api_url() {
        $settings = get_option( 'geo_optimizer_settings', array() );
        $value    = isset( $settings['api_url'] ) ? $settings['api_url'] : GEO_OPTIMIZER_DEFAULT_API;
        echo '<input type="url" name="geo_optimizer_settings[api_url]" value="' . esc_attr( $value ) . '" class="regular-text" />';
        echo '<p class="description">' . esc_html__( 'Backend API URL. Change only if self-hosting.', 'geo-optimizer' ) . '</p>';
    }

    public function field_auto_analyze() {
        $settings = get_option( 'geo_optimizer_settings', array() );
        $checked  = isset( $settings['auto_analyze'] ) ? $settings['auto_analyze'] : true;
        echo '<label><input type="checkbox" name="geo_optimizer_settings[auto_analyze]" value="1" ' . checked( $checked, true, false ) . ' /> ';
        echo esc_html__( 'Automatically analyze posts when published or updated.', 'geo-optimizer' ) . '</label>';
    }

    public function field_auto_schema() {
        $settings = get_option( 'geo_optimizer_settings', array() );
        $checked  = isset( $settings['auto_schema'] ) ? $settings['auto_schema'] : true;
        echo '<label><input type="checkbox" name="geo_optimizer_settings[auto_schema]" value="1" ' . checked( $checked, true, false ) . ' /> ';
        echo esc_html__( 'Automatically inject generated schema markup into page head.', 'geo-optimizer' ) . '</label>';
    }

    public function render_settings_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        // Test API connection.
        $health      = $this->api->health();
        $is_connected = ! is_wp_error( $health ) && isset( $health['status'] ) && 'ok' === $health['status'];
        ?>
        <div class="wrap geo-optimizer-settings">
            <h1><?php esc_html_e( 'GEO Optimizer Settings', 'geo-optimizer' ); ?></h1>

            <div class="geo-optimizer-status <?php echo $is_connected ? 'geo-optimizer-status--ok' : 'geo-optimizer-status--error'; ?>">
                <?php if ( $is_connected ) : ?>
                    <strong><?php esc_html_e( 'Connected', 'geo-optimizer' ); ?></strong> &mdash;
                    <?php echo esc_html( sprintf( __( 'API v%s is reachable.', 'geo-optimizer' ), isset( $health['version'] ) ? $health['version'] : '?' ) ); ?>
                <?php else : ?>
                    <strong><?php esc_html_e( 'Not connected', 'geo-optimizer' ); ?></strong> &mdash;
                    <?php echo esc_html( is_wp_error( $health ) ? $health->get_error_message() : __( 'Could not reach the API.', 'geo-optimizer' ) ); ?>
                <?php endif; ?>
            </div>

            <form method="post" action="options.php">
                <?php
                settings_fields( 'geo_optimizer' );
                do_settings_sections( 'geo-optimizer' );
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    /* ==================================================================
       Admin Assets
       ================================================================== */

    public function enqueue_admin_assets( $hook ) {
        if ( 'settings_page_geo-optimizer' === $hook || 'post.php' === $hook || 'post-new.php' === $hook ) {
            wp_enqueue_style(
                'geo-optimizer-admin',
                GEO_OPTIMIZER_PLUGIN_URL . 'assets/css/admin.css',
                array(),
                GEO_OPTIMIZER_VERSION
            );
        }

        if ( 'post.php' === $hook || 'post-new.php' === $hook ) {
            wp_enqueue_script(
                'geo-optimizer-admin',
                '', // inline only
                array( 'jquery' ),
                GEO_OPTIMIZER_VERSION,
                true
            );

            wp_add_inline_script( 'geo-optimizer-admin', $this->inline_js() );

            wp_localize_script( 'geo-optimizer-admin', 'geoOptimizer', array(
                'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                'nonce'   => wp_create_nonce( 'geo_optimizer_analyze' ),
            ) );
        }
    }

    private function inline_js() {
        return <<<'JS'
(function($){
    $(document).on('click', '#geo-optimizer-analyze-btn', function(e) {
        e.preventDefault();
        var $btn = $(this);
        var $results = $('#geo-optimizer-results');
        var postId = $btn.data('post-id');

        $btn.prop('disabled', true).text('Analyzing…');
        $results.html('<p>Running GEO analysis…</p>');

        $.post(geoOptimizer.ajaxUrl, {
            action: 'geo_optimizer_analyze',
            post_id: postId,
            _wpnonce: geoOptimizer.nonce
        }, function(response) {
            $btn.prop('disabled', false).text('Analyze Now');
            if (response.success) {
                var d = response.data;
                var html = '<div class="geo-optimizer-score-card">';
                html += '<div class="geo-score-big">' + d.geo_score + '<span class="geo-grade">' + d.grade + '</span></div>';
                html += '<p class="geo-score-label">GEO Readiness Score</p>';

                if (d.breakdown) {
                    html += '<table class="geo-breakdown"><tbody>';
                    var dims = ['schema_markup','entity_clarity','ai_readability','content_structure','authority_signals'];
                    var labels = ['Schema Markup','Entity Clarity','AI Readability','Content Structure','Authority Signals'];
                    for (var i = 0; i < dims.length; i++) {
                        var dim = d.breakdown[dims[i]];
                        if (dim) {
                            var pct = Math.round((dim.score / dim.max) * 100);
                            html += '<tr><td>' + labels[i] + '</td>';
                            html += '<td><div class="geo-bar"><div class="geo-bar-fill" style="width:' + pct + '%"></div></div></td>';
                            html += '<td>' + dim.score + '/' + dim.max + '</td></tr>';
                        }
                    }
                    html += '</tbody></table>';
                }

                if (d.recommendations && d.recommendations.length > 0) {
                    html += '<h4>Top Recommendations</h4><ul class="geo-recommendations">';
                    var max = Math.min(d.recommendations.length, 5);
                    for (var j = 0; j < max; j++) {
                        var rec = d.recommendations[j];
                        html += '<li><strong>' + rec.action + '</strong>';
                        if (rec.details) html += '<br><small>' + rec.details + '</small>';
                        html += '</li>';
                    }
                    html += '</ul>';
                }

                if (d.schemas_generated) {
                    html += '<p class="geo-schemas-count">' + d.schemas_generated + ' schema(s) generated and saved.</p>';
                }

                html += '</div>';
                $results.html(html);
            } else {
                $results.html('<p class="geo-error">' + (response.data || 'Analysis failed.') + '</p>');
            }
        }).fail(function() {
            $btn.prop('disabled', false).text('Analyze Now');
            $results.html('<p class="geo-error">Request failed. Check your API connection.</p>');
        });
    });
})(jQuery);
JS;
    }

    /* ==================================================================
       Post Meta Box
       ================================================================== */

    public function add_meta_box() {
        $post_types = array( 'post', 'page' );

        // Also support WooCommerce products if available.
        if ( post_type_exists( 'product' ) ) {
            $post_types[] = 'product';
        }

        add_meta_box(
            'geo-optimizer',
            __( 'GEO Optimizer', 'geo-optimizer' ),
            array( $this, 'render_meta_box' ),
            $post_types,
            'side',
            'default'
        );
    }

    public function render_meta_box( $post ) {
        $score_data = get_post_meta( $post->ID, '_geo_optimizer_score', true );
        $schemas    = get_post_meta( $post->ID, '_geo_optimizer_schemas', true );
        $analyzed   = get_post_meta( $post->ID, '_geo_optimizer_analyzed_at', true );
        ?>
        <div class="geo-optimizer-metabox">
            <?php if ( $score_data && isset( $score_data['geo_score'] ) ) : ?>
                <div class="geo-optimizer-score-card">
                    <div class="geo-score-big">
                        <?php echo esc_html( $score_data['geo_score'] ); ?>
                        <span class="geo-grade"><?php echo esc_html( $score_data['grade'] ); ?></span>
                    </div>
                    <p class="geo-score-label">
                        <?php esc_html_e( 'GEO Score', 'geo-optimizer' ); ?>
                    </p>
                    <?php if ( $analyzed ) : ?>
                        <p class="geo-analyzed-at">
                            <?php echo esc_html( sprintf( __( 'Analyzed: %s', 'geo-optimizer' ), wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), strtotime( $analyzed ) ) ) ); ?>
                        </p>
                    <?php endif; ?>
                </div>

                <?php if ( ! empty( $schemas ) ) : ?>
                    <p class="geo-schemas-count">
                        <?php echo esc_html( sprintf( _n( '%d schema injected', '%d schemas injected', count( $schemas ), 'geo-optimizer' ), count( $schemas ) ) ); ?>
                    </p>
                <?php endif; ?>
            <?php else : ?>
                <p class="geo-no-data"><?php esc_html_e( 'Not yet analyzed.', 'geo-optimizer' ); ?></p>
            <?php endif; ?>

            <div id="geo-optimizer-results"></div>

            <button type="button" id="geo-optimizer-analyze-btn" class="button button-primary" data-post-id="<?php echo esc_attr( $post->ID ); ?>">
                <?php esc_html_e( 'Analyze Now', 'geo-optimizer' ); ?>
            </button>
        </div>
        <?php
    }

    /* ==================================================================
       Auto-analyze on save
       ================================================================== */

    public function on_save_post( $post_id, $post ) {
        // Skip autosaves, revisions, non-public types.
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        if ( wp_is_post_revision( $post_id ) ) {
            return;
        }
        if ( 'publish' !== $post->post_status ) {
            return;
        }
        if ( ! in_array( $post->post_type, array( 'post', 'page', 'product' ), true ) ) {
            return;
        }

        $settings = get_option( 'geo_optimizer_settings', array() );
        if ( empty( $settings['auto_analyze'] ) ) {
            return;
        }

        $this->run_analysis( $post_id );
    }

    /* ==================================================================
       AJAX handler
       ================================================================== */

    public function ajax_analyze() {
        check_ajax_referer( 'geo_optimizer_analyze' );

        if ( ! current_user_can( 'edit_posts' ) ) {
            wp_send_json_error( 'Permission denied.', 403 );
        }

        $post_id = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;
        if ( ! $post_id ) {
            wp_send_json_error( 'Invalid post ID.' );
        }

        $result = $this->run_analysis( $post_id );
        if ( is_wp_error( $result ) ) {
            wp_send_json_error( $result->get_error_message() );
        }

        wp_send_json_success( $result );
    }

    /* ==================================================================
       Core analysis logic
       ================================================================== */

    /**
     * Run full GEO analysis for a post.
     *
     * 1. Score the content (GEO score + recommendations).
     * 2. Generate schema markup.
     * 3. Store results in post meta.
     *
     * @param  int $post_id
     * @return array|WP_Error
     */
    private function run_analysis( int $post_id ) {
        $post = get_post( $post_id );
        if ( ! $post ) {
            return new WP_Error( 'geo_no_post', 'Post not found.' );
        }

        $content  = wp_strip_all_tags( $post->post_content );
        $title    = $post->post_title;
        $url      = get_permalink( $post_id );
        $headings = $this->extract_headings( $post->post_content );
        $author   = get_the_author_meta( 'display_name', $post->post_author );

        // 1. GEO Score.
        $score_result = $this->api->score(
            $content,
            $title,
            $headings,
            array(),
            array(
                'author'     => $author,
                'date'       => $post->post_date,
                'word_count' => str_word_count( $content ),
            )
        );

        if ( is_wp_error( $score_result ) ) {
            return $score_result;
        }

        update_post_meta( $post_id, '_geo_optimizer_score', $score_result );
        update_post_meta( $post_id, '_geo_optimizer_analyzed_at', gmdate( 'c' ) );

        // 2. Generate schemas.
        $settings    = get_option( 'geo_optimizer_settings', array() );
        $auto_schema = isset( $settings['auto_schema'] ) ? $settings['auto_schema'] : true;

        $schemas_generated = 0;
        if ( $auto_schema ) {
            $schema_result = $this->api->generate_schema( $content, $title, $url );
            if ( ! is_wp_error( $schema_result ) && isset( $schema_result['schemas'] ) ) {
                update_post_meta( $post_id, '_geo_optimizer_schemas', $schema_result['schemas'] );
                $schemas_generated = count( $schema_result['schemas'] );
            }
        }

        return array(
            'geo_score'         => $score_result['geo_score'] ?? 0,
            'grade'             => $score_result['grade'] ?? 'F',
            'breakdown'         => $score_result['breakdown'] ?? null,
            'recommendations'   => $score_result['recommendations'] ?? array(),
            'schemas_generated' => $schemas_generated,
        );
    }

    /**
     * Extract heading texts from post HTML content.
     *
     * @param  string $html
     * @return string[]
     */
    private function extract_headings( string $html ): array {
        $headings = array();
        if ( preg_match_all( '/<h[1-6][^>]*>(.*?)<\/h[1-6]>/is', $html, $matches ) ) {
            foreach ( $matches[1] as $heading ) {
                $headings[] = wp_strip_all_tags( $heading );
            }
        }
        return $headings;
    }
}
