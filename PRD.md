# Ground Up: Product Requirements

Source of scope: `Ground Up_ Sports AI Career Assistant, M2 Report (1).html` (Team: Parikshit Dagar, Mehul Jakhmola. Guide: Dr Mala Saraswat).

## 1. Problem
Young athletes, especially outside big academies and metro cities, cannot find trials, scholarships, tournaments and scouts that fit them. Opportunities are scattered across social media, local networks and word of mouth. Search by sport or city returns long lists that ignore position, skills, age eligibility and level. Organisations posting opportunities get the mirror problem: lots of applicants who don't meet requirements.

## 2. Product
Ground Up is a sports network that connects athletes, coaches, scouts and teams. At its core is an **explainable recommender**: given a structured athlete profile and a pool of opportunities, it returns a ranked list with a 0-100 compatibility score and the reasons behind each score.

> The score measures how well a profile matches an opportunity's stated requirements. It does **not** measure an athlete's true potential.

## 3. Personas
| Persona | Need |
|---|---|
| Athlete (professional mode) | Find opportunities that fit, understand why, get scouted |
| Athlete (casual mode) | Play, follow people, join local events |
| Scout / organisation / team | Post opportunities, receive fitting applicants |
| Coach | Follow and promote athletes |

## 4. Goals / non-goals
**Goals (Stage 1)**
- Verified onboarding: Google sign-in, ID verification request, profile setup with Pro/Casual mode.
- Home feed with posts, "People you may know", "Upcoming opportunities".
- Opportunity matching: hard eligibility filter, weighted score, top-K, explanations.
- Evaluation of the matcher (Precision@K, Recall@K, NDCG@K vs filter-only and random baselines).
- Architecture that runs on free tiers now and moves to AWS for ~1M users without a rewrite.

**Non-goals (Stage 1)**
- Real Aadhaar/KYC checks (needs a licensed provider).
- Phone OTP (SMS costs money; UI shows "coming soon").
- Media upload, messaging, collaborative filtering (needs interaction data), deep neural recommenders.

## 5. Features
| ID | Feature | Status |
|---|---|---|
| F1 | Auth: Google sign-in (+ local dev sign-in) issuing JWT | Built (needs Google client ID) |
| F2 | ID verification request (doc type + status; never store ID number) | Built (status = pending; no provider) |
| F3 | Profile setup: mode, sport, position, age, city, region, level, skills, goals, bio | Built |
| F4 | Feed: create post, list posts (keyset pagination) | Built |
| F5 | Opportunities: immersive tilt-card gallery with expand-to-detail, filters, sort; synthetic generator (fixed seed, labelled `synthetic`) | Built. Apply flow and org posting UI: planned |
| F6 | Matching engine: filter, score 0-100, rank, explain | Built (TF-IDF for goals; embeddings planned) |
| F7 | People you may know (content similarity on profiles) | Built (simple) |
| F8 | Evaluation module (NDCG@K, baselines, ablation, human-rated sample) | Planned week 3-4 |
| F9 | Sentence-BERT for goals/description text | Planned week 3 |
| F10 | Optional RF / GBM re-ranking | Planned week 4, only if labels allow |

## 6. Matching method
1. Hard filter: same sport; age within `[age_min-1, age_max+1]`.
2. Component scores in [0,1]: position (exact 1.0, related 0.6), skills (cosine), age (in range 1.0, tolerance band 0.5), location (city 1.0, region 0.6, else 0.2), experience (level gap 0 → 1.0, 1 → 0.6, else 0.2), goals (TF-IDF cosine).
3. `Score = 100 x [0.25 Pos + 0.30 Skills + 0.15 Age + 0.10 Loc + 0.10 Exp + 0.10 Goals]`. Weights are design choices, to be tested by ablation.
4. Top-K, each with reasons ("Strong match. Position matches. Skill overlap on passing and vision. Age within range. Same city.").

Worked example from the report (score 93.5) is a unit test: `api/tests/test_matching.py`.

## 7. Non-functional requirements
| Area | Stage 1 (free tier) | Stage 2 (AWS) target |
|---|---|---|
| Users | Hundreds (dev, demo) | 1M registered, ~50k DAU, ~2k RPS peak |
| API p95 | < 800 ms warm (cold start up to ~50 s on Render free) | < 200 ms reads, < 400 ms recommendations |
| Availability | Best effort | 99.9% |
| Data | Neon free 0.5 GB | Aurora Postgres, read replicas, PITR |
| Privacy | No ID numbers stored; JWT auth; HTTPS | + KMS encryption, audit logs, DPDP Act compliance |

## 8. Milestones (from report, section 6)
| Week | Work |
|---|---|
| 1 | Backend + DB setup, public athlete dataset, synthetic generator, preprocessing |
| 2 | Feature extraction, hard filters, weighted matcher, ranking, API endpoint |
| 3 | Embedding text similarity, explanation module, evaluation (baselines, ablation, NDCG@K), wire to opportunities panel |
| 4 | Integration, human-rated sample, optional RF re-ranking, testing, report and demo |

## 9. Limitations
- Opportunity data is synthetic; results reflect the method, not real-world performance.
- No real ground truth. Rule-based labels risk circular evaluation; mitigate with a different rule set and human judgement.
- Public skill ratings are proxies and richest for football.
- Weights untested until ablation. Profile data is self-reported. Age and location features may disadvantage some groups; monitor.
