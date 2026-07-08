# Building Effects — Non-Art Buildings
*Supplemental doc to [design-doc.md](design-doc.md) (the main spec) — effect design for buildings outside the art pipeline (landmarks, religious, trade, service, decorative). July 2026.*

---

## Governing rule

The building design test from the main doc is the whole constraint: **every building must unlock something or passively boost something — never require active management.** That yields a closed menu of five effect types. Every non-art building fits exactly one (occasionally two). If a proposed effect can't be expressed as *an unlock in the commission offer generator* or *a flat modifier in the tick loop*, it's the wrong effect for this game.

---

## The five effect slots

### 1. Unlock a commission lane

The most important slot — landmarks widen the *input* to the core loop rather than adding parallel systems. The effect is felt entirely through the Phase 8 offer stream: new requesters, bigger rewards, new artwork types.

| Building | Unlocks |
|---|---|
| Cathedral | Religious commissions |
| Guildhall | Craft commissions |
| Palazzo | That noble family's commissions (see below) |
| Baptistery | Higher-*tier* Church commissions |
| Banking House | Larger noble commissions |
| Wool Merchant | Tapestry commissions |
| Glassblower | Stained-glass commissions |

### 2. Passive resource trickle

One number per building, feeding an existing headline resource. Subject to diminishing returns on duplicates so "stamp five markets" is never the answer.

| Building | Boosts |
|---|---|
| Market | Florins |
| Spice Trader | Florins + prestige |
| Baptistery | Flat prestige |
| Decorations / gardens / fountains | Inspiration |

### 3. Population thresholds

Service buildings (Bakery, Tavern, Bathhouse, Apothecary, Public Well, Market Stall) raise the amenity ceiling while staffed. Already built; every future service building does exactly this and nothing more.

### 4. Soft spatial aura

Library / Studiolo boosts nearby workshops using the same flat-bonus mechanic as plaza proximity (Phase 10). Reuse that one implementation — no second radius system.

### 5. Artist-growth modifiers

School speeds apprentice XP; Anatomical Theatre gives a technique bump. Both plug into the Phase 11 teaching multiplier.

---

## Palazzo: resolving the dual listing

The main doc lists Palazzo as both a Civic landmark and Housing tier 4. **This doc collapses them:** a Palazzo is housing that also installs a named noble family as a commission requester — build the Strozzi Palazzo and Strozzi commissions start appearing. One building, two effect slots (housing + commission unlock), and it makes the "named family palazzos" stretch item nearly free.

---

## What non-art buildings never do

- No relationship meters
- No upkeep or maintenance
- No per-building resources (church "faith", bank "interest rate")
- No hard radii — spatial effects are always soft flat bonuses

The tension budget is already spent on supplier capacity and commission deadlines.

---

## Implementation note

Most future buildings are ~10 lines each: a building def plus either a tag the commission offer generator checks or one term in an existing tick-loop sum. Specific yields (e.g. prestige per month) are balancing decisions made at implementation time — deliberately not specified here.
