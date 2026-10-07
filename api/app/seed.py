"""Synthetic opportunity generator (report: data strategy). Fixed seed, rows labelled synthetic=True.

Run: python -m app.seed [count]
"""

import random
import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete

from app.db import SessionLocal
from app.models import Opportunity

CITIES = {"Delhi": "North", "Chandigarh": "North", "Lucknow": "North", "Mumbai": "West", "Pune": "West",
          "Ahmedabad": "West", "Bengaluru": "South", "Chennai": "South", "Kochi": "South", "Kolkata": "East",
          "Bhubaneswar": "East", "Guwahati": "East"}

SPORTS = {
    "football": (["goalkeeper", "centre back", "full back", "defensive midfielder", "central midfielder",
                  "attacking midfielder", "winger", "striker"],
                 ["passing", "vision", "dribbling", "finishing", "tackling", "pace", "heading", "positioning", "stamina"]),
    "cricket": (["batter", "bowler", "all rounder", "wicket keeper"],
                ["batting", "pace bowling", "spin bowling", "fielding", "keeping", "fitness"]),
    "basketball": (["point guard", "shooting guard", "small forward", "power forward", "center"],
                   ["shooting", "ball handling", "defense", "rebounding", "passing", "vertical"]),
    "athletics": (["sprinter", "hurdler", "middle distance", "long jumper", "thrower"],
                  ["speed", "endurance", "explosiveness", "technique", "strength"]),
}

TYPES = {"trial": "Open trial", "scholarship": "Sports scholarship", "tournament": "Tournament entry", "camp": "Training camp"}
ORGS = ["Riverside Academy", "Northgate Sports Club", "Sahyadri Athletics", "Eastern Rangers FC", "Coastal Sports Trust",
        "Capital Youth League", "Deccan Hoops", "Kaveri Cricket Academy", "Brahmaputra Sports Foundation"]
LEVELS = ["beginner", "district", "state", "national"]


def generate(n: int, seed: int = 42) -> list[Opportunity]:
    rng = random.Random(seed)
    now = datetime(2026, 10, 1, tzinfo=UTC)
    out = []
    for _ in range(n):
        sport = rng.choice(list(SPORTS))
        positions, skills = SPORTS[sport]
        typ = rng.choice(list(TYPES))
        city = rng.choice([*CITIES, None])  # None = open / online
        lo = rng.randint(12, 22)
        wanted = rng.sample(positions, rng.randint(1, 3)) if rng.random() < 0.8 else []
        need = rng.sample(skills, rng.randint(2, 4))
        org = rng.choice(ORGS)
        out.append(Opportunity(
            title=f"{TYPES[typ]}: {sport.title()} U{lo + 4}", org=org, type=typ, sport=sport, positions=wanted,
            age_min=lo, age_max=lo + rng.randint(2, 6), city=city, region=CITIES.get(city), level=rng.choice(LEVELS),
            skills=need, synthetic=True, deadline=now + timedelta(days=rng.randint(7, 90)),
            description=f"{org} is looking for {', '.join(wanted) or 'all positions'} with strong {' and '.join(need)}. "
                        f"Players who want to grow, compete and get scouted are welcome.",
        ))
    return out


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    with SessionLocal() as db:
        db.execute(delete(Opportunity).where(Opportunity.synthetic.is_(True)))
        db.add_all(generate(n))
        db.commit()
    print(f"seeded {n} synthetic opportunities")
