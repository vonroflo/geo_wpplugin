<?php
/**
 * GEO Optimizer uninstall script.
 *
 * Removes all plugin options and post meta when the plugin is deleted
 * (not just deactivated) from the WordPress admin.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Remove plugin settings.
delete_option( 'geo_optimizer_settings' );

// Remove all post meta created by the plugin.
global $wpdb;
$wpdb->query( "DELETE FROM {$wpdb->postmeta} WHERE meta_key IN ('_geo_optimizer_score', '_geo_optimizer_schemas', '_geo_optimizer_analyzed_at')" );
