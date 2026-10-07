"""Explainable content-based matcher (M2 report, section 3).

Score = 100 x [0.25 Position + 0.30 Skills + 0.15 Age + 0.10 Location + 0.10 Experience + 0.10 Goals]

Pure functions. Inputs are any objects with the attributes used below (ORM rows,
dataclasses, SimpleNamespace), so the same code runs in the API, the seed script and tests.
"""

import math

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Initial design choices, to be tested by ablation. Not learned values.
WEIGHTS = {"position": 0.25, "skills": 0.30, "age": 0.15, "location": 0.10, "experience": 0.10, "goals": 0.10}

LEVELS = ["beginner", "district", "state", "national", "professional"]

# Small related-position table (football + a few other sports). Symmetric lookup.
RELATED_POSITIONS = {
    frozenset({"central midfielder", "attacking midfielder"}),
    frozenset({"central midfielder", "defensive midfielder"}),
    frozenset({"attacking midfielder", "winger"}),
    frozenset({"winger", "striker"}),
    frozenset({"centre back", "full back"}),
    frozenset({"centre back", "defensive midfielder"}),
    frozenset({"batter", "wicket keeper"}),
    frozenset({"all rounder", "batter"}),
    frozenset({"all rounder", "bowler"}),
    frozenset({"point guard", "shooting guard"}),
    frozenset({"small forward", "power forward"}),
    frozenset({"sprinter", "hurdler"}),
}

AGE_TOLERANCE = 1  # years outside the range still allowed, at a reduced score


def _norm(s):
    return (s or "").strip().lower()


def eligible(athlete, opp) -> bool:
    """Hard rules: same sport, age within range (+ tolerance). Eligibility is a constraint, not a preference."""
    if _norm(athlete.sport) != _norm(opp.sport):
        return False
    if athlete.age is None:
        return True
    lo = (opp.age_min or 0) - AGE_TOLERANCE
    hi = (opp.age_max or 200) + AGE_TOLERANCE
    return lo <= athlete.age <= hi


def position_score(pos, wanted) -> float:
    wanted = {_norm(p) for p in (wanted or [])}
    pos = _norm(pos)
    if not wanted:
        return 1.0  # open to all positions
    if pos in wanted:
        return 1.0
    if any(frozenset({pos, w}) in RELATED_POSITIONS for w in wanted):
        return 0.6
    return 0.0


def skills_score(have, want) -> float:
    """Cosine similarity of binary skill vectors."""
    a, b = {_norm(s) for s in have or []}, {_norm(s) for s in want or []}
    if not b:
        return 1.0
    if not a:
        return 0.0
    return len(a & b) / math.sqrt(len(a) * len(b))


def age_score(age, lo, hi) -> float:
    if age is None:
        return 0.5
    if (lo is None or age >= lo) and (hi is None or age <= hi):
        return 1.0
    return 0.5  # inside tolerance band only


def location_score(athlete, opp) -> float:
    if not opp.city:
        return 1.0  # open / online
    if _norm(athlete.city) == _norm(opp.city):
        return 1.0
    if athlete.region and _norm(athlete.region) == _norm(opp.region):
        return 0.6
    return 0.2


def experience_score(have, want) -> float:
    if not want or want not in LEVELS or have not in LEVELS:
        return 1.0 if not want else 0.5
    gap = abs(LEVELS.index(have) - LEVELS.index(want))
    return {0: 1.0, 1: 0.6}.get(gap, 0.2)


def goals_scores(goals, texts) -> list[float]:
    """TF-IDF cosine between the athlete's goals and each opportunity description.
    ponytail: TF-IDF only. Swap in Sentence-BERT embeddings (week 3) when RAM allows; Render free tier has 512 MB."""
    if not goals or not any(texts):
        return [0.5] * len(texts)
    m = TfidfVectorizer(stop_words="english").fit_transform([goals, *[t or "" for t in texts]])
    return [float(x) for x in cosine_similarity(m[0], m[1:])[0]]


def combine(components: dict) -> float:
    return round(100 * sum(WEIGHTS[k] * components[k] for k in WEIGHTS), 1)


def explain(components: dict, athlete, opp, score: float) -> list[str]:
    head = "Strong match" if score >= 80 else "Good match" if score >= 60 else "Partial match"
    reasons = [head]
    if components["position"] == 1.0 and opp.positions:
        reasons.append("Position matches")
    elif components["position"] >= 0.6:
        reasons.append("Related position")
    common = sorted({_norm(s) for s in athlete.skills or []} & {_norm(s) for s in opp.skills or []})
    if common:
        reasons.append("Skill overlap on " + " and ".join(common[:3]))
    if components["age"] == 1.0 and (opp.age_min or opp.age_max):
        reasons.append("Age within range")
    if components["location"] == 1.0 and opp.city:
        reasons.append("Same city")
    elif components["location"] == 0.6:
        reasons.append("Same region")
    if components["experience"] == 1.0 and opp.level:
        reasons.append("Level fits")
    return reasons


def rank(athlete, opps, k: int = 10) -> list[dict]:
    """Filter, score, rank. Returns top-k [{opportunity, score, components, reasons}]."""
    pool = [o for o in opps if eligible(athlete, o)]
    goals = goals_scores(athlete.goals, [o.description for o in pool])
    out = []
    for o, g in zip(pool, goals):
        c = {
            "position": position_score(athlete.position, o.positions),
            "skills": round(skills_score(athlete.skills, o.skills), 3),
            "age": age_score(athlete.age, o.age_min, o.age_max),
            "location": location_score(athlete, o),
            "experience": experience_score(athlete.level, o.level),
            "goals": round(g, 3),
        }
        s = combine(c)
        out.append({"opportunity": o, "score": s, "components": c, "reasons": explain(c, athlete, o, s)})
    out.sort(key=lambda r: r["score"], reverse=True)
    return out[:k]
