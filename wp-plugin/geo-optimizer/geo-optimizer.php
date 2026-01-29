<?php
/**
 * Plugin Name: GEO Optimizer
 * Plugin URI:  https://github.com/vonroflo/geo_wpplugin
 * Description: AI Generative Search Optimizer — structured data, entity optimization, and GEO scoring for AI search engines (Google SGE, ChatGPT, Perplexity, DeepSeek).
 * Version:     1.0.0
 * Author:      GEO Optimizer
 * Author URI:  https://github.com/vonroflo
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: geo-optimizer
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'GEO_OPTIMIZER_VERSION', '1.0.0' );
define( 'GEO_OPTIMIZER_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'GEO_OPTIMIZER_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Default API endpoint (Vercel deployment).
if ( ! defined( 'GEO_OPTIMIZER_DEFAULT_API' ) ) {
    define( 'GEO_OPTIMIZER_DEFAULT_API', 'https://geo-wpplugin.vercel.app/api/v1/geo-plugin' );
}

/* ------------------------------------------------------------------
   Autoload includes
   ------------------------------------------------------------------ */
require_once GEO_OPTIMIZER_PLUGIN_DIR . 'includes/class-geo-api-client.php';
require_once GEO_OPTIMIZER_PLUGIN_DIR . 'includes/class-geo-admin.php';
require_once GEO_OPTIMIZER_PLUGIN_DIR . 'includes/class-geo-schema-injector.php';

/* ------------------------------------------------------------------
   Activation / Deactivation
   ------------------------------------------------------------------ */
register_activation_hook( __FILE__, 'geo_optimizer_activate' );
register_deactivation_hook( __FILE__, 'geo_optimizer_deactivate' );

function geo_optimizer_activate() {
    $defaults = array(
        'api_url'      => GEO_OPTIMIZER_DEFAULT_API,
        'auto_analyze' => true,
        'auto_schema'  => true,
    );
    if ( false === get_option( 'geo_optimizer_settings' ) ) {
        add_option( 'geo_optimizer_settings', $defaults );
    }
}

function geo_optimizer_deactivate() {
    // Keep settings on deactivation; remove only on uninstall.
}

/* ------------------------------------------------------------------
   Initialise components
   ------------------------------------------------------------------ */
add_action( 'init', 'geo_optimizer_init' );

function geo_optimizer_init() {
    $settings = get_option( 'geo_optimizer_settings', array() );
    $api_url  = isset( $settings['api_url'] ) ? $settings['api_url'] : GEO_OPTIMIZER_DEFAULT_API;

    // API client singleton.
    $api = new GEO_API_Client( $api_url );

    // Admin pages (settings + per-post metabox).
    if ( is_admin() ) {
        new GEO_Admin( $api );
    }

    // Front-end schema injection.
    new GEO_Schema_Injector();
}
