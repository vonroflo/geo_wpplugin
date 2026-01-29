// /lib/geo-plugin/readability-service.ts
// AI readability analysis service for the WordPress GEO Plugin.
// Combines deterministic heuristic scoring with OpenAI-powered qualitative analysis.

import { analyzeContentReadability } from "@/lib/ai/geo-plugin-ai";
import type {
    ReadabilityAnalyzeRequest,
    ReadabilityAnalyzeResponse,
} from "@/lib/geo-plugin-zod";

/* =========================================================================
   Constants
   ========================================================================= */

/** Words that add length without adding information density. */
const FILLER_WORDS = new Set([
    "actually", "basically", "certainly", "clearly", "completely",
    "definitely", "effectively", "essentially", "extremely", "fairly",
    "frankly", "generally", "honestly", "hopefully", "ideally",
    "importantly", "incredibly", "indeed", "interestingly", "just",
    "largely", "literally", "mainly", "merely", "naturally",
    "normally", "obviously", "overall", "particularly", "perhaps",
    "possibly", "practically", "presumably", "primarily", "probably",
    "quite", "rather", "really", "relatively", "seriously",
    "significantly", "simply", "slightly", "somehow", "somewhat",
    "specifically", "strongly", "surely", "totally", "truly",
    "typically", "ultimately", "undoubtedly", "unfortunately",
    "unnecessarily", "usually", "very", "virtually",
]);

/** Patterns that signal a direct, definitive statement AI models prefer to quote. */
const DEFINITIVE_PATTERNS = [
    /\bis\b.{1,60}\bthe\b/i,
    /\bare\b.{1,60}\bthe\b/i,
    /\bdefined as\b/i,
    /\brefers to\b/i,
    /\bmeans that\b/i,
    /\baccording to\b/i,
    /\bresearch shows\b/i,
    /\bstudies? (show|indicate|suggest|demonstrate|reveal|confirm)/i,
    /\bin (fact|summary|conclusion|short|brief)\b/i,
    /\bthe (key|main|primary|most important)\b/i,
];

/** Patterns that indicate a factual claim backed by data. */
const FACTUAL_CLAIM_PATTERNS = [
    /\d+(\.\d+)?%/,
    /\$[\d,]+(\.\d{2})?/,
    /\b\d{4}\b/,
    /\b(million|billion|trillion)\b/i,
    /\b(study|survey|report|analysis|data) (from|by|published|conducted)\b/i,
];

/** Patterns indicating question-answer / FAQ-style content. */
const QUESTION_PATTERNS = [
    /^(what|who|where|when|why|how|is|are|can|do|does|should|will|would|could)\b.+\?$/im,
    /\bwhat is\b/i,
    /\bhow (to|do|does|can|should)\b/i,
    /\bwhy (is|are|do|does|should)\b/i,
];

