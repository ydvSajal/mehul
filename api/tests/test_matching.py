from types import SimpleNamespace as NS

from app.matching import combine, rank

ATHLETE = NS(sport="football", position="central midfielder", age=19, city="Delhi", region="North",
             level="state", skills=["passing", "vision"], goals="academy trial to grow as a creative midfielder")


def opp(**kw):
    base = dict(sport="football", positions=["central midfielder"], age_min=17, age_max=21, city="Delhi",
                region="North", level="state", skills=["passing", "vision"], description="academy trial for midfielders")
    return NS(**{**base, **kw})


def test_report_worked_example():
    # M2 report, section 4: hand-calculated example must score 93.5.
    c = dict(position=1.0, skills=0.85, age=1.0, location=1.0, experience=1.0, goals=0.80)
    assert combine(c) == 93.5


def test_hard_filters_drop_ineligible():
    pool = [opp(), opp(sport="cricket"), opp(age_min=23, age_max=25)]
    assert len(rank(ATHLETE, pool)) == 1


def test_ranking_and_reasons():
    good, far = opp(), opp(city="Chennai", region="South", positions=["striker"], skills=["finishing"])
    top = rank(ATHLETE, [far, good])
    assert top[0]["opportunity"] is good and top[0]["score"] > top[1]["score"]
    assert {"Position matches", "Age within range", "Same city"} <= set(top[0]["reasons"])
    assert 0 <= top[1]["score"] <= 100
