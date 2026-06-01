"""
Lightweight review NLP for academic / demo use (no GPU).
- Sentiment: VADER (vaderSentiment); keyword fallback if unavailable.
- Summary: extractive snippets from review comments.
- Fraud heuristics: rule-based flags for admin review.
"""
from __future__ import annotations

import hashlib
import re
from typing import Any, Dict, List, Tuple

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

    _vader = SentimentIntensityAnalyzer()
except ImportError:
    _vader = None

_POS_WORDS = (
    "great good excellent love best amazing perfect happy satisfied quality fast "
    "recommend awesome wonderful smooth nice thank thanks reliable value"
).split()
_NEG_WORDS = (
    "bad worst terrible hate poor broken slow scam fake awful disappointed waste "
    "never again horrible rude damaged late missing refund issue problem"
).split()


def analyze_sentiment(text: str) -> Tuple[str, float, Dict[str, float]]:
    """Return (label, compound, scores dict)."""
    t = (text or "").strip()
    if _vader and t:
        scores = _vader.polarity_scores(t)
        compound = float(scores["compound"])
        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"
        return label, compound, {k: float(v) for k, v in scores.items()}

    # Keyword fallback
    low = t.lower()
    pos = sum(1 for w in _POS_WORDS if w in low)
    neg = sum(1 for w in _NEG_WORDS if w in low)
    if pos > neg:
        label, compound = "positive", 0.3
    elif neg > pos:
        label, compound = "negative", -0.3
    else:
        label, compound = "neutral", 0.0
    return label, compound, {"pos": 0.0, "neg": 0.0, "neu": 1.0, "compound": compound}


def normalize_comment_key(comment: str) -> str:
    return " ".join((comment or "").lower().split())


def comment_fingerprint(comment: str) -> str:
    return hashlib.sha256(normalize_comment_key(comment).encode()).hexdigest()


def detect_fraud_signals(
    comment: str,
    rating: int,
    sentiment_compound: float,
    duplicate_count_same_vendor: int,
) -> Tuple[List[str], str]:
    """
    Returns (reason_codes, risk): risk in low | medium | high.
    """
    flags: List[str] = []
    c = (comment or "").strip()

    if len(c) < 8 and c:
        flags.append("very_short_text")
    if len(c) > 10 and re.search(r"(.)\1{7,}", c):
        flags.append("repetitive_characters")

    if rating >= 4 and sentiment_compound < -0.25:
        flags.append("rating_high_but_text_negative")
    if rating <= 2 and sentiment_compound > 0.45:
        flags.append("rating_low_but_text_positive")

    if duplicate_count_same_vendor > 1:
        flags.append("duplicate_or_near_duplicate_text")

    risk = "low"
    if len(flags) >= 2 or "duplicate_or_near_duplicate_text" in flags:
        risk = "high"
    elif flags:
        risk = "medium"

    return flags, risk


def build_review_summary(reviews: List[Dict[str, Any]], max_chars: int = 420) -> str:
    """Extractive summary from multiple review bodies."""
    parts: List[str] = []
    for r in reviews:
        c = (r.get("comment") or "").strip()
        if len(c) < 12:
            continue
        # First sentence or chunk
        m = re.split(r"(?<=[.!?])\s+", c)
        snippet = (m[0] if m else c)[:160].strip()
        if snippet and snippet not in parts:
            parts.append(snippet)
        if len(parts) >= 4:
            break

    if not parts:
        n = len(reviews)
        if n == 0:
            return "No written comments yet—ratings only."
        return f"Customers left {n} review(s); most comments are very short."

    body = " ".join(parts)
    if len(body) > max_chars:
        body = body[: max_chars - 3].rsplit(" ", 1)[0] + "…"
    return f"What customers are saying: {body}"


def sentiment_breakdown(reviews: List[Dict[str, Any]]) -> Dict[str, int]:
    out = {"positive": 0, "neutral": 0, "negative": 0}
    for r in reviews:
        lab = (r.get("sentiment_label") or "neutral").lower()
        if lab in out:
            out[lab] += 1
        else:
            out["neutral"] += 1
    return out
