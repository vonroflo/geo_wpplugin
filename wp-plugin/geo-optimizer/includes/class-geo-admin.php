<?php
/**
 * WordPress admin integration for GEO Optimizer.
 *
 * - Top-level dashboard page (site-wide insights).
 * - Settings sub-page (API URL, toggles).
 * - Post / page metabox for on-demand analysis.
 * - Bulk analyze AJAX.
 * - Per-post insights AJAX (breakdown, recommendations, keywords).
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

        // Menu pages.
        add_action( 'admin_menu', array( $this, 'add_menu_pages' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );

        // Post metabox.
        add_action( 'add_meta_boxes', array( $this, 'add_meta_box' ) );

        // Auto-analyze on save.
        add_action( 'save_post', array( $this, 'on_save_post' ), 20, 2 );

        // Admin styles & scripts.
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );

        // AJAX handlers.
        add_action( 'wp_ajax_geo_optimizer_analyze', array( $this, 'ajax_analyze' ) );
        add_action( 'wp_ajax_geo_optimizer_bulk_analyze', array( $this, 'ajax_bulk_analyze' ) );
        add_action( 'wp_ajax_geo_optimizer_post_insights', array( $this, 'ajax_post_insights' ) );
    }

    /* ==================================================================
       Menu Pages
       ================================================================== */

    public function add_menu_pages() {
        // Top-level dashboard.
        add_menu_page(
            __( 'GEO Optimizer', 'geo-optimizer' ),
            __( 'GEO Optimizer', 'geo-optimizer' ),
            'edit_posts',
            'geo-optimizer',
            array( $this, 'render_dashboard' ),
            'dashicons-chart-area',
            30
        );

        // Dashboard sub-item (rename from default).
        add_submenu_page(
            'geo-optimizer',
            __( 'Dashboard', 'geo-optimizer' ),
            __( 'Dashboard', 'geo-optimizer' ),
            'edit_posts',
            'geo-optimizer',
            array( $this, 'render_dashboard' )
        );

        // Settings sub-page.
        add_submenu_page(
            'geo-optimizer',
            __( 'Settings', 'geo-optimizer' ),
            __( 'Settings', 'geo-optimizer' ),
            'manage_options',
            'geo-optimizer-settings',
            array( $this, 'render_settings_page' )
        );
    }

    /* ==================================================================
       Dashboard Page
       ================================================================== */

    public function render_dashboard() {
        if ( ! current_user_can( 'edit_posts' ) ) {
            return;
        }

        // API status.
        $health       = $this->api->health();
        $is_connected = ! is_wp_error( $health ) && isset( $health['status'] ) && 'ok' === $health['status'];

        // Gather site-wide stats from post meta.
        $stats = $this->get_site_stats();
        $posts = $this->get_analyzed_posts();

        ?>
        <div class="wrap geo-dashboard">
            <h1 class="geo-dashboard__title"><?php esc_html_e( 'GEO Optimizer Dashboard', 'geo-optimizer' ); ?></h1>

            <!-- API Status -->
            <div class="geo-optimizer-status <?php echo $is_connected ? 'geo-optimizer-status--ok' : 'geo-optimizer-status--error'; ?>">
                <?php if ( $is_connected ) : ?>
                    <strong><?php esc_html_e( 'API Connected', 'geo-optimizer' ); ?></strong> &mdash;
                    <?php echo esc_html( sprintf( __( 'v%s', 'geo-optimizer' ), isset( $health['version'] ) ? $health['version'] : '?' ) ); ?>
                <?php else : ?>
                    <strong><?php esc_html_e( 'API Not Connected', 'geo-optimizer' ); ?></strong> &mdash;
                    <?php echo esc_html( is_wp_error( $health ) ? $health->get_error_message() : __( 'Could not reach the API.', 'geo-optimizer' ) ); ?>
                    &nbsp;<a href="<?php echo esc_url( admin_url( 'admin.php?page=geo-optimizer-settings' ) ); ?>"><?php esc_html_e( 'Check Settings', 'geo-optimizer' ); ?></a>
                <?php endif; ?>
            </div>

            <!-- Summary Cards -->
            <div class="geo-summary-grid">
                <div class="geo-summary-card">
                    <div class="geo-summary-card__value"><?php echo esc_html( $stats['avg_score'] ); ?></div>
                    <div class="geo-summary-card__label"><?php esc_html_e( 'Avg. GEO Score', 'geo-optimizer' ); ?></div>
                </div>
                <div class="geo-summary-card">
                    <div class="geo-summary-card__value"><?php echo esc_html( $stats['total_analyzed'] ); ?></div>
                    <div class="geo-summary-card__label"><?php esc_html_e( 'Pages Analyzed', 'geo-optimizer' ); ?></div>
                </div>
                <div class="geo-summary-card">
                    <div class="geo-summary-card__value"><?php echo esc_html( $stats['total_schemas'] ); ?></div>
                    <div class="geo-summary-card__label"><?php esc_html_e( 'Schemas Injected', 'geo-optimizer' ); ?></div>
                </div>
                <div class="geo-summary-card">
                    <div class="geo-summary-card__value"><?php echo esc_html( $stats['total_published'] ); ?></div>
                    <div class="geo-summary-card__label"><?php esc_html_e( 'Published Posts', 'geo-optimizer' ); ?></div>
                </div>
            </div>

            <!-- Grade Distribution -->
            <?php if ( $stats['total_analyzed'] > 0 ) : ?>
            <div class="geo-card">
                <h2 class="geo-card__title"><?php esc_html_e( 'Score Distribution', 'geo-optimizer' ); ?></h2>
                <div class="geo-grade-dist">
                    <?php
                    $grades = array( 'A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'F' => 0 );
                    foreach ( $posts as $p ) {
                        $g = isset( $p['grade'] ) ? $p['grade'] : 'F';
                        if ( isset( $grades[ $g ] ) ) {
                            $grades[ $g ]++;
                        }
                    }
                    $grade_colors = array( 'A' => '#00a32a', 'B' => '#0073aa', 'C' => '#dba617', 'D' => '#d54e21', 'F' => '#d63638' );
                    foreach ( $grades as $letter => $count ) :
                        $pct = $stats['total_analyzed'] > 0 ? round( ( $count / $stats['total_analyzed'] ) * 100 ) : 0;
                    ?>
                    <div class="geo-grade-dist__item">
                        <div class="geo-grade-dist__bar-wrap">
                            <div class="geo-grade-dist__bar" style="height: <?php echo max( $pct, 4 ); ?>%; background: <?php echo esc_attr( $grade_colors[ $letter ] ); ?>;"></div>
                        </div>
                        <div class="geo-grade-dist__letter" style="color: <?php echo esc_attr( $grade_colors[ $letter ] ); ?>;"><?php echo esc_html( $letter ); ?></div>
                        <div class="geo-grade-dist__count"><?php echo esc_html( $count ); ?></div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>

            <!-- Actions -->
            <div class="geo-card">
                <h2 class="geo-card__title"><?php esc_html_e( 'Actions', 'geo-optimizer' ); ?></h2>
                <p class="geo-card__desc"><?php esc_html_e( 'Analyze all published posts and pages to generate GEO scores and schema markup.', 'geo-optimizer' ); ?></p>
                <button type="button" id="geo-bulk-analyze-btn" class="button button-primary">
                    <?php esc_html_e( 'Analyze All Posts', 'geo-optimizer' ); ?>
                </button>
                <span id="geo-bulk-progress" class="geo-bulk-progress"></span>
                <div id="geo-bulk-log" class="geo-bulk-log"></div>
            </div>

            <!-- Posts Table -->
            <div class="geo-card">
                <h2 class="geo-card__title"><?php esc_html_e( 'Content Insights', 'geo-optimizer' ); ?></h2>
                <?php if ( empty( $posts ) ) : ?>
                    <p class="geo-no-data"><?php esc_html_e( 'No posts analyzed yet. Click "Analyze All Posts" above or edit a post and click "Analyze Now" in the GEO Optimizer metabox.', 'geo-optimizer' ); ?></p>
                <?php else : ?>
                    <table class="wp-list-table widefat fixed striped geo-posts-table">
                        <thead>
                            <tr>
                                <th class="column-title"><?php esc_html_e( 'Title', 'geo-optimizer' ); ?></th>
                                <th class="column-type"><?php esc_html_e( 'Type', 'geo-optimizer' ); ?></th>
                                <th class="column-score"><?php esc_html_e( 'GEO Score', 'geo-optimizer' ); ?></th>
                                <th class="column-grade"><?php esc_html_e( 'Grade', 'geo-optimizer' ); ?></th>
                                <th class="column-schemas"><?php esc_html_e( 'Schemas', 'geo-optimizer' ); ?></th>
                                <th class="column-actions-col"><?php esc_html_e( 'Insights', 'geo-optimizer' ); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ( $posts as $p ) : ?>
                            <tr class="geo-post-row" data-post-id="<?php echo esc_attr( $p['id'] ); ?>">
                                <td class="column-title">
                                    <a href="<?php echo esc_url( get_edit_post_link( $p['id'] ) ); ?>">
                                        <?php echo esc_html( $p['title'] ); ?>
                                    </a>
                                </td>
                                <td class="column-type"><?php echo esc_html( ucfirst( $p['type'] ) ); ?></td>
                                <td class="column-score">
                                    <div class="geo-inline-bar">
                                        <div class="geo-inline-bar__fill" style="width: <?php echo esc_attr( $p['score'] ); ?>%;"></div>
                                    </div>
                                    <span class="geo-inline-score"><?php echo esc_html( $p['score'] ); ?></span>
                                </td>
                                <td class="column-grade">
                                    <span class="geo-grade-badge geo-grade-badge--<?php echo esc_attr( strtolower( $p['grade'] ) ); ?>">
                                        <?php echo esc_html( $p['grade'] ); ?>
                                    </span>
                                </td>
                                <td class="column-schemas"><?php echo esc_html( $p['schema_count'] ); ?></td>
                                <td class="column-actions-col">
                                    <button type="button" class="button button-small geo-view-insights-btn" data-post-id="<?php echo esc_attr( $p['id'] ); ?>">
                                        <?php esc_html_e( 'View', 'geo-optimizer' ); ?>
                                    </button>
                                </td>
                            </tr>
                            <tr class="geo-detail-row" id="geo-detail-<?php echo esc_attr( $p['id'] ); ?>" style="display:none;">
                                <td colspan="6">
                                    <div class="geo-insights-panel">
                                        <div class="geo-insights-loading"><?php esc_html_e( 'Loading insights...', 'geo-optimizer' ); ?></div>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    /* ==================================================================
       Dashboard Data Helpers
       ================================================================== */

    private function get_site_stats(): array {
        global $wpdb;

        $total_published = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status = 'publish' AND post_type IN ('post','page','product')"
        );

        $rows = $wpdb->get_results(
            "SELECT pm.post_id, pm.meta_value FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key = '_geo_optimizer_score' AND p.post_status = 'publish'",
            ARRAY_A
        );

        $total_analyzed = count( $rows );
        $sum_score      = 0;

        foreach ( $rows as $row ) {
            $data = maybe_unserialize( $row['meta_value'] );
            if ( isset( $data['geo_score'] ) ) {
                $sum_score += (int) $data['geo_score'];
            }
        }

        $avg_score = $total_analyzed > 0 ? round( $sum_score / $total_analyzed ) : 0;

        // Count total schemas.
        $total_schemas = 0;
        $schema_rows = $wpdb->get_results(
            "SELECT pm.meta_value FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key = '_geo_optimizer_schemas' AND p.post_status = 'publish'",
            ARRAY_A
        );
        foreach ( $schema_rows as $sr ) {
            $schemas = maybe_unserialize( $sr['meta_value'] );
            if ( is_array( $schemas ) ) {
                $total_schemas += count( $schemas );
            }
        }

        return array(
            'total_published' => $total_published,
            'total_analyzed'  => $total_analyzed,
            'avg_score'       => $avg_score,
            'total_schemas'   => $total_schemas,
        );
    }

    private function get_analyzed_posts(): array {
        global $wpdb;

        $rows = $wpdb->get_results(
            "SELECT p.ID, p.post_title, p.post_type,
                    pm_score.meta_value AS score_data,
                    pm_schemas.meta_value AS schema_data,
                    pm_at.meta_value AS analyzed_at
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->postmeta} pm_score ON pm_score.post_id = p.ID AND pm_score.meta_key = '_geo_optimizer_score'
             LEFT JOIN {$wpdb->postmeta} pm_schemas ON pm_schemas.post_id = p.ID AND pm_schemas.meta_key = '_geo_optimizer_schemas'
             LEFT JOIN {$wpdb->postmeta} pm_at ON pm_at.post_id = p.ID AND pm_at.meta_key = '_geo_optimizer_analyzed_at'
             WHERE p.post_status = 'publish'
             ORDER BY pm_at.meta_value DESC
             LIMIT 100",
            ARRAY_A
        );

        $posts = array();
        foreach ( $rows as $row ) {
            $score_data   = maybe_unserialize( $row['score_data'] );
            $schema_data  = maybe_unserialize( $row['schema_data'] );
            $analyzed_at  = $row['analyzed_at'] ?? '';

            $ago = '';
            if ( $analyzed_at ) {
                $ts  = strtotime( $analyzed_at );
                $ago = $ts ? human_time_diff( $ts, time() ) . ' ago' : '';
            }

            $posts[] = array(
                'id'           => (int) $row['ID'],
                'title'        => $row['post_title'] ?: __( '(no title)', 'geo-optimizer' ),
                'type'         => $row['post_type'],
                'score'        => isset( $score_data['geo_score'] ) ? (int) $score_data['geo_score'] : 0,
                'grade'        => isset( $score_data['grade'] ) ? $score_data['grade'] : 'F',
                'schema_count' => is_array( $schema_data ) ? count( $schema_data ) : 0,
                'analyzed_ago' => $ago,
            );
        }

        return $posts;
    }

    /* ==================================================================
       Settings Page
       ================================================================== */

    public function register_settings() {
        register_setting( 'geo_optimizer', 'geo_optimizer_settings', array(
            'type'              => 'array',
            'sanitize_callback' => array( $this, 'sanitize_settings' ),
        ) );

        add_settings_section(
            'geo_optimizer_main',
            __( 'General Settings', 'geo-optimizer' ),
            null,
            'geo-optimizer-settings'
        );

        add_settings_field( 'api_url', __( 'API Endpoint', 'geo-optimizer' ), array( $this, 'field_api_url' ), 'geo-optimizer-settings', 'geo_optimizer_main' );
        add_settings_field( 'auto_analyze', __( 'Auto-Analyze', 'geo-optimizer' ), array( $this, 'field_auto_analyze' ), 'geo-optimizer-settings', 'geo_optimizer_main' );
        add_settings_field( 'auto_schema', __( 'Auto-Inject Schema', 'geo-optimizer' ), array( $this, 'field_auto_schema' ), 'geo-optimizer-settings', 'geo_optimizer_main' );
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

        $health       = $this->api->health();
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
                do_settings_sections( 'geo-optimizer-settings' );
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
        $plugin_pages = array( 'toplevel_page_geo-optimizer', 'geo-optimizer_page_geo-optimizer-settings' );
        $post_pages   = array( 'post.php', 'post-new.php' );

        if ( in_array( $hook, array_merge( $plugin_pages, $post_pages ), true ) ) {
            wp_enqueue_style(
                'geo-optimizer-admin',
                GEO_OPTIMIZER_PLUGIN_URL . 'assets/css/admin.css',
                array(),
                GEO_OPTIMIZER_VERSION
            );
        }

        if ( in_array( $hook, array_merge( $plugin_pages, $post_pages ), true ) ) {
            wp_enqueue_script( 'jquery' );

            wp_localize_script( 'jquery', 'geoOptimizer', array(
                'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                'nonce'   => wp_create_nonce( 'geo_optimizer_analyze' ),
            ) );

            add_action( 'admin_footer', array( $this, 'print_inline_js' ) );
        }
    }

    public function print_inline_js() {
        ?>
        <script>
        (function($){
            /* ── Dimension label map ── */
            var dimLabels = {
                schema_markup: 'Schema Markup',
                entity_clarity: 'Entity Clarity',
                ai_readability: 'AI Readability',
                content_structure: 'Content Structure',
                authority_signals: 'Authority Signals'
            };
            var impactColors = { high: '#d63638', medium: '#dba617', low: '#00a32a' };
            var effortLabels = { quick_win: 'Quick Win', moderate: 'Moderate', significant: 'Significant' };

            /* ── Render insights panel HTML ── */
            function renderInsights(d) {
                var html = '<div class="geo-ip">';

                /* --- Score Breakdown --- */
                if (d.score && d.score.breakdown) {
                    html += '<div class="geo-ip__section">';
                    html += '<h4 class="geo-ip__heading">Score Breakdown</h4>';
                    html += '<div class="geo-ip__breakdown">';
                    var bd = d.score.breakdown;
                    for (var key in dimLabels) {
                        if (bd[key]) {
                            var dim = bd[key];
                            var pct = Math.round((dim.score / dim.max) * 100);
                            var barColor = pct >= 70 ? '#00a32a' : pct >= 40 ? '#dba617' : '#d63638';
                            html += '<div class="geo-ip__dim">';
                            html += '<div class="geo-ip__dim-header"><span class="geo-ip__dim-label">' + dimLabels[key] + '</span><span class="geo-ip__dim-score">' + dim.score + '/' + dim.max + '</span></div>';
                            html += '<div class="geo-bar"><div class="geo-bar-fill" style="width:' + pct + '%;background:' + barColor + '"></div></div>';
                            html += '<p class="geo-ip__dim-detail">' + dim.details + '</p>';
                            html += '</div>';
                        }
                    }
                    html += '</div></div>';
                }

                /* --- Comparison --- */
                if (d.score && d.score.comparison) {
                    html += '<div class="geo-ip__section geo-ip__comparison">';
                    html += '<span class="geo-ip__percentile">Top <strong>' + (100 - d.score.comparison.percentile) + '%</strong></span>';
                    html += '<span class="geo-ip__benchmark">Benchmark avg: ' + d.score.comparison.average_score + '</span>';
                    html += '</div>';
                }

                /* --- Recommendations --- */
                if (d.score && d.score.recommendations && d.score.recommendations.length > 0) {
                    html += '<div class="geo-ip__section">';
                    html += '<h4 class="geo-ip__heading">Recommendations to Improve AI Visibility</h4>';
                    var recs = d.score.recommendations;
                    var max = Math.min(recs.length, 8);
                    for (var i = 0; i < max; i++) {
                        var rec = recs[i];
                        var impactColor = impactColors[rec.impact] || '#646970';
                        var effortText = effortLabels[rec.effort] || rec.effort;
                        html += '<div class="geo-ip__rec">';
                        html += '<div class="geo-ip__rec-header">';
                        html += '<span class="geo-ip__rec-num">' + rec.priority + '</span>';
                        html += '<span class="geo-ip__rec-action">' + rec.action + '</span>';
                        html += '<span class="geo-ip__rec-badges">';
                        html += '<span class="geo-ip__badge" style="background:' + impactColor + '">' + rec.impact + ' impact</span>';
                        html += '<span class="geo-ip__badge geo-ip__badge--effort">' + effortText + '</span>';
                        html += '</span>';
                        html += '</div>';
                        html += '<p class="geo-ip__rec-detail">' + rec.details + '</p>';
                        html += '</div>';
                    }
                    html += '</div>';
                }

                /* --- Keywords --- */
                if (d.entities && d.entities.keywords) {
                    var kw = d.entities.keywords;
                    html += '<div class="geo-ip__section">';
                    html += '<h4 class="geo-ip__heading">Target Keywords</h4>';
                    html += '<div class="geo-ip__keywords">';
                    if (kw.primary && kw.primary.length > 0) {
                        html += '<div class="geo-ip__kw-group"><span class="geo-ip__kw-label">Primary:</span>';
                        for (var p = 0; p < kw.primary.length; p++) {
                            html += '<span class="geo-ip__tag geo-ip__tag--primary">' + kw.primary[p] + '</span>';
                        }
                        html += '</div>';
                    }
                    if (kw.secondary && kw.secondary.length > 0) {
                        html += '<div class="geo-ip__kw-group"><span class="geo-ip__kw-label">Secondary:</span>';
                        for (var s = 0; s < kw.secondary.length; s++) {
                            html += '<span class="geo-ip__tag geo-ip__tag--secondary">' + kw.secondary[s] + '</span>';
                        }
                        html += '</div>';
                    }
                    if (kw.missing && kw.missing.length > 0) {
                        html += '<div class="geo-ip__kw-group"><span class="geo-ip__kw-label">Missing (add these):</span>';
                        for (var m = 0; m < kw.missing.length; m++) {
                            html += '<span class="geo-ip__tag geo-ip__tag--missing">' + kw.missing[m] + '</span>';
                        }
                        html += '</div>';
                    }
                    html += '</div></div>';
                }

                /* --- Content Intent / About Suggestions --- */
                if (d.entities && d.entities.about_suggestions && d.entities.about_suggestions.length > 0) {
                    html += '<div class="geo-ip__section">';
                    html += '<h4 class="geo-ip__heading">Content Intent Signals</h4>';
                    html += '<p class="geo-ip__desc">Topics AI models associate with this content:</p>';
                    html += '<div class="geo-ip__about">';
                    for (var a = 0; a < d.entities.about_suggestions.length; a++) {
                        html += '<span class="geo-ip__tag geo-ip__tag--about">' + d.entities.about_suggestions[a] + '</span>';
                    }
                    html += '</div></div>';
                }

                /* --- Entity List --- */
                if (d.entities && d.entities.entities && d.entities.entities.length > 0) {
                    html += '<div class="geo-ip__section">';
                    html += '<h4 class="geo-ip__heading">Detected Entities</h4>';
                    html += '<div class="geo-ip__entities">';
                    for (var e = 0; e < d.entities.entities.length; e++) {
                        var ent = d.entities.entities[e];
                        var statusClass = 'geo-ip__entity--' + ent.status;
                        html += '<div class="geo-ip__entity ' + statusClass + '">';
                        html += '<strong>' + ent.name + '</strong> <span class="geo-ip__entity-type">' + ent.type + '</span>';
                        html += '<span class="geo-ip__entity-status">' + ent.status + '</span>';
                        if (ent.suggestions && ent.suggestions.length > 0) {
                            html += '<p class="geo-ip__entity-suggestion">' + ent.suggestions[0] + '</p>';
                        }
                        html += '</div>';
                    }
                    html += '</div></div>';
                }

                /* --- Entity Recommendations --- */
                if (d.entities && d.entities.recommendations && d.entities.recommendations.length > 0) {
                    html += '<div class="geo-ip__section">';
                    html += '<h4 class="geo-ip__heading">Entity Optimization Tips</h4>';
                    html += '<ul class="geo-ip__entity-recs">';
                    for (var er = 0; er < d.entities.recommendations.length; er++) {
                        html += '<li>' + d.entities.recommendations[er] + '</li>';
                    }
                    html += '</ul></div>';
                }

                html += '</div>';
                return html;
            }

            /* ── View Insights button ── */
            var insightsCache = {};
            $(document).on('click', '.geo-view-insights-btn', function(e) {
                e.preventDefault();
                var $btn = $(this);
                var postId = $btn.data('post-id');
                var $detailRow = $('#geo-detail-' + postId);
                var $panel = $detailRow.find('.geo-insights-panel');

                // Toggle if already visible
                if ($detailRow.is(':visible')) {
                    $detailRow.hide();
                    $btn.text('View');
                    return;
                }

                $detailRow.show();
                $btn.text('Hide');

                // Use cache if available
                if (insightsCache[postId]) {
                    $panel.html(renderInsights(insightsCache[postId]));
                    return;
                }

                $panel.html('<div class="geo-insights-loading">Loading insights and keywords\u2026</div>');

                $.post(geoOptimizer.ajaxUrl, {
                    action: 'geo_optimizer_post_insights',
                    post_id: postId,
                    _wpnonce: geoOptimizer.nonce
                }, function(response) {
                    if (response.success) {
                        insightsCache[postId] = response.data;
                        $panel.html(renderInsights(response.data));
                    } else {
                        $panel.html('<p class="geo-error">' + (response.data || 'Failed to load insights.') + '</p>');
                    }
                }).fail(function() {
                    $panel.html('<p class="geo-error">Request failed. Check your API connection.</p>');
                });
            });

            /* ── Single post analyze (metabox) ── */
            $(document).on('click', '#geo-optimizer-analyze-btn', function(e) {
                e.preventDefault();
                var $btn = $(this);
                var $results = $('#geo-optimizer-results');
                var postId = $btn.data('post-id');

                $btn.prop('disabled', true).text('Analyzing\u2026');
                $results.html('<p>Running GEO analysis\u2026</p>');

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

            /* ── Bulk analyze ── */
            $(document).on('click', '#geo-bulk-analyze-btn', function(e) {
                e.preventDefault();
                var $btn = $(this);
                var $progress = $('#geo-bulk-progress');
                var $log = $('#geo-bulk-log');

                $btn.prop('disabled', true).text('Starting\u2026');
                $progress.text('');
                $log.html('');

                $.post(geoOptimizer.ajaxUrl, {
                    action: 'geo_optimizer_bulk_analyze',
                    _wpnonce: geoOptimizer.nonce
                }, function(response) {
                    $btn.prop('disabled', false).text('Analyze All Posts');
                    if (response.success) {
                        var d = response.data;
                        $progress.html('<strong>' + d.analyzed + '</strong> of <strong>' + d.total + '</strong> posts analyzed.');
                        var logHtml = '';
                        if (d.results && d.results.length > 0) {
                            for (var i = 0; i < d.results.length; i++) {
                                var r = d.results[i];
                                var icon = r.success ? '\u2705' : '\u274C';
                                var detail = '';
                                if (r.success && r.score) {
                                    detail = ' &mdash; Score: ' + r.score;
                                } else if (!r.success && r.error) {
                                    detail = ' &mdash; ' + (typeof r.error === 'string' ? r.error : JSON.stringify(r.error));
                                }
                                logHtml += '<div class="geo-bulk-log__item">' + icon + ' ' + r.title + detail + '</div>';
                            }
                        }
                        $log.html(logHtml);
                        if (d.analyzed > 0) {
                            $log.append('<p style="margin-top:12px"><a href="" class="button button-secondary">Refresh Dashboard</a></p>');
                        }
                    } else {
                        $progress.html('<span class="geo-error">' + (response.data || 'Bulk analysis failed.') + '</span>');
                    }
                }).fail(function() {
                    $btn.prop('disabled', false).text('Analyze All Posts');
                    $progress.html('<span class="geo-error">Request failed.</span>');
                });
            });
        })(jQuery);
        </script>
        <?php
    }

    /* ==================================================================
       Post Meta Box
       ================================================================== */

    public function add_meta_box() {
        $post_types = array( 'post', 'page' );
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
                    <p class="geo-score-label"><?php esc_html_e( 'GEO Score', 'geo-optimizer' ); ?></p>
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
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
        if ( wp_is_post_revision( $post_id ) ) return;
        if ( 'publish' !== $post->post_status ) return;
        if ( ! in_array( $post->post_type, array( 'post', 'page', 'product' ), true ) ) return;

        $settings = get_option( 'geo_optimizer_settings', array() );
        if ( empty( $settings['auto_analyze'] ) ) return;

        $this->run_analysis( $post_id );
    }

    /* ==================================================================
       AJAX handlers
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

    public function ajax_bulk_analyze() {
        check_ajax_referer( 'geo_optimizer_analyze' );
        if ( ! current_user_can( 'edit_posts' ) ) {
            wp_send_json_error( 'Permission denied.', 403 );
        }

        $posts = get_posts( array(
            'post_type'      => array( 'post', 'page', 'product' ),
            'post_status'    => 'publish',
            'posts_per_page' => 50,
            'fields'         => 'ids',
        ) );

        $results  = array();
        $analyzed = 0;

        foreach ( $posts as $pid ) {
            $result = $this->run_analysis( $pid );
            $title  = get_the_title( $pid );

            if ( is_wp_error( $result ) ) {
                $results[] = array(
                    'title'   => $title,
                    'success' => false,
                    'error'   => $result->get_error_message(),
                );
            } else {
                $analyzed++;
                $results[] = array(
                    'title'   => $title,
                    'success' => true,
                    'score'   => $result['geo_score'],
                    'grade'   => $result['grade'],
                );
            }
        }

        wp_send_json_success( array(
            'total'    => count( $posts ),
            'analyzed' => $analyzed,
            'results'  => $results,
        ) );
    }

    public function ajax_post_insights() {
        check_ajax_referer( 'geo_optimizer_analyze' );
        if ( ! current_user_can( 'edit_posts' ) ) {
            wp_send_json_error( 'Permission denied.', 403 );
        }

        $post_id = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;
        if ( ! $post_id ) {
            wp_send_json_error( 'Invalid post ID.' );
        }

        $post = get_post( $post_id );
        if ( ! $post ) {
            wp_send_json_error( 'Post not found.' );
        }

        // Score data (already stored from bulk/single analyze).
        $score_data = get_post_meta( $post_id, '_geo_optimizer_score', true );

        // Entity data — fetch from cache or call API on demand.
        $entity_data = get_post_meta( $post_id, '_geo_optimizer_entities', true );

        if ( empty( $entity_data ) ) {
            $content = wp_strip_all_tags( $post->post_content );
            $url     = get_permalink( $post_id );

            $entity_result = $this->api->optimize_entities( $content, $post->post_title, $url );
            if ( ! is_wp_error( $entity_result ) ) {
                update_post_meta( $post_id, '_geo_optimizer_entities', $entity_result );
                $entity_data = $entity_result;
            }
        }

        wp_send_json_success( array(
            'score'    => is_array( $score_data ) ? $score_data : null,
            'entities' => is_array( $entity_data ) ? $entity_data : null,
        ) );
    }

    /* ==================================================================
       Core analysis
       ================================================================== */

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

        $score_result = $this->api->score(
            $content, $title, $url, $headings, array(),
            array(
                'author'         => $author,
                'published_date' => $post->post_date,
                'word_count'     => str_word_count( $content ),
            )
        );

        if ( is_wp_error( $score_result ) ) {
            return $score_result;
        }

        update_post_meta( $post_id, '_geo_optimizer_score', $score_result );
        update_post_meta( $post_id, '_geo_optimizer_analyzed_at', gmdate( 'c' ) );

        $settings        = get_option( 'geo_optimizer_settings', array() );
        $auto_schema     = isset( $settings['auto_schema'] ) ? $settings['auto_schema'] : true;
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
