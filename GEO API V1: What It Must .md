## Competitive GEO API V1: What It Must Deliver

Marketers want 4 outcomes:

1. **Am I showing up in AI answers for my money intents?**
2. **Who shows up instead (competitors) + where?**
3. **Why am I missing (diagnosis tied to evidence)?**
4. **Exactly what to do next (prioritized playbook with estimated impact)?**

So V1 is: **Scan → Score → Explain → Prescribe**.

---

## API Design Principles

* **Module-based** (GEO stays the "engine")
* **Evidence-first** recommendations (every action ties to competitor patterns + sources)
* **Async jobs** for scans (AI/provider runs can take time)
* **Stable objects** for reporting + trend tracking

---

## Endpoints (V1)

> **Base Path:** `/api/v1`

### A) Brands

**1) Create Brand**
`POST /api/v1/brands`

Input: `{ name, domain?, aliases[] }`

Output: Brand object with `id`

**2) List Brands**
`GET /api/v1/brands?limit=50&cursor=...`

Returns paginated list of brands.

**3) Get Brand**
`GET /api/v1/brands/{brand_id}`

**4) Update Brand**
`PATCH /api/v1/brands/{brand_id}`

---

### B) Scans

**5) Create Scan (async)**
`POST /api/v1/geo/scans`

Input: brand (by ID or inline object), domain, category, market (location), intents, optional competitors, AI sources.

Output: `{ scan_id, status: "queued" }`

**6) Get Scan**
`GET /api/v1/geo/scans/{scan_id}`

Returns: per-intent results, mentions, competitor mentions, citations/evidence, timestamps.

**7) List Scans**
`GET /api/v1/geo/scans?brand_id=...&limit=50`

---

### C) Scores & Share of Voice

**8) Visibility Score**
`GET /api/v1/geo/scores?scan_id=...&include_breakdown=true`

Outputs:

* `visibility_score` (0–100)
* `share_of_voice` overall + by intent
* `top_competitors` with their scores
* `breakdown` (optional - what drove the score)

---

### D) Competitive Intelligence

**9) Winners by Intent**
`GET /api/v1/geo/competitors/winners?scan_id=...`

Returns top brands showing up per intent + frequency + provider distribution.

**10) Competitor Pattern Map (the "what they're doing")**
`POST /api/v1/geo/competitors/patterns`

Input: `{ scan_id, competitor: { name, domain? }, focus[] }`

Returns structured patterns like:

* page types (location pages, comparison pages, "best of" lists, docs, pricing pages)
* schema patterns
* review velocity / third-party footprints (where applicable)
* entity associations (what topics they're consistently tied to)

**11) Head-to-Head**
`POST /api/v1/geo/competitors/head-to-head`

Input: `{ scan_id, competitor: { name, domain? }, intents[]? }`

Brand vs competitor per intent:

* who wins
* why (evidence)
* what gaps you have vs them

---

### E) Diagnostics ("Why am I invisible?")

**12) Visibility Diagnostics**
`GET /api/v1/geo/diagnostics?scan_id=...`

Returns ranked gaps with:

* severity (low, medium, high, critical)
* impacted intents
* evidence (examples of competitor proof)
* suggested fixes

Examples of gap types:

* **Entity clarity gap** (brand not strongly associated with service/topic)
* **Coverage gap** (missing location/service pages, missing FAQs)
* **Authority gap** (citations and third-party mentions are weak)
* **Conversion-to-citation gap** (content exists but not "AI-quotable")

---

### F) Recommendations ("What do I do next?")

**13) Action Plan**
`POST /api/v1/geo/recommendations/action-plan`

Input: `{ scan_id, goal, time_horizon_days }`

Goals: `increase_mentions`, `increase_top_recommendations`, `beat_competitor`, `improve_sov`

Output: prioritized actions with:

* estimated lift (visibility_score_delta, share_of_voice_delta)
* effort estimate (low, medium, high)
* linked evidence (competitor examples + what intent it helps)
* tasks checklist

**14) Content Briefs**
`POST /api/v1/geo/recommendations/content-briefs`

Input: `{ scan_id, brief_type, intents[]? }`

Brief types: `landing_page`, `blog_post`, `faq_page`, `comparison_page`

Generates:

* page outline + headings
* FAQs that match intents
* schema checklist
* internal linking suggestions
* "AI quote blocks" (short factual snippets that get cited)

