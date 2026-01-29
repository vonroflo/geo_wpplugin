"use client";

import { useState, useEffect } from "react";
import "./plugin.css";

export default function PluginLandingPage() {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);
    const [navScrolled, setNavScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Initialize theme
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("geo_theme");
        if (stored === "dark" || stored === "light") {
            setTheme(stored);
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark");
        }
    }, []);

    // Apply theme
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
            root.style.colorScheme = "dark";
        } else {
            root.classList.remove("dark");
            root.style.colorScheme = "light";
        }
        localStorage.setItem("geo_theme", theme);
    }, [theme, mounted]);

    // Nav scroll
    useEffect(() => {
        if (!mounted) return;
        const onScroll = () => setNavScrolled(window.scrollY > 50);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, [mounted]);

    // Scroll animations
    useEffect(() => {
        if (!mounted) return;
        const els = document.querySelectorAll(".animate-in, .animate-in--scale");
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) e.target.classList.add("visible");
                });
            },
            { rootMargin: "0px 0px -40px 0px", threshold: 0.1 }
        );
        els.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [mounted]);

    const toggleTheme = () => setTheme((p) => (p === "dark" ? "light" : "dark"));
    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
        document.body.style.overflow = "";
    };
    const toggleMobileMenu = () => {
        setMobileMenuOpen((prev) => {
            const next = !prev;
            document.body.style.overflow = next ? "hidden" : "";
            return next;
        });
    };

    if (!mounted) {
        return <div className="plugin-page" style={{ minHeight: "100vh" }} />;
    }

    return (
        <div className="plugin-page">
            {/* ─── 1. Navigation ─── */}
            <nav className={`plugin-nav ${navScrolled ? "scrolled" : ""}`}>
                <div className="plugin-container plugin-nav__inner">
                    <a href="#" className="plugin-nav__logo">
                        <div className="plugin-nav__logo-icon">G</div>
                        <span>GEO Optimizer</span>
                    </a>
                    <div className="plugin-nav__links">
                        <a href="#features" className="plugin-nav__link">Features</a>
                        <a href="#install" className="plugin-nav__link">Install</a>
                        <a href="#examples" className="plugin-nav__link">Examples</a>
                        <a href="#faq" className="plugin-nav__link">FAQ</a>
                    </div>
                    <div className="plugin-nav__actions">
                        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                            {theme === "dark" ? "\u2600" : "\u263E"}
                        </button>
                        <a href="/geo-optimizer.zip" className="btn btn--primary btn--small">Download Free</a>
                    </div>
                    <button
                        className={`plugin-nav__toggle ${mobileMenuOpen ? "active" : ""}`}
                        onClick={toggleMobileMenu}
                        aria-label="Toggle menu"
                    >
                        <span /><span /><span />
                    </button>
                </div>
            </nav>

            <div className={`nav-overlay ${mobileMenuOpen ? "active" : ""}`} onClick={closeMobileMenu} />
            <div className={`nav-mobile ${mobileMenuOpen ? "active" : ""}`}>
                <a href="#features" className="nav-mobile__link" onClick={closeMobileMenu}>Features</a>
                <a href="#install" className="nav-mobile__link" onClick={closeMobileMenu}>Install</a>
                <a href="#examples" className="nav-mobile__link" onClick={closeMobileMenu}>Examples</a>
                <a href="#faq" className="nav-mobile__link" onClick={closeMobileMenu}>FAQ</a>
                <a href="/geo-optimizer.zip" className="btn btn--primary" onClick={closeMobileMenu}>Download Free</a>
            </div>

            {/* ─── 2. Hero ─── */}
            <section className="hero">
                <div className="plugin-container">
                    <div className="hero__badge animate-in">
                        <span className="hero__badge-dot" />
                        Free &amp; Open Source WordPress Plugin
                    </div>

                    <h1 className="hero__title animate-in delay-1">
                        AI Generative Search
                        <br />
                        <span className="hero__gradient">Optimizer</span>
                    </h1>

                    <p className="hero__subtitle animate-in delay-2">
                        Make your WordPress content visible to ChatGPT, Google SGE,
                        Perplexity, DeepSeek, and every AI search engine — with structured
                        data, entity optimization, and GEO scoring. No coding required.
                    </p>

                    <div className="hero__buttons animate-in delay-3">
                        <a href="/geo-optimizer.zip" className="btn btn--primary btn--large">
                            Download Free Plugin
                        </a>
                        <a href="#features" className="btn btn--secondary btn--large">
                            See Features
                        </a>
                    </div>

                    <p className="hero__meta animate-in delay-4">
                        WordPress 6.0+ &middot; PHP 7.4+ &middot; <strong>v1.0.0</strong>
                    </p>
                </div>
            </section>

            {/* ─── 3. Harsh Reality ─── */}
            <section className="plugin-section plugin-section--alt">
                <div className="plugin-container text-center">
                    <span className="section-eyebrow animate-in">The Problem</span>
                    <h2 className="section-title animate-in delay-1">
                        Traditional SEO Is No Longer Enough
                    </h2>
                    <p className="section-subtitle section-subtitle--center animate-in delay-2">
                        AI search engines are replacing link-based results with generated
                        answers. If your content isn&apos;t structured for AI, you&apos;re invisible.
                    </p>

                    <div className="reality-grid">
                        {[
                            { number: "60%", text: "of Google searches now end without a click — AI answers the question directly." },
                            { number: "0%", text: "of WordPress sites have content optimized for generative AI search engines." },
                            { number: "4x", text: "higher citation rate for pages with structured data and entity markup." },
                        ].map((stat, i) => (
                            <div key={i} className="card animate-in" style={{ transitionDelay: `${0.1 + i * 0.1}s` }}>
                                <div className="reality-card__number">{stat.number}</div>
                                <p className="reality-card__text">{stat.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── 4. Solution (Before / After) ─── */}
            <section className="plugin-section">
                <div className="plugin-container">
                    <div className="text-center">
                        <span className="section-eyebrow animate-in">The Solution</span>
                        <h2 className="section-title animate-in delay-1">
                            Make AI Understand Your Content
                        </h2>
                        <p className="section-subtitle section-subtitle--center animate-in delay-2">
                            GEO Optimizer transforms raw WordPress posts into AI-ready
                            content with structured data, entity signals, and readability
                            optimizations.
                        </p>
                    </div>

                    <div className="solution-grid">
                        <div className="card animate-in delay-1">
                            <span className="solution-card__label solution-card__label--before">Before</span>
                            <ul className="solution-list">
                                <li><span className="icon icon--x">&times;</span>No structured data markup</li>
                                <li><span className="icon icon--x">&times;</span>AI engines can&apos;t identify entities</li>
                                <li><span className="icon icon--x">&times;</span>Content not quotable by AI</li>
                                <li><span className="icon icon--x">&times;</span>Missing FAQ / HowTo schema</li>
                                <li><span className="icon icon--x">&times;</span>No GEO readiness score</li>
                            </ul>
                        </div>
                        <div className="card card--accent animate-in delay-2">
                            <span className="solution-card__label solution-card__label--after">After GEO Optimizer</span>
                            <ul className="solution-list">
                                <li><span className="icon icon--check">&#10003;</span>Auto-generated JSON-LD (FAQ, HowTo, Article, Product)</li>
                                <li><span className="icon icon--check">&#10003;</span>Entity optimization with sameAs links</li>
                                <li><span className="icon icon--check">&#10003;</span>AI-quotable content scoring</li>
                                <li><span className="icon icon--check">&#10003;</span>Schema validation against Schema.org</li>
                                <li><span className="icon icon--check">&#10003;</span>Comprehensive GEO readiness score</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── 5. Key Features ─── */}
            <section id="features" className="plugin-section plugin-section--alt">
                <div className="plugin-container">
                    <div className="text-center">
                        <span className="section-eyebrow animate-in">Features</span>
                        <h2 className="section-title animate-in delay-1">
                            Everything You Need for AI Search
                        </h2>
                        <p className="section-subtitle section-subtitle--center animate-in delay-2">
                            Eight powerful features — zero configuration. Install, activate, optimize.
                        </p>
                    </div>

                    <div className="features-grid">
                        {[
                            { icon: "\uD83D\uDCCB", title: "Schema Generation", desc: "Auto-detect content type and generate FAQ, HowTo, Article, Product, or LocalBusiness JSON-LD." },
                            { icon: "\uD83C\uDFAF", title: "Entity Optimization", desc: "Extract entities, suggest sameAs links, and add Schema.org about properties for AI understanding." },
                            { icon: "\uD83D\uDCCA", title: "Readability Score", desc: "Score content quotability, answer-readiness, structure, conciseness, and authority signals." },
                            { icon: "\u2B50", title: "GEO Score", desc: "Comprehensive readiness score with letter grade, dimension breakdown, and actionable recommendations." },
                            { icon: "\u2705", title: "Schema Validation", desc: "Validate existing JSON-LD against Schema.org specs — catch errors before search engines do." },
                            { icon: "\uD83D\uDDA5\uFE0F", title: "No-Code Dashboard", desc: "WordPress admin panel shows scores and recommendations — no technical knowledge needed." },
                            { icon: "\u26A1", title: "Lightweight", desc: "Under 50KB. No bloat, no slow queries, no external CSS/JS. Pure performance." },
                            { icon: "\uD83E\uDD16", title: "Auto-Detect", desc: "Automatically identifies FAQs, HowTo steps, products, and articles — no manual tagging." },
                        ].map((f, i) => (
                            <div key={i} className="card feature-card animate-in" style={{ transitionDelay: `${0.05 + i * 0.06}s` }}>
                                <div className="feature-card__icon">{f.icon}</div>
                                <div className="feature-card__title">{f.title}</div>
                                <p className="feature-card__desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── 6. Why Now ─── */}
            <section className="plugin-section">
                <div className="plugin-container text-center">
                    <span className="section-eyebrow animate-in">Urgency</span>
                    <h2 className="section-title animate-in delay-1">
                        The AI Search Shift Is Happening Now
                    </h2>
                    <p className="section-subtitle section-subtitle--center animate-in delay-2">
                        Every major search provider is deploying generative AI answers.
                        Sites that adapt first will capture the most citations.
                    </p>

                    <div className="urgency-grid">
                        {[
                            { icon: "\uD83C\uDF0D", title: "Google SGE", desc: "Search Generative Experience is rolling out globally. AI answers appear above organic results." },
                            { icon: "\uD83D\uDCAC", title: "ChatGPT Search", desc: "OpenAI now indexes the web directly. Content with schema markup gets cited 4x more often." },
                            { icon: "\uD83D\uDD0D", title: "Perplexity & DeepSeek", desc: "AI-native search engines are growing 300% year-over-year. Early movers dominate citations." },
                        ].map((item, i) => (
                            <div key={i} className="card urgency-card animate-in" style={{ transitionDelay: `${0.1 + i * 0.1}s` }}>
                                <div className="urgency-card__icon">{item.icon}</div>
                                <div className="urgency-card__title">{item.title}</div>
                                <p className="urgency-card__desc">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── 7. Perfect For ─── */}
            <section className="plugin-section plugin-section--alt">
                <div className="plugin-container text-center">
                    <span className="section-eyebrow animate-in">Who It&apos;s For</span>
                    <h2 className="section-title animate-in delay-1">Built for WordPress Creators</h2>

                    <div className="audience-grid">
                        {[
                            { icon: "\u270D\uFE0F", title: "Bloggers & Publishers", desc: "Auto-generate FAQ and Article schema from your posts. Get cited as a source in AI answers without writing a single line of code." },
                            { icon: "\uD83D\uDED2", title: "E-Commerce Stores", desc: "Product and LocalBusiness schema for WooCommerce. Help AI shopping assistants recommend your products." },
                            { icon: "\uD83D\uDCC8", title: "SEO Professionals", desc: "GEO scoring, entity analysis, and readability metrics give you the data to optimize for the next era of search." },
                        ].map((a, i) => (
                            <div key={i} className="card audience-card animate-in" style={{ transitionDelay: `${0.1 + i * 0.1}s` }}>
                                <div className="audience-card__icon">{a.icon}</div>
                                <div className="audience-card__title">{a.title}</div>
                                <p className="audience-card__desc">{a.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── 8. Install Instructions ─── */}
            <section id="install" className="plugin-section">
                <div className="plugin-container text-center">
                    <span className="section-eyebrow animate-in">Get Started</span>
                    <h2 className="section-title animate-in delay-1">Install in 3 Steps</h2>
                    <p className="section-subtitle section-subtitle--center animate-in delay-2">
                        No configuration. No API keys. Just install, activate, and your content is optimized.
                    </p>

                    <div className="install-grid">
                        {[
                            { num: 1, title: "Download", desc: "Download the free plugin ZIP from this page or search \"GEO Optimizer\" in the WordPress plugin directory." },
                            { num: 2, title: "Activate", desc: "Upload to wp-content/plugins or install directly from your WordPress admin. Click Activate." },
                            { num: 3, title: "Optimize", desc: "Visit any post or page — GEO Optimizer automatically analyzes content and injects optimized schema markup." },
                        ].map((step, i) => (
                            <div key={i} className="card install-step animate-in" style={{ transitionDelay: `${0.1 + i * 0.1}s` }}>
                                <div className="install-step__number">{step.num}</div>
                                <div className="install-step__title">{step.title}</div>
                                <p className="install-step__desc">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── 9. Example Cases ─── */}
            <section id="examples" className="plugin-section plugin-section--alt">
                <div className="plugin-container">
                    <div className="text-center">
                        <span className="section-eyebrow animate-in">Examples</span>
                        <h2 className="section-title animate-in delay-1">See It In Action</h2>
                        <p className="section-subtitle section-subtitle--center animate-in delay-2">
                            Real before/after examples of content optimized for AI search.
                        </p>
                    </div>

                    <div className="examples-grid">
                        {/* Recipe HowTo */}
                        <div className="card example-card animate-in delay-1">
                            <div className="example-card__header">
                                <span className="example-card__badge">HowTo</span>
                                <span className="example-card__type">Recipe Blog Post</span>
                            </div>
                            <div className="example-card__body">
                                <div className="example-card__before">
                                    <div className="example-card__label">Before</div>
                                    <p className="example-card__text">
                                        Plain text recipe with no structured data. AI search engines
                                        skip it for competitor recipes that have schema markup.
                                    </p>
                                </div>
                                <div className="example-card__arrow">&darr;</div>
                                <div className="example-card__after">
                                    <div className="example-card__label">After</div>
                                    <div className="example-card__code">{`{
  "@type": "HowTo",
  "name": "Classic Banana Bread",
  "step": [
    { "@type": "HowToStep",
      "text": "Preheat oven to 350F" },
    { "@type": "HowToStep",
      "text": "Mash 3 ripe bananas" }
  ]
}`}</div>
                                </div>
                            </div>
                        </div>

                        {/* SaaS FAQ */}
                        <div className="card example-card animate-in delay-2">
                            <div className="example-card__header">
                                <span className="example-card__badge">FAQPage</span>
                                <span className="example-card__type">SaaS Pricing Page</span>
                            </div>
                            <div className="example-card__body">
                                <div className="example-card__before">
                                    <div className="example-card__label">Before</div>
                                    <p className="example-card__text">
                                        FAQ section with questions and answers but no schema.
                                        ChatGPT never cites the page when users ask about pricing.
                                    </p>
                                </div>
                                <div className="example-card__arrow">&darr;</div>
                                <div className="example-card__after">
                                    <div className="example-card__label">After</div>
                                    <div className="example-card__code">{`{
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Is there a free plan?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Yes, free forever..."
    }
  }]
}`}</div>
                                </div>
                            </div>
                        </div>

                        {/* Local Business Entity */}
                        <div className="card example-card animate-in delay-3">
                            <div className="example-card__header">
                                <span className="example-card__badge">LocalBusiness</span>
                                <span className="example-card__type">Local Service Page</span>
                            </div>
                            <div className="example-card__body">
                                <div className="example-card__before">
                                    <div className="example-card__label">Before</div>
                                    <p className="example-card__text">
                                        About page mentions the business name and address but AI
                                        search can&apos;t connect it to the Knowledge Graph entity.
                                    </p>
                                </div>
                                <div className="example-card__arrow">&darr;</div>
                                <div className="example-card__after">
                                    <div className="example-card__label">After</div>
                                    <div className="example-card__code">{`{
  "@type": "LocalBusiness",
  "name": "Joe's Plumbing",
  "sameAs": [
    "https://yelp.com/biz/..."
  ],
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Austin"
  }
}`}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── 10. FAQ ─── */}
            <section id="faq" className="plugin-section">
                <div className="plugin-container">
                    <div className="text-center">
                        <span className="section-eyebrow animate-in">FAQ</span>
                        <h2 className="section-title animate-in delay-1">
                            Frequently Asked Questions
                        </h2>
                    </div>

                    <div className="faq-list">
                        {[
                            {
                                q: "Is GEO Optimizer really free?",
                                a: "Yes, 100% free and open source. There are no premium tiers, no upsells, and no usage limits. The full feature set is available to everyone.",
                            },
                            {
                                q: "Which WordPress versions are supported?",
                                a: "GEO Optimizer supports WordPress 6.0 and above with PHP 7.4+. It works with the Classic Editor, Block Editor (Gutenberg), and all major page builders.",
                            },
                            {
                                q: "What schema types does it generate?",
                                a: "Currently supports FAQPage, HowTo, Article, Product, and LocalBusiness. The plugin auto-detects content type and generates the appropriate schema. More types coming soon.",
                            },
                            {
                                q: "Does it slow down my site?",
                                a: "No. The plugin is under 50KB with zero frontend JavaScript and no external CSS. Schema markup is injected server-side as a lightweight JSON-LD script tag.",
                            },
                            {
                                q: "Will this work with WooCommerce?",
                                a: "Yes. GEO Optimizer detects WooCommerce product pages and generates Product schema with price, availability, and review data automatically.",
                            },
                            {
                                q: "How is this different from Yoast or Rank Math?",
                                a: "Traditional SEO plugins focus on Google's link-based algorithm. GEO Optimizer is purpose-built for generative AI search — it optimizes for quotability, entity recognition, and answer-readiness that AI models use to select sources.",
                            },
                        ].map((faq, i) => (
                            <div key={i} className="faq-item animate-in" style={{ transitionDelay: `${0.05 + i * 0.05}s` }}>
                                <div className="faq-item__question">{faq.q}</div>
                                <p className="faq-item__answer">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── 11. Final CTA ─── */}
            <section className="plugin-section plugin-section--dark final-cta">
                <div className="plugin-container">
                    <h2 className="final-cta__title animate-in">
                        Stop Being Invisible to AI Search
                    </h2>
                    <p className="final-cta__subtitle animate-in delay-1">
                        Install GEO Optimizer today and make your WordPress content the
                        source AI engines cite first.
                    </p>
                    <a href="/geo-optimizer.zip" className="btn btn--white btn--large animate-in delay-2">
                        Download Free Plugin
                    </a>
                </div>
            </section>

            {/* ─── 12. Footer ─── */}
            <footer className="plugin-footer">
                <div className="plugin-container">
                    <div className="plugin-footer__inner">
                        <a href="#" className="plugin-footer__brand">
                            <div className="plugin-footer__brand-icon">G</div>
                            GEO Optimizer
                        </a>
                        <div className="plugin-footer__links">
                            <a href="#features" className="plugin-footer__link">Features</a>
                            <a href="#install" className="plugin-footer__link">Install</a>
                            <a href="#faq" className="plugin-footer__link">FAQ</a>
                            <a href="https://github.com/vonroflo/geo_wpplugin" className="plugin-footer__link" target="_blank" rel="noopener noreferrer">GitHub</a>
                        </div>
                    </div>
                    <div className="plugin-footer__bottom">
                        <span className="plugin-footer__copy">
                            &copy; {new Date().getFullYear()} GEO Optimizer. Free &amp; open source.
                        </span>
                        <span className="plugin-footer__copy">v1.0.0</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
