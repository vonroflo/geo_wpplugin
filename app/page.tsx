"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import "./landing.css";

// Feature preview content
const trackingMockup = `
<div class="mockup-container">
  <div class="mockup-header">
    <div class="mockup-title">Live AI Mentions</div>
    <div class="mockup-badge-live"><span class="live-dot"></span> Real-time</div>
  </div>
  <div class="mockup-feed">
    <div class="mention-item">
      <div class="mention-platform chatgpt">ChatGPT</div>
      <div class="mention-content">
        <div class="mention-query">"Best project management tools for startups"</div>
        <div class="mention-result"><span class="mention-cited">Cited</span> Ranked #2 in response</div>
      </div>
      <div class="mention-time">2m ago</div>
    </div>
    <div class="mention-item">
      <div class="mention-platform claude">Claude</div>
      <div class="mention-content">
        <div class="mention-query">"How to improve team productivity"</div>
        <div class="mention-result"><span class="mention-cited">Cited</span> Primary recommendation</div>
      </div>
      <div class="mention-time">5m ago</div>
    </div>
    <div class="mention-item">
      <div class="mention-platform perplexity">Perplexity</div>
      <div class="mention-content">
        <div class="mention-query">"Top SaaS tools 2026"</div>
        <div class="mention-result"><span class="mention-missed">Not cited</span> Competitor mentioned</div>
      </div>
      <div class="mention-time">8m ago</div>
    </div>
    <div class="mention-item">
      <div class="mention-platform gemini">Gemini</div>
      <div class="mention-content">
        <div class="mention-query">"Software recommendations for remote teams"</div>
        <div class="mention-result"><span class="mention-cited">Cited</span> Listed in top 5</div>
      </div>
      <div class="mention-time">12m ago</div>
    </div>
  </div>
</div>`;

const scoreMockup = `
<div class="mockup-container">
  <div class="mockup-header">
    <div class="mockup-title">GEO Score Dashboard</div>
    <div class="mockup-period">Last 30 days</div>
  </div>
  <div class="score-dashboard">
    <div class="score-main">
      <div class="score-ring-large">
        <svg viewBox="0 0 120 120" class="score-svg">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="8" style="color: var(--border)"/>
          <circle cx="60" cy="60" r="54" fill="none" stroke="url(#scoreGradient)" stroke-width="8" stroke-linecap="round" stroke-dasharray="339.292" stroke-dashoffset="91" transform="rotate(-90 60 60)" class="score-circle-animated"/>
          <defs><linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#00D4AA"/><stop offset="100%" stop-color="#00B894"/></linearGradient></defs>
        </svg>
        <div class="score-value-large" id="scoreValue">0</div>
      </div>
      <div class="score-change-positive">+12 pts vs last month</div>
    </div>
    <div class="score-breakdown">
      <div class="breakdown-item"><div class="breakdown-label">Citations</div><div class="breakdown-bar"><div class="breakdown-fill" data-width="78"></div></div><div class="breakdown-value">78%</div></div>
      <div class="breakdown-item"><div class="breakdown-label">Sentiment</div><div class="breakdown-bar"><div class="breakdown-fill" data-width="85"></div></div><div class="breakdown-value">85%</div></div>
      <div class="breakdown-item"><div class="breakdown-label">Accuracy</div><div class="breakdown-bar"><div class="breakdown-fill" data-width="92"></div></div><div class="breakdown-value">92%</div></div>
      <div class="breakdown-item"><div class="breakdown-label">Coverage</div><div class="breakdown-bar"><div class="breakdown-fill" data-width="61"></div></div><div class="breakdown-value">61%</div></div>
    </div>
  </div>
</div>`;