---

### G) Tracking Over Time

**15) Trends**
`GET /api/v1/geo/trends?brand_id=...&window=90d`

Windows: `7d`, `30d`, `90d`, `180d`, `365d`

Shows:

* score changes over time
* share-of-voice changes
* series data points with dates

---

### H) Reports

**16) Agency Report**
`GET /api/v1/geo/reports/scan/{scan_id}?goal=...&time_horizon_days=30`

Full analysis report combining:

* Scan data
* Score summary
* Competitor winners
* Diagnostics
* Action plan
* Optional narrative and suggested briefs

---

### I) Unified Insights (Orchestration)

**17) Start Insights Run**
`POST /api/v1/geo/insights`

Single endpoint for marketers - combines brand creation, scan, and report generation.

Input:
```json
{
  "brand": { "name": "Acme Corp", "domain": "acme.com" },
  "market": { "location": "Austin, TX", "radius_miles": 50 },
  "category": "Software Development",
  "intents": [{ "text": "best software companies", "funnel_stage": "awareness" }],
  "competitors": [{ "name": "TechCorp", "domain": "techcorp.com" }],
  "ai_sources": ["chatgpt", "gemini", "perplexity"],
  "report_options": { "goal": "increase_mentions", "time_horizon_days": 30 }
}
```

Output: `{ run_id, status: "processing" }`

**18) Get Insights Run Status**
`GET /api/v1/geo/insights/{run_id}`

Returns unified response with:

* Brand info
* Scan status
* Visibility scores
* Mentions list
* Competitor winners
* Diagnostics gaps
* Recommendations

---

## Core Objects (Data Model)

Keep these consistent:

* **Brand** `{id, name, domain, aliases[], created_at, updated_at}`
* **Market** `{location, radius_miles, language}`
* **Intent** `{text, funnel_stage, priority}`
* **Provider** `{chatgpt, perplexity, gemini, claude}`
* **Scan** `{id, brand_id, brand, market, intents[], providers[], competitors[], mentions[], status, created_at, completed_at, error}`
* **Mention** `{subject, provider, intent_text, presence, rank_bucket, confidence, evidence[]}`
* **Evidence** `{type: "citation_url|snippet|structured_signal|review_signal|entity_signal", source_url, excerpt, provider_context}`
* **Gap** `{type, severity, impact, affected_intents[], competitor_examples[], evidence[], recommended_actions[]}`
* **Recommendation** `{priority, action, why, estimated_lift, effort, tasks[], affected_intents[], evidence[]}`

---

## Scoring (Simple, Shippable V1)

You can start with an interpretable formula:

**Visibility Score (0–100)** weighted from:

* Mention Rate (per intent/provider)
* Position Premium (top vs mid-list mention)
* Citation Strength (presence + quality of citations)
* Share of Voice vs competitors
* Consistency across providers

Keep the weights configurable server-side so you can iterate without breaking clients.

---

## Implementation Architecture

**Current Stack:**

* **API**: Next.js 14 App Router (API routes)
* **Database**: Firebase Firestore
* **Workers/Queue**: Google Cloud Tasks
* **Validation**: Zod schemas
* **Styling**: Tailwind CSS 4

**Collections:**

* `brands` - Brand documents
* `scans` - Scan documents (with `mentions` sub-collection)
* `scan_scores` - Cached score summaries
* `scan_winners` - Competitor winners analysis
* `scan_diagnostics` - Diagnostics results
* `scan_h2h` - Head-to-head comparison results
* `scan_patterns` - Competitor patterns results
* `scan_action_plans` - Generated action plans
* `scan_content_briefs` - Generated content briefs
* `brand_trends` - Brand trend series data

**Internal Endpoints (Workers):**

* `POST /api/internal/tasks/scan-worker` - Processes scan job queue
* `POST /api/internal/tasks/compute-worker` - Processes compute job queue (diagnostics, action plans, etc.)

---

## Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created (new resource) |
| 202 | Accepted (async job started) |
| 400 | Invalid request (validation failed) |
| 401 | Unauthorized |
| 404 | Not found |
| 429 | Rate limited |
| 500 | Internal error |

---

## Playground

Interactive API testing available at `/playground` with two modes:

* **Real Test Mode** - Unified form using `/api/v1/geo/insights` endpoint
* **Dev Mode** - Individual endpoint tester for all atomic endpoints
