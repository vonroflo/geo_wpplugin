<?php
/**
 * Injects JSON-LD schema markup into the <head> of singular pages.
 *
 * Reads stored schema from post meta (_geo_optimizer_schemas) and outputs
 * it as a <script type="application/ld+json"> tag.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class GEO_Schema_Injector {

    public function __construct() {
        add_action( 'wp_head', array( $this, 'inject_schemas' ), 1 );
    }

    /**
     * Output stored JSON-LD schemas in the document head.
     */
    public function inject_schemas() {
        if ( ! is_singular() ) {
            return;
        }

        $post_id = get_the_ID();
        if ( ! $post_id ) {
            return;
        }

        $schemas = get_post_meta( $post_id, '_geo_optimizer_schemas', true );
        if ( empty( $schemas ) || ! is_array( $schemas ) ) {
            return;
        }

        foreach ( $schemas as $schema ) {
            if ( empty( $schema ) || ! is_array( $schema ) ) {
                continue;
            }

            // Ensure @context is present.
            if ( ! isset( $schema['@context'] ) ) {
                $schema['@context'] = 'https://schema.org';
            }

            $json = wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT );
            if ( $json ) {
                echo "\n" . '<script type="application/ld+json">' . "\n" . $json . "\n" . '</script>' . "\n";
            }
        }
    }
}
