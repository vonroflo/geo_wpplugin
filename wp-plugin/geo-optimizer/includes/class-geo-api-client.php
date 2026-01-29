<?php
/**
 * HTTP client for the GEO Optimizer backend API.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class GEO_API_Client {

    /** @var string */
    private $base_url;

    /** @var int Request timeout in seconds. */
    private $timeout = 30;

    public function __construct( string $base_url ) {
        $this->base_url = rtrim( $base_url, '/' );
    }

    /* ------------------------------------------------------------------
       Public helpers
       ------------------------------------------------------------------ */

    /**
     * GET /health
     *
     * @return array|WP_Error
     */
    public function health() {
        return $this->get( '/health' );
    }

    /**
     * POST /schema/generate
     *
     * @param string $content  Raw post content (HTML stripped).
     * @param string $title    Post title.
     * @param string $url      Permalink.
     * @param string $content_type  One of: auto|article|product|faq|howto|local_business.
     * @return array|WP_Error
     */
    public function generate_schema( string $content, string $title, string $url, string $content_type = 'auto' ) {
        return $this->post( '/schema/generate', array(
            'content'      => $content,
            'title'        => $title,
            'url'          => $url,
            'content_type' => $content_type,
        ) );
    }

    /**
     * POST /schema/validate
     *
     * @param array $schemas  Array of JSON-LD objects to validate.
     * @return array|WP_Error
     */
    public function validate_schema( array $schemas ) {
        return $this->post( '/schema/validate', array(
            'schemas' => $schemas,
        ) );
    }

    /**
     * POST /entity/optimize
     *
     * @param string $content  Raw post content.
     * @param string $title    Post title.
     * @param string $url      Permalink.
     * @return array|WP_Error
     */
    public function optimize_entities( string $content, string $title, string $url ) {
        return $this->post( '/entity/optimize', array(
            'content' => $content,
            'title'   => $title,
            'url'     => $url,
        ) );
    }

    /**
     * POST /readability/analyze
     *
     * @param string   $content     Raw post content.
     * @param string   $title       Post title.
     * @param string[] $headings    Array of heading texts from the content.
     * @param bool     $has_faq     Whether the content contains an FAQ section.
     * @return array|WP_Error
     */
    public function analyze_readability( string $content, string $title, array $headings = array(), bool $has_faq = false ) {
        return $this->post( '/readability/analyze', array(
            'content'         => $content,
            'title'           => $title,
            'headings'        => $headings,
            'has_faq_section' => $has_faq,
        ) );
    }

    /**
     * POST /score
     *
     * @param string   $content          Raw post content.
     * @param string   $title            Post title.
     * @param string[] $headings         Heading texts.
     * @param array    $existing_schemas Existing JSON-LD on the page.
     * @param array    $meta             Optional metadata (author, date, word_count).
     * @return array|WP_Error
     */
    public function score( string $content, string $title, array $headings = array(), array $existing_schemas = array(), array $meta = array() ) {
        $body = array(
            'content'  => $content,
            'title'    => $title,
            'headings' => $headings,
        );
        if ( ! empty( $existing_schemas ) ) {
            $body['existing_schemas'] = $existing_schemas;
        }
        if ( ! empty( $meta ) ) {
            $body['meta'] = $meta;
        }
        return $this->post( '/score', $body );
    }

    /* ------------------------------------------------------------------
       Internal HTTP helpers
       ------------------------------------------------------------------ */

    /**
     * @return array|WP_Error
     */
    private function get( string $path ) {
        $url      = $this->base_url . $path;
        $response = wp_remote_get( $url, array(
            'timeout' => $this->timeout,
            'headers' => array( 'Accept' => 'application/json' ),
        ) );

        return $this->parse_response( $response );
    }

    /**
     * @return array|WP_Error
     */
    private function post( string $path, array $body ) {
        $url      = $this->base_url . $path;
        $response = wp_remote_post( $url, array(
            'timeout' => $this->timeout,
            'headers' => array(
                'Content-Type' => 'application/json',
                'Accept'       => 'application/json',
            ),
            'body'    => wp_json_encode( $body ),
        ) );

        return $this->parse_response( $response );
    }

    /**
     * Parse a wp_remote response into an associative array or WP_Error.
     *
     * @param  array|WP_Error $response
     * @return array|WP_Error
     */
    private function parse_response( $response ) {
        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = wp_remote_retrieve_body( $response );
        $data = json_decode( $body, true );

        if ( $code < 200 || $code >= 300 ) {
            $msg_raw = isset( $data['error'] ) ? $data['error'] : null;
            $message = is_string( $msg_raw ) ? $msg_raw : "API returned HTTP $code";
            return new WP_Error( 'geo_api_error', $message, array( 'status' => $code ) );
        }

        if ( null === $data ) {
            return new WP_Error( 'geo_api_parse', 'Invalid JSON response from API' );
        }

        return $data;
    }
}