const DIRECT_ANSWER_PATTERNS = [
    /^(yes|no|the answer is|in short|to summarize|the short answer)/im,
    /\bthe (best|top|most|fastest|easiest|simplest) way (to|is)\b/i,
    /\bhere('s| is| are) (how|what|why|the)\b/i,
    /\bstep \d+:/i,
    /\btl;?dr\b/i,
];

/** Regex to detect citations, references, or source attributions. */
const CITATION_PATTERNS = [
    /\bsource:/i,
    /\b(according to|as reported by|as noted by|as stated by)\b/i,
    /\[([\d,;\s]+)\]/,
    /\(\d{4}\)/,
    /\bet al\.\b/i,
    /\bcited in\b/i,
    /\breference[sd]?\b/i,
];

const EXPERTISE_MARKERS = [
    /\b(expert|specialist|professional|authority|researcher|scientist|analyst|professor|dr\.)\b/i,
    /\b(years of experience|certified|accredited|peer[- ]reviewed)\b/i,
    /\b(industry[- ]leading|award[- ]winning|best[- ]in[- ]class)\b/i,
    /\b(proprietary|methodology|framework|model)\b/i,
];

const STATISTIC_PATTERNS = [
    /\d+(\.\d+)?%/,
    /\b\d+x\b/i,
    /\b(increased|decreased|grew|declined|rose|fell) by\b/i,
    /\b(average|median|mean)\b/i,
    /\b(survey|poll|census|sample size)\b/i,
];

/* =========================================================================
   Utility helpers
   ========================================================================= */

/** Split raw content into sentences (rough but effective for scoring). */
function splitSentences(text: string): string[] {
    return text
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

/** Split content into words (lowercased). */
function splitWords(text: string): string[] {
    return text.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
}

/** Count how many of the given regex patterns appear in the text. */
function countPatternMatches(text: string, patterns: RegExp[]): number {
    return patterns.reduce((count, pat) => count + (pat.test(text) ? 1 : 0), 0);
}

/** Clamp a value between 0 and a maximum. */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** Round to nearest integer. */
function round(value: number): number {
    return Math.round(value);
}

/* =========================================================================
   Heuristic scoring functions
   ========================================================================= */

/**
 * Score quotability (0-100).
 * Higher when content contains short definitive statements, factual claims,
 * and a healthy distribution of sentence lengths.
 */
function scoreQuotability(content: string, sentences: string[]): number {
    if (sentences.length === 0) return 0;

    // 1. Sentence length distribution (ideal: mix of short + medium)
    const lengths = sentences.map((s) => splitWords(s).length);
    const shortSentences = lengths.filter((l) => l >= 5 && l <= 20).length;
    const shortRatio = shortSentences / sentences.length;
    const distributionScore = clamp(shortRatio * 100, 0, 40);

    // 2. Definitive statements
    const definitiveHits = countPatternMatches(content, DEFINITIVE_PATTERNS);
    const definitiveScore = clamp(definitiveHits * 8, 0, 30);

    // 3. Factual claims
    const factualHits = countPatternMatches(content, FACTUAL_CLAIM_PATTERNS);
    const factualScore = clamp(factualHits * 6, 0, 30);

    return round(distributionScore + definitiveScore + factualScore);
}

/**
 * Score answer readiness (0-100).
 * Higher when content explicitly poses questions and provides direct answers.
 */
function scoreAnswerReadiness(content: string, hasFaqSection: boolean): number {
    // 1. Question presence
    const questionHits = countPatternMatches(content, QUESTION_PATTERNS);
    const questionScore = clamp(questionHits * 10, 0, 35);

    // 2. Direct answer patterns
    const directHits = countPatternMatches(content, DIRECT_ANSWER_PATTERNS);
    const directScore = clamp(directHits * 10, 0, 30);

    // 3. FAQ section bonus
    const faqBonus = hasFaqSection ? 20 : 0;

    // 4. Content that starts with a direct answer (first 300 chars)
    const intro = content.slice(0, 300);
    const introBonus = DIRECT_ANSWER_PATTERNS.some((p) => p.test(intro)) ? 15 : 0;

    return round(clamp(questionScore + directScore + faqBonus + introBonus, 0, 100));
}

/**
 * Score structure (0-100).
 * Higher for well-organized content with headings, lists, and reasonable paragraphs.
 */
function scoreStructure(content: string, headings: string[]): number {
    // 1. Heading count and hierarchy
    const headingCount = headings.length;
    const headingScore = clamp(headingCount * 5, 0, 30);

    // 2. List usage (unordered or ordered list indicators)
    const listMatches = content.match(/^[\s]*[-*\u2022]\s|^\s*\d+[.)]\s/gm);
    const listCount = listMatches?.length ?? 0;
    const listScore = clamp(listCount * 3, 0, 25);

    // 3. Paragraph structure (split on double newline)
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const avgParagraphLength = paragraphs.length > 0
        ? paragraphs.reduce((sum, p) => sum + splitWords(p).length, 0) / paragraphs.length
        : 0;

    // Ideal paragraph length: 40-120 words
    let paragraphScore: number;
    if (avgParagraphLength >= 40 && avgParagraphLength <= 120) {
        paragraphScore = 25;
    } else if (avgParagraphLength >= 20 && avgParagraphLength <= 200) {
        paragraphScore = 15;
    } else if (avgParagraphLength > 0) {
        paragraphScore = 5;
    } else {
        paragraphScore = 0;
    }

    // 4. Has a conclusion / summary section
    const hasSummary = /\b(conclusion|summary|key takeaway|in summary|to summarize|bottom line)\b/i.test(content);
    const summaryBonus = hasSummary ? 10 : 0;

    // 5. Multiple paragraphs bonus
    const multiParagraphBonus = paragraphs.length >= 3 ? 10 : paragraphs.length >= 2 ? 5 : 0;

    return round(clamp(headingScore + listScore + paragraphScore + summaryBonus + multiParagraphBonus, 0, 100));
}

/**
 * Score conciseness (0-100).
 * Rewards shorter average sentence length, low filler ratio, and high information density.
 */
function scoreConciseness(content: string, sentences: string[], words: string[]): number {
    if (words.length === 0) return 0;

    // 1. Average sentence length (ideal: 12-18 words)
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    let sentenceLengthScore: number;
    if (avgSentenceLength >= 10 && avgSentenceLength <= 20) {
        sentenceLengthScore = 40;
    } else if (avgSentenceLength >= 8 && avgSentenceLength <= 25) {
        sentenceLengthScore = 30;
    } else if (avgSentenceLength < 8) {
        sentenceLengthScore = 20; // Too choppy
    } else {
        // > 25 words on average
        sentenceLengthScore = Math.max(0, 40 - (avgSentenceLength - 20) * 2);
    }

    // 2. Filler word ratio
    const fillerCount = words.filter((w) => FILLER_WORDS.has(w)).length;
    const fillerRatio = fillerCount / words.length;
    // < 3% filler is great, > 8% is poor
    let fillerScore: number;
    if (fillerRatio < 0.03) {
        fillerScore = 35;
    } else if (fillerRatio < 0.05) {
        fillerScore = 25;
    } else if (fillerRatio < 0.08) {
        fillerScore = 15;
    } else {
        fillerScore = 5;
    }

    // 3. Information density (unique meaningful words / total words)
    const uniqueWords = new Set(words.filter((w) => w.length > 3 && !FILLER_WORDS.has(w)));
    const densityRatio = uniqueWords.size / words.length;
    const densityScore = clamp(densityRatio * 60, 0, 25);

    return round(clamp(sentenceLengthScore + fillerScore + densityScore, 0, 100));
}

/**
 * Score authority signals (0-100).
 * Rewards presence of data, statistics, citations, and expertise markers.
 */
function scoreAuthoritySignals(content: string): number {
    // 1. Statistics and data
    const statHits = countPatternMatches(content, STATISTIC_PATTERNS);
    const statScore = clamp(statHits * 8, 0, 30);

    // 2. Citations
    const citationHits = countPatternMatches(content, CITATION_PATTERNS);
    const citationScore = clamp(citationHits * 10, 0, 30);

    // 3. Expertise markers
    const expertiseHits = countPatternMatches(content, EXPERTISE_MARKERS);
    const expertiseScore = clamp(expertiseHits * 8, 0, 25);

    // 4. Specific numbers (indicates data-driven content)
    const numberMatches = content.match(/\b\d[\d,.]*\b/g);
    const numberCount = numberMatches?.length ?? 0;
    const numberScore = clamp(numberCount * 2, 0, 15);

    return round(clamp(statScore + citationScore + expertiseScore + numberScore, 0, 100));
}

/* =========================================================================
   Weighted overall score
   ========================================================================= */

const SCORE_WEIGHTS = {
    quotability: 0.25,
    answer_readiness: 0.20,
    structure: 0.20,
    conciseness: 0.15,
    authority_signals: 0.20,
} as const;

function computeOverall(scores: Omit<ReadabilityAnalyzeResponse["scores"], "overall">): number {
    const weighted =
        scores.quotability * SCORE_WEIGHTS.quotability +
        scores.answer_readiness * SCORE_WEIGHTS.answer_readiness +
        scores.structure * SCORE_WEIGHTS.structure +
        scores.conciseness * SCORE_WEIGHTS.conciseness +
        scores.authority_signals * SCORE_WEIGHTS.authority_signals;

    return round(clamp(weighted, 0, 100));
}

/* =========================================================================
   Public API
   ========================================================================= */

/**
 * Analyze content readability for AI engines.
 *
 * Scoring is performed deterministically via heuristics for speed and
 * reproducibility. The qualitative analysis (strengths, weaknesses, snippet
 * candidates, missing elements) is delegated to OpenAI for richer insight.
 */
export async function analyzeReadability(
    input: ReadabilityAnalyzeRequest,
): Promise<ReadabilityAnalyzeResponse> {
    const { content, title, headings = [], has_faq_section = false } = input;

    const sentences = splitSentences(content);
    const words = splitWords(content);

    // ---------- Heuristic scores ----------
    const quotability = scoreQuotability(content, sentences);
    const answer_readiness = scoreAnswerReadiness(content, has_faq_section);
    const structure = scoreStructure(content, headings);
    const conciseness = scoreConciseness(content, sentences, words);
    const authority_signals = scoreAuthoritySignals(content);

    const dimensionScores = { quotability, answer_readiness, structure, conciseness, authority_signals };
    const overall = computeOverall(dimensionScores);

    // ---------- OpenAI qualitative analysis ----------
    const aiAnalysis = await analyzeContentReadability(content, title, headings);

    return {
        scores: {
            overall,
            ...dimensionScores,
        },
        analysis: {
            strengths: aiAnalysis.strengths,
            weaknesses: aiAnalysis.weaknesses,
            ai_snippet_candidates: aiAnalysis.ai_snippet_candidates,
            missing_elements: aiAnalysis.missing_elements,
        },
        analyzed_at: new Date().toISOString(),
    };
}