const optimizationMockup = `
<div class="mockup-container">
  <div class="mockup-header">
    <div class="mockup-title">Optimization Recommendations</div>
    <div class="mockup-badge-score">+18 pts potential</div>
  </div>
  <div class="optimization-list">
    <div class="optimization-item high">
      <div class="optimization-priority">High Impact</div>
      <div class="optimization-content">
        <div class="optimization-title">Add structured FAQ schema</div>
        <div class="optimization-desc">Your FAQ page lacks schema markup. Adding this could increase citation rate by 23%.</div>
      </div>
      <div class="optimization-impact">+8 pts</div>
    </div>
    <div class="optimization-item medium">
      <div class="optimization-priority">Medium Impact</div>
      <div class="optimization-content">
        <div class="optimization-title">Improve entity definitions</div>
        <div class="optimization-desc">Define your product category more clearly in meta descriptions and headings.</div>
      </div>
      <div class="optimization-impact">+5 pts</div>
    </div>
    <div class="optimization-item medium">
      <div class="optimization-priority">Medium Impact</div>
      <div class="optimization-content">
        <div class="optimization-title">Create comparison content</div>
        <div class="optimization-desc">AI models frequently cite comparison pages. Create "vs" content for top competitors.</div>
      </div>
      <div class="optimization-impact">+5 pts</div>
    </div>
  </div>
</div>`;

const codeBlock = `
<div class="code-block" id="codeBlock">
  <div class="code-line" style="margin-bottom: 8px;">
    <span class="code-comment">// Get your GEO Score via API</span>
  </div>
  <div class="code-line">
    <span class="code-keyword">const</span> response = <span class="code-keyword">await</span> fetch(
  </div>
  <div class="code-line" style="padding-left: 20px;">
    <span class="code-string">'https://api.georank.io/v1/score'</span>,
  </div>
  <div class="code-line" style="padding-left: 20px;">{</div>
  <div class="code-line" style="padding-left: 40px;">
    headers: { <span class="code-string">'Authorization'</span>: <span class="code-string">\`Bearer \${API_KEY}\`</span> }
  </div>
  <div class="code-line" style="padding-left: 20px;">})</div>
  <div class="code-line" style="margin-top: 16px;">
    <span class="code-keyword">const</span> { score, platforms, recommendations } =
  </div>
  <div class="code-line" style="padding-left: 20px;">
    <span class="code-keyword">await</span> response.json()
  </div>
  <div class="code-line" style="margin-top: 16px;">
    <span class="code-comment">// Response:</span>
  </div>
  <div class="code-line" style="color: var(--text-light);">
    // { score: 73, platforms: { chatgpt: 47, claude: 62, ... } }
  </div>
</div>`;

const mockups = [trackingMockup, scoreMockup, optimizationMockup, codeBlock];

