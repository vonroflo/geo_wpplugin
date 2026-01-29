=== GEO Optimizer ===
Contributors: vonroflo
Tags: seo, schema, json-ld, ai, structured data, geo, generative search
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

AI Generative Search Optimizer — structured data, entity optimization, and GEO scoring for AI search engines.

== Description ==

GEO Optimizer makes your WordPress content visible to AI search engines like Google SGE, ChatGPT, Perplexity, DeepSeek, and Bing AI.

**Features:**

* **Schema Generation** — Auto-detect content type and generate FAQPage, HowTo, Article, Product, or LocalBusiness JSON-LD.
* **Entity Optimization** — Extract entities, suggest sameAs links, and add Schema.org about properties.
* **Readability Scoring** — Score quotability, answer-readiness, structure, conciseness, and authority signals.
* **GEO Score** — Comprehensive readiness score with letter grade, breakdown, and recommendations.
* **Schema Validation** — Validate existing JSON-LD against Schema.org specifications.
* **Auto-Detect** — Automatically identifies FAQs, HowTo steps, products, and articles.
* **Lightweight** — Under 50KB, no external CSS/JS on the front end.
* **WooCommerce Compatible** — Product schema for WooCommerce product pages.

== Installation ==

1. Download the plugin ZIP file.
2. In WordPress admin, go to **Plugins > Add New > Upload Plugin**.
3. Upload the ZIP file and click **Install Now**.
4. Click **Activate**.
5. Go to **Settings > GEO Optimizer** to verify the API connection.

The plugin works out of the box with no configuration required. Schema markup is automatically generated and injected when you publish or update posts.

== Frequently Asked Questions ==

= Is GEO Optimizer free? =

Yes, 100% free and open source with no usage limits.

= What schema types are supported? =

FAQPage, HowTo, Article, Product, and LocalBusiness. The plugin auto-detects the appropriate type.

= Does it slow down my site? =

No. The plugin adds a single lightweight JSON-LD script tag to the page head. No external CSS or JS is loaded on the front end.

= Does it work with WooCommerce? =

Yes. GEO Optimizer detects WooCommerce product pages and generates Product schema automatically.

= Can I self-host the API? =

Yes. The backend is open source. Deploy it yourself and update the API URL in Settings > GEO Optimizer.

== Changelog ==

= 1.0.0 =
* Initial release.
* Schema generation (FAQPage, HowTo, Article, Product, LocalBusiness).
* Entity optimization via AI analysis.
* AI readability scoring.
* Composite GEO readiness score with recommendations.
* Schema validation against Schema.org.
* Auto-analyze on publish/update.
* WordPress admin metabox with one-click analysis.
* Settings page with API connection status.
