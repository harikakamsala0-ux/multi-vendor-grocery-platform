"""
Visual similarity for product image search (CPU-only, no deep models).

- pHash / aHash / dHash: good for near-duplicates; different photos of the same item
  often score poorly on these alone.
- Color histogram signature: captures dominant colors (e.g. red/green for tomatoes)
  so a *different* photo of the same product type can still rank highly.

We rank the catalog with a weighted blend (histogram weighted highest) and return
top matches with no hard cutoff.
"""
from __future__ import annotations

import io
from typing import Any, Dict, List, Optional, Tuple

import requests

try:
    import imagehash
    from PIL import Image

    _HAS_DEPS = True
except ImportError:
    _HAS_DEPS = False

# Marginal RGB histogram: 4 bins per channel → 12 dims, L1-normalized per channel group.
_COLOR_BINS = 12


def _color_signature_from_pil(img: Image.Image) -> List[float]:
    img = img.convert("RGB").resize((64, 64), Image.Resampling.LANCZOS)
    w, h = img.size
    n = float(w * h)
    bins = [0.0] * _COLOR_BINS
    for r, g, b in img.getdata():
        bins[min(r // 64, 3)] += 1
        bins[4 + min(g // 64, 3)] += 1
        bins[8 + min(b // 64, 3)] += 1
    return [x / n for x in bins]


def histogram_distance(
    query_sig: Optional[List[float]], prod_sig: Optional[List[float]]
) -> float:
    """
    Cosine-based distance, scaled to roughly 0–70 (comparable to hash Hamming distances).
    Lower = more similar colors.
    """
    if (
        not query_sig
        or not prod_sig
        or len(query_sig) != len(prod_sig)
        or len(query_sig) != _COLOR_BINS
    ):
        return 45.0
    dot = sum(a * b for a, b in zip(query_sig, prod_sig))
    na = sum(a * a for a in query_sig) ** 0.5
    nb = sum(b * b for b in prod_sig) ** 0.5
    if na < 1e-12 or nb < 1e-12:
        return 45.0
    cos = max(0.0, min(1.0, dot / (na * nb)))
    return (1.0 - cos) * 70.0


def visual_index_from_bytes(data: bytes) -> Optional[Dict[str, Any]]:
    """All features for one image (upload or downloaded bytes)."""
    if not _HAS_DEPS or not data:
        return None
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
        ph = str(imagehash.phash(img))
        ah = str(imagehash.average_hash(img))
        dh = str(imagehash.dhash(img))
        sig = _color_signature_from_pil(img)
        return {
            "image_phash": ph,
            "image_ahash": ah,
            "image_dhash": dh,
            "image_color_sig": sig,
        }
    except Exception:
        return None


def image_hashes_from_bytes(data: bytes) -> Tuple[Optional[str], Optional[str]]:
    """Backward-compatible (phash, ahash)."""
    idx = visual_index_from_bytes(data)
    if not idx:
        return None, None
    return idx["image_phash"], idx["image_ahash"]


def phash_hex_from_bytes(data: bytes) -> Optional[str]:
    ph, _ = image_hashes_from_bytes(data)
    return ph


def visual_index_from_url(url: str, timeout: int = 12) -> Optional[Dict[str, Any]]:
    if not url or not str(url).strip().startswith("http"):
        return None
    try:
        r = requests.get(url, timeout=timeout, stream=True)
        r.raise_for_status()
        return visual_index_from_bytes(r.content)
    except Exception:
        return None


def image_hashes_from_url(url: str, timeout: int = 10) -> Tuple[Optional[str], Optional[str]]:
    idx = visual_index_from_url(url, timeout=timeout)
    if not idx:
        return None, None
    return idx["image_phash"], idx["image_ahash"]


def phash_hex_from_url(url: str, timeout: int = 8) -> Optional[str]:
    ph, _ = image_hashes_from_url(url, timeout=timeout)
    return ph


def hamming(a_hex: str, b_hex: str) -> int:
    if not _HAS_DEPS or not a_hex or not b_hex:
        return 999
    try:
        ha = imagehash.hex_to_hash(a_hex)
        hb = imagehash.hex_to_hash(b_hex)
        return int(ha - hb)
    except Exception:
        return 999


def combined_similarity_score(
    query: Dict[str, Any],
    product: Dict,
) -> Tuple[float, int, int, int, float]:
    """
    Lower = more similar.
    Returns (combined, ph_dist, ah_dist, dh_dist, hist_dist).
    """
    q_ph = query.get("image_phash") or ""
    q_ah = query.get("image_ahash") or ""
    q_dh = query.get("image_dhash") or ""
    q_sig = query.get("image_color_sig")

    ph_dist = hamming(q_ph, product.get("image_phash") or "")
    ah_p = product.get("image_ahash")
    if q_ah and ah_p:
        ah_dist = hamming(q_ah, ah_p)
    else:
        ah_dist = ph_dist

    pdh = product.get("image_dhash") or ""
    if q_dh and pdh:
        dh_dist = hamming(q_dh, pdh)
    else:
        dh_dist = int((ph_dist + ah_dist) / 2)

    p_sig = product.get("image_color_sig")
    hist_dist = histogram_distance(
        q_sig if isinstance(q_sig, list) else None,
        p_sig if isinstance(p_sig, list) else None,
    )

    # Histogram dominates so different photos of the same *kind* of item still surface.
    w_ph, w_ah, w_dh, w_h = 0.18, 0.12, 0.15, 0.55
    combined = w_ph * ph_dist + w_ah * ah_dist + w_dh * float(dh_dist) + w_h * hist_dist
    return combined, ph_dist, ah_dist, dh_dist, hist_dist


def rank_by_image_similarity(
    query: Dict[str, Any],
    products: List[dict],
    limit: int = 20,
) -> List[Tuple[dict, float, int, int, int, float]]:
    """
    Rank products that have image_phash. No distance cutoff.
    Returns (product, combined, ph_d, ah_d, dh_d, hist_d).
    """
    scored: List[Tuple[dict, float, int, int, int, float]] = []
    for p in products:
        if not p.get("image_phash"):
            continue
        comb, ph_d, ah_d, dh_d, hi_d = combined_similarity_score(query, p)
        scored.append((p, comb, ph_d, ah_d, dh_d, hi_d))
    scored.sort(key=lambda x: (x[1], x[2]))
    return scored[:limit]


def match_tier(combined: float) -> str:
    if combined <= 22:
        return "strong"
    if combined <= 38:
        return "medium"
    return "weak"