export default function LandingPage() {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);
    const [activeFeature, setActiveFeature] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [navScrolled, setNavScrolled] = useState(false);
    const scoreValueRef = useRef<HTMLSpanElement>(null);
    const scoreRingRef = useRef<HTMLDivElement>(null);
    const featurePreviewRef = useRef<HTMLDivElement>(null);

    // Initialize theme from localStorage
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("georank_theme");
        if (stored === "dark" || stored === "light") {
            setTheme(stored);
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark");
        }
    }, []);

    // Apply theme to document
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
        localStorage.setItem("georank_theme", theme);
    }, [theme, mounted]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    // Animate GEO Score on load
    useEffect(() => {
        if (!mounted) return;
        const targetScore = 73;
        let currentScore = 0;

        const timeout = setTimeout(() => {
            const interval = setInterval(() => {
                if (currentScore >= targetScore) {
                    clearInterval(interval);
                    return;
                }
                currentScore++;
                if (scoreValueRef.current) {
                    scoreValueRef.current.textContent = String(currentScore);
                }
                if (scoreRingRef.current) {
                    scoreRingRef.current.style.setProperty(
                        "--score-deg",
                        currentScore * 3.6 + "deg"
                    );
                }
            }, 25);
        }, 500);

        return () => clearTimeout(timeout);
    }, [mounted]);

    // Scroll animations using Intersection Observer
    useEffect(() => {
        if (!mounted) return;

        const scrollElements = document.querySelectorAll(
            ".animate-in, .animate-in-left, .animate-in-right, .animate-in-scale, .scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale"
        );

        const observerOptions = {
            root: null,
            rootMargin: "0px 0px -50px 0px",
            threshold: 0.1,
        };

        const observerCallback: IntersectionObserverCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible", "in-view");
                    entry.target.classList.remove("out-view");
                }
            });
        };

        const scrollObserver = new IntersectionObserver(
            observerCallback,
            observerOptions
        );

        scrollElements.forEach((el) => {
            scrollObserver.observe(el);
        });

        return () => scrollObserver.disconnect();
    }, [mounted]);

    // Stat number animation
    useEffect(() => {
        if (!mounted) return;

        const statNumbers = document.querySelectorAll(".stat-number");
        const statObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const target = entry.target as HTMLElement;
                    if (entry.isIntersecting && !target.dataset.animated) {
                        target.dataset.animated = "true";
                        const text = target.textContent || "";
                        const number = parseInt(text.replace(/[^0-9]/g, ""));
                        const suffix = text.replace(/[0-9]/g, "");
                        let current = 0;
                        const duration = 1500;
                        const increment = number / (duration / 16);

                        const counter = setInterval(() => {
                            current += increment;
                            if (current >= number) {
                                current = number;
                                clearInterval(counter);
                            }
                            target.textContent = Math.round(current) + suffix;
                        }, 16);
                    }
                });
            },
            { threshold: 0.5 }
        );

        statNumbers.forEach((el) => statObserver.observe(el));

        return () => statObserver.disconnect();
    }, [mounted]);

    // Nav scroll effect
    useEffect(() => {
        if (!mounted) return;

        const handleScroll = () => {
            setNavScrolled(window.pageYOffset > 50);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [mounted]);

    // Feature card click handler
    const handleFeatureClick = useCallback((index: number) => {
        setActiveFeature(index);

        // Animate breakdown bars for GEO Score mockup
        if (index === 1) {
            setTimeout(() => {
                const bars = document.querySelectorAll(".breakdown-fill");
                bars.forEach((bar, i) => {
                    const el = bar as HTMLElement;
                    const width = el.getAttribute("data-width");
                    setTimeout(() => {
                        el.style.width = width + "%";
                    }, i * 100);
                });

                // Animate score counter
                const scoreEl = document.getElementById("scoreValue");
                if (scoreEl) {
                    let count = 0;
                    const target = 73;
                    const duration = 1000;
                    const increment = target / (duration / 16);

                    setTimeout(() => {
                        const counter = setInterval(() => {
                            count += increment;
                            if (count >= target) {
                                count = target;
                                clearInterval(counter);
                            }
                            scoreEl.textContent = String(Math.round(count));
                        }, 16);
                    }, 500);
                }
            }, 300);
        }
    }, []);

    // Code copy handler
    const handleCodeCopy = useCallback(() => {
        const codeText = `// Get your GEO Score via API
const response = await fetch(
  'https://api.georank.io/v1/score',
  {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  })
const { score, platforms, recommendations } =
  await response.json()
// Response:
// { score: 73, platforms: { chatgpt: 47, claude: 62, ... } }`;

        navigator.clipboard.writeText(codeText).then(() => {
            const codeBlock = document.getElementById("codeBlock");
            if (codeBlock) {
                codeBlock.classList.add("copied");
                setTimeout(() => {
                    codeBlock.classList.remove("copied");
                }, 2000);
            }
        });
    }, []);

    // Close mobile menu on link click
    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
        document.body.style.overflow = "";
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen((prev) => {
            const newState = !prev;
            document.body.style.overflow = newState ? "hidden" : "";
            return newState;
        });
    };

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <div
                className="landing-page"
                style={{ minHeight: "100vh", background: "#FAFAFA" }}
            />
        );
    }

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className={`landing-nav ${navScrolled ? "scrolled" : ""}`}>
                <div className="landing-container">
                    <Link href="/" className="landing-logo">
                        <div className="logo-icon">G</div>
                        <span className="logo-text">GeoRank</span>
                    </Link>
                    <div className="nav-links">
                        <a href="#features" className="nav-link">
                            Features
                        </a>
                        <a href="#pricing" className="nav-link">
                            Pricing
                        </a>
                        <a href="#faq" className="nav-link">
                            FAQ
                        </a>
                        <Link href="/playground" className="nav-link">
                            Playground
                        </Link>
                    </div>
                    <div className="nav-buttons">
                        <button
                            className="theme-toggle"
                            onClick={toggleTheme}
                            title={
                                theme === "dark"
                                    ? "Switch to Light Mode"
                                    : "Switch to Dark Mode"
                            }
                        >
                            {theme === "dark" ? "☀️" : "🌙"}
                        </button>
                        <a href="#" className="btn btn-secondary btn-small">
                            Log in
                        </a>
                        <a href="#" className="btn btn-primary btn-small">
                            Get Started
                        </a>
                    </div>
                    <button
                        className={`nav-toggle ${mobileMenuOpen ? "active" : ""}`}
                        onClick={toggleMobileMenu}
                        aria-label="Toggle navigation menu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <div
                className={`nav-overlay ${mobileMenuOpen ? "active" : ""}`}
                onClick={closeMobileMenu}
            />

            {/* Mobile Menu */}
            <div className={`nav-mobile ${mobileMenuOpen ? "active" : ""}`}>
                <div className="nav-mobile-links">
                    <a
                        href="#features"
                        className="nav-mobile-link"
                        onClick={closeMobileMenu}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                            />
                        </svg>
                        Features
                    </a>
                    <a
                        href="#pricing"
                        className="nav-mobile-link"
                        onClick={closeMobileMenu}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Pricing
                    </a>
                    <a
                        href="#faq"
                        className="nav-mobile-link"
                        onClick={closeMobileMenu}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        FAQ
                    </a>
                    <Link
                        href="/playground"
                        className="nav-mobile-link"
                        onClick={closeMobileMenu}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                            />
                        </svg>
                        Playground
                    </Link>
                </div>
                <div className="nav-mobile-buttons">
                    <button
                        className="btn btn-secondary"
                        onClick={toggleTheme}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                        }}
                    >
                        {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
                    </button>
                    <a href="#" className="btn btn-secondary">
                        Log in
                    </a>
                    <a href="#" className="btn btn-primary">
                        Get Started
                    </a>
                </div>
            </div>

            {/* Hero Section */}
            <section className="hero">
                <div className="landing-container">
                    <div className="badge animate-in">
                        <span className="badge-dot"></span>
                        Now tracking 50M+ AI responses daily
                    </div>

                    <h1 className="hero-title animate-in delay-1">
                        Get Recommended by AI.
                        <br />
                        <span className="gradient-text">Not Buried by It.</span>
                    </h1>

                    <p className="hero-subtitle animate-in delay-2">
                        The GEO API that tracks your brand across ChatGPT, Claude,
                        Perplexity, and Google AI Overview—then optimizes your content to
                        get cited more.
                    </p>

                    <div className="hero-buttons animate-in delay-3">
                        <a href="#" className="btn btn-primary">
                            Start Free Trial
                        </a>
                        <Link href="/playground" className="btn btn-secondary">
                            Try Playground
                        </Link>
                    </div>

                    <p className="trust-text animate-in delay-4">
                        Trusted by 500+ innovative companies
                    </p>

                    <div className="logo-strip animate-in delay-4">
                        <span>Vercel</span>
                        <span>Linear</span>
                        <span>Notion</span>
                        <span>Figma</span>
                        <span>Stripe</span>
                        <span>Shopify</span>
                    </div>
                </div>
            </section>

            {/* Dashboard Preview */}
            <section className="dashboard-preview">
                <div className="landing-container">
                    <div className="dashboard-card animate-in-scale">
                        <div className="dashboard-header">
                            <div className="dashboard-dot dashboard-dot-red"></div>
                            <div className="dashboard-dot dashboard-dot-yellow"></div>
                            <div className="dashboard-dot dashboard-dot-green"></div>
                        </div>
                        <div className="dashboard-content">
                            <div className="geo-score-section animate-in-left delay-1">
                                <p className="section-label">Your GEO Score</p>
                                <div
                                    className="geo-score-ring"
                                    ref={scoreRingRef}
                                >
                                    <span
                                        className="geo-score-value"
                                        ref={scoreValueRef}
                                    >
                                        0
                                    </span>
                                </div>
                                <p className="geo-score-change">+23 points this month</p>
                            </div>
                            <div>
                                <p className="section-label">AI Platform Coverage</p>
                                <div className="platforms-grid">
                                    <div className="platform-card">
                                        <div className="platform-header">
                                            <span className="platform-name">ChatGPT</span>
                                            <span className="platform-score">47%</span>
                                        </div>
                                        <div className="platform-bar">
                                            <div
                                                className="platform-bar-fill"
                                                style={{ width: "47%" }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="platform-card">
                                        <div className="platform-header">
                                            <span className="platform-name">Claude</span>
                                            <span className="platform-score">62%</span>
                                        </div>
                                        <div className="platform-bar">
                                            <div
                                                className="platform-bar-fill"
                                                style={{ width: "62%" }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="platform-card">
                                        <div className="platform-header">
                                            <span className="platform-name">Perplexity</span>
                                            <span className="platform-score">38%</span>
                                        </div>
                                        <div className="platform-bar">
                                            <div
                                                className="platform-bar-fill"
                                                style={{ width: "38%" }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="platform-card">
                                        <div className="platform-header">
                                            <span className="platform-name">Gemini</span>
                                            <span className="platform-score">55%</span>
                                        </div>
                                        <div className="platform-bar">
                                            <div
                                                className="platform-bar-fill"
                                                style={{ width: "55%" }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="section section-white">
                <div className="landing-container">
                    <h2 className="section-title scroll-animate">
                        AI is Answering Questions Your Customers Ask.
                    </h2>
                    <p className="section-subtitle scroll-animate">Are you the answer?</p>

                    <div className="stats-grid stagger-children">
                        <div className="card stat-card scroll-animate">
                            <div className="stat-number">40%</div>
                            <p className="stat-label">
                                of searches now show AI-generated answers
                            </p>
                        </div>
                        <div className="card stat-card scroll-animate">
                            <div className="stat-number">65%</div>
                            <p className="stat-label">
                                of users trust AI recommendations over ads
                            </p>
                        </div>
                        <div className="card stat-card scroll-animate">
                            <div className="stat-number">&lt;1%</div>
                            <p className="stat-label">
                                of companies actively track their AI presence
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="section">
                <div className="landing-container">
                    <h2 className="section-title scroll-animate">
                        Full-Stack Generative Engine Optimization
                    </h2>
                    <p
                        className="section-subtitle scroll-animate"
                        style={{ maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}
                    >
                        Track, analyze, and optimize your brand&apos;s presence across every
                        major AI platform.
                    </p>

                    <div className="features-grid">
                        <div className="features-list">
                            {[
                                {
                                    icon: "📡",
                                    title: "Universal AI Tracking",
                                    desc: "Monitor mentions across ChatGPT, Claude, Gemini, Perplexity, and Google AI Overview in real-time.",
                                },
                                {
                                    icon: "📊",
                                    title: "GEO Score™",
                                    desc: "Proprietary visibility score that benchmarks your AI presence against competitors.",
                                },
                                {
                                    icon: "⚡",
                                    title: "Optimization Engine",
                                    desc: "AI-powered recommendations to increase your citation rate across all platforms.",
                                },
                                {
                                    icon: "🔧",
                                    title: "Developer-First API",
                                    desc: "RESTful API with SDKs for Python, Node, and Ruby. Webhooks included.",
                                },
                            ].map((feature, index) => (
                                <div
                                    key={index}
                                    className={`card feature-card ${activeFeature === index ? "active" : ""}`}
                                    onClick={() => handleFeatureClick(index)}
                                >
                                    <div className="feature-content">
                                        <span className="feature-icon">{feature.icon}</span>
                                        <div>
                                            <h3 className="feature-title">{feature.title}</h3>
                                            <p className="feature-desc">{feature.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div
                            className="card feature-preview"
                            style={{ padding: 0 }}
                        >
                            <div
                                key={activeFeature}
                                ref={featurePreviewRef}
                                style={{ display: "flex", flexDirection: "column", height: "100%" }}
                                dangerouslySetInnerHTML={{ __html: mockups[activeFeature] }}
                                onClick={activeFeature === 3 ? handleCodeCopy : undefined}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="section section-white">
                <div className="landing-container">
                    <h2 className="section-title scroll-animate">Live in 5 Minutes</h2>

                    <div className="steps-grid stagger-children" style={{ marginTop: 60 }}>
                        {[
                            {
                                num: 1,
                                title: "Connect Your Domain",
                                desc: "Add your domain and we start tracking immediately",
                            },
                            {
                                num: 2,
                                title: "Get Your GEO Score",
                                desc: "See exactly where you stand across all AI platforms",
                            },
                            {
                                num: 3,
                                title: "Follow the Playbook",
                                desc: "Get prioritized recommendations to increase citations",
                            },
                            {
                                num: 4,
                                title: "Watch Citations Grow",
                                desc: "Track improvements in real-time as you optimize",
                            },
                        ].map((step) => (
                            <div key={step.num} className="step scroll-animate">
                                <div className="step-number">{step.num}</div>
                                <h3 className="step-title">{step.title}</h3>
                                <p className="step-desc">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="section">
                <div className="landing-container">
                    <h2 className="section-title scroll-animate">
                        Trusted by Growth Leaders
                    </h2>

                    <div
                        className="testimonials-grid stagger-children"
                        style={{ marginTop: 60 }}
                    >
                        {[
                            {
                                metric: "+520%",
                                label: "AI mentions",
                                quote:
                                    '"We went from 0 AI citations to being the #1 recommended tool in our category in just 60 days."',
                                author: "Sarah Chen",
                                role: "CEO, DataFlow",
                            },
                            {
                                metric: "3x",
                                label: "qualified leads",
                                quote:
                                    "\"GeoRank's API integrated into our workflow in under an hour. The insights are game-changing.\"",
                                author: "Marcus Rodriguez",
                                role: "Head of Growth, Stackwise",
                            },
                            {
                                metric: "#1",
                                label: "in category",
                                quote:
                                    '"Finally, an SEO tool that understands the AI-first future. This is essential for any modern brand."',
                                author: "Emma Thompson",
                                role: "VP Marketing, NexGen",
                            },
                        ].map((testimonial, index) => (
                            <div key={index} className="card scroll-animate">
                                <div className="testimonial-metric">
                                    <div className="testimonial-metric-value">
                                        {testimonial.metric}
                                    </div>
                                    <div className="testimonial-metric-label">
                                        {testimonial.label}
                                    </div>
                                </div>
                                <p className="testimonial-quote">{testimonial.quote}</p>
                                <div className="testimonial-author">{testimonial.author}</div>
                                <div className="testimonial-role">{testimonial.role}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="section section-white">
                <div className="landing-container">
                    <h2 className="section-title scroll-animate">
                        Simple Pricing. Powerful Results.
                    </h2>
                    <p className="section-subtitle scroll-animate">
                        14-day free trial on all plans. No credit card required.
                    </p>

                    <div className="pricing-grid stagger-children">
                        {[
                            {
                                name: "Starter",
                                price: "$49",
                                features: [
                                    "1 domain",
                                    "1,000 tracks/month",
                                    "Basic API access",
                                    "Email support",
                                ],
                                popular: false,
                            },
                            {
                                name: "Growth",
                                price: "$149",
                                features: [
                                    "5 domains",
                                    "10,000 tracks/month",
                                    "Full API access",
                                    "Priority support",
                                ],
                                popular: true,
                            },
                            {
                                name: "Scale",
                                price: "$399",
                                features: [
                                    "20 domains",
                                    "50,000 tracks/month",
                                    "Full API access",
                                    "Slack support",
                                ],
                                popular: false,
                            },
                        ].map((plan) => (
                            <div
                                key={plan.name}
                                className={`card pricing-card scroll-animate-scale ${plan.popular ? "popular" : ""}`}
                            >
                                {plan.popular && (
                                    <span className="pricing-badge">Most Popular</span>
                                )}
                                <h3 className="pricing-name">{plan.name}</h3>
                                <div className="pricing-price">
                                    <span className="pricing-amount">{plan.price}</span>
                                    <span className="pricing-period">/month</span>
                                </div>
                                <ul className="pricing-features">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="pricing-feature">
                                            <span className="pricing-check">✓</span>
                                            <span className="pricing-feature-text">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href="#"
                                    className={`btn ${plan.popular ? "btn-primary" : "btn-secondary"}`}
                                    style={{ width: "100%" }}
                                >
                                    Start Free Trial
                                </a>
                            </div>
                        ))}
                    </div>

                    <p className="pricing-cta">
                        Need more?{" "}
                        <a href="#">Contact us for Enterprise pricing →</a>
                    </p>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="section">
                <div className="landing-container">
                    <h2 className="section-title scroll-animate">
                        Frequently Asked Questions
                    </h2>

                    <div
                        className="faq-container stagger-children"
                        style={{ marginTop: 60 }}
                    >
                        {[
                            {
                                question: "What AI platforms do you track?",
                                answer:
                                    "We track ChatGPT, Claude, Gemini, Perplexity, Google AI Overview, Bing Copilot, and more. We add new models monthly as the landscape evolves.",
                            },
                            {
                                question: "How quickly will I see results?",
                                answer:
                                    "You'll see your GEO Score immediately after connecting your domain. Most customers see measurable citation improvements within 30-60 days of following our optimization recommendations.",
                            },
                            {
                                question: "Do I need technical knowledge to use this?",
                                answer:
                                    "Not at all! Our dashboard is designed for marketers and non-technical users. The API is available for teams that want deeper integration, but it's completely optional.",
                            },
                            {
                                question: "How is this different from regular SEO tools?",
                                answer:
                                    "Traditional SEO tools track Google rankings. GeoRank tracks how AI models cite and recommend your brand—a completely different (and rapidly growing) traffic source that most companies are ignoring.",
                            },
                        ].map((faq, index) => (
                            <div key={index} className="faq-item scroll-animate">
                                <div className="faq-question">{faq.question}</div>
                                <div className="faq-answer">{faq.answer}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="section section-dark final-cta">
                <div className="landing-container">
                    <h2 className="section-title scroll-animate">
                        AI is Changing Search Forever.
                    </h2>
                    <p className="section-subtitle scroll-animate">Start winning today.</p>
                    <a href="#" className="btn btn-primary btn-large scroll-animate-scale">
                        Get Your Free GEO Score →
                    </a>
                    <p className="final-cta-note scroll-animate">
                        Takes 30 seconds. No credit card required.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-container">
                    <div className="footer-grid">
                        <div className="footer-brand">
                            <div className="footer-logo">
                                <div className="footer-logo-icon">G</div>
                                <span className="footer-logo-text">GeoRank</span>
                            </div>
                            <p className="footer-tagline">
                                The API that makes AI recommend your brand. Track, optimize,
                                and dominate AI search results.
                            </p>
                        </div>
                        <div>
                            <h4 className="footer-heading">Product</h4>
                            <ul className="footer-links">
                                <li>
                                    <a href="#">Features</a>
                                </li>
                                <li>
                                    <a href="#">Pricing</a>
                                </li>
                                <li>
                                    <a href="#">API Docs</a>
                                </li>
                                <li>
                                    <a href="#">Changelog</a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="footer-heading">Solutions</h4>
                            <ul className="footer-links">
                                <li>
                                    <a href="#">For SaaS</a>
                                </li>
                                <li>
                                    <a href="#">For eCommerce</a>
                                </li>
                                <li>
                                    <a href="#">For Agencies</a>
                                </li>
                                <li>
                                    <a href="#">Enterprise</a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="footer-heading">Resources</h4>
                            <ul className="footer-links">
                                <li>
                                    <a href="#">Blog</a>
                                </li>
                                <li>
                                    <a href="#">Case Studies</a>
                                </li>
                                <li>
                                    <a href="#">Free Tools</a>
                                </li>
                                <li>
                                    <a href="#">GEO Guide</a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="footer-heading">Company</h4>
                            <ul className="footer-links">
                                <li>
                                    <a href="#">About</a>
                                </li>
                                <li>
                                    <a href="#">Careers</a>
                                </li>
                                <li>
                                    <a href="#">Contact</a>
                                </li>
                                <li>
                                    <a href="#">Twitter</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <span>© 2026 GeoRank. All rights reserved.</span>
                        <div className="footer-bottom-links">
                            <a href="#">Privacy</a>
                            <a href="#">Terms</a>
                            <a href="#">Security</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
