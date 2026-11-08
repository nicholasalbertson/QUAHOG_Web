# Characters & Missions bible (§2.11.1 / §8)

Recorded 2026-11-08. Source of truth for the campaign is `src/mission.ts`
(11 missions, 24 steps). This doc states what the missions say — it does
not invent backstory beyond the mission text.

## The player

- **Franklin** — the player character (the character model is named
  Franklin in the earth HUD footer). Arrives by boat in New Bedford.
- Starts with $250 (useStats). Earns cash from mission rewards and from
  owned business fronts (economy).

## The campaign (11 missions, 24 steps)

### Opener
| # | Mission | Steps | Rewards |
|---|---------|-------|---------|
| M01 | Off the Boat | Meet Deacon Mealy at Seamen's Bethel | $250 |

### Act I — The Whaling City (New Bedford)
| # | Mission | Steps | Rewards |
|---|---------|-------|---------|
| M02 | Auction Rules | Grab a car; lean on the collectors at the Quohog Republic; cool the car at Reggie's Anvil Garage | $700 |
| M03 | The Linguiça Run | Grab a car; pick up the package at Off the Hook (Long Island); run it downtown to the Quohog Republic | $900 |
| M04 | Harbor Heat | Hit Sully's count house (grab a fast car); lose the cops, go to ground at the safehouse | $1,200 |

### Act II — Spindle City (Fall River)
| # | Mission | Steps | Rewards |
|---|---------|-------|---------|
| M05 | Spindle City | Take I-195 west over the Braga Bridge; case Battleship Cove for Lady Borden's people | $1,500 |
| M06 | Acquitted | Meet the Lady's man at the Borden House on Second St; run the ledger to Battleship Cove, lose the tail | $2,000 |
| M07 | The Undefeated | Meet Iron Mike at Champion City Gym (Cappiello Boxing Gym, 162 Main St, Brockton); back the kid in the fixed fight — don't throw it | $1,800 |

### Act III — The Cape & the Storm
| # | Mission | Steps | Rewards |
|---|---------|-------|---------|
| M08 | Heritage Marina | Drive to Chip Worthington's heritage marina on the Cape (Hyannis Marina, 1 Willow St); photograph the laundered hull numbers, get out clean | $2,500 |
| M09 | Compound Interest | Roll up on the Fake Kennedys' Hyannis compound (50 Marchant Ave, Hyannis Port); plant the bug in the guest house, ditch the tail | $3,000 |
| M10 | Blizzard of '26 | Find a vehicle before the whiteout (Feb 23, 2026); reach the Hurricane Barrier as snow buries the South Coast; deliver emergency supplies downtown through 52-inch drifts | $3,500 + $2,000 |
| M11 | Big Mamie | Snowplows are opening I-195 — head west over the Braga Bridge; take the deck of the USS Massachusetts — end this | $10,000 |

Total mission rewards: $29,350. Campaign completion text: "Campaign complete
— the Narrows is yours."

## Named characters (as they appear in the mission text)

| Name | Role in the campaign |
|------|----------------------|
| Deacon Mealy | Meets the player at Seamen's Bethel (M01) |
| Sully | Runs the collectors (M02) and the count house (M04) |
| Reggie | Runs the Anvil Garage — cools the car (M02) |
| Lady Borden | Her people are at Battleship Cove (M05); her man is at the Borden House (M06) |
| Iron Mike | At Champion City Gym / Cappiello Boxing Gym, Brockton (M07) |
| Chip Worthington | Owns the heritage marina on the Cape (M08) |
| The Fake Kennedys | The Hyannis compound (M09) |

## Mission mechanics (shared by both builds)

- Each step completes on reaching its target (within its radius) and/or
  being in a car (`needCar`) and/or being heat-free (`noHeat`). The rule
  is `src/sim/missionComplete.ts` — one rule, used by the stylized
  MissionRunner and the earth EarthMissionRunner.
- Rewards pay cash via the shared `useStats`. Mission progress persists
  via `saveMissionProgress` / `restoreMissionProgress` (same keys in both
  builds).
- The campaign chains: finishing one mission starts the next; finishing
  M11 completes the campaign.

## Real anchors (re-pointed 2026-11-07)

- M07 → Cappiello Boxing Gym, 162 Main St, Brockton (42.082429, -71.019857)
- M08 → Hyannis Marina, 1 Willow St, Hyannis (41.650523, -70.273588)
- M09 → Kennedy Compound, 50 Marchant Ave, Hyannis Port (41.62998, -70.30236)
- M05/M06/M11 → Battleship Cove / USS Massachusetts, Fall River
- M10 → Hurricane Barrier, New Bedford
