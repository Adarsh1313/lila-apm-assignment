
# Gameplay Insights

## Insight 1 — Loot behavior reveals the extraction shooter loop clearly — and bots don't loot (except the anomalous 3)

What caught my eye: 12,885 Loot events, all from humans — and the 3 anomalous bots (1379, 1402, 1429) having 115 Loot events combined
Concrete stat: 0 Loot events from normal bots. Loot is purely a human behavior, which means loot placement directly shapes where humans go.
Actionable: Overlay Loot event heatmap against BotKill heatmap — if they overlap, humans are looting in high-bot-traffic areas which creates natural tension. If they don't overlap, loot is placed in safe zones and the game loses risk/reward drama
Level designer angle: In an extraction shooter, loot placement IS level design. Where you put loot determines player routing, risk exposure, and extraction timing. This data directly tells you where humans choose to loot

---

## Insight 2 — Human-vs-human combat is almost non-existent

What caught my eye: Only 3 Kill and 3 Killed events out of 89,104 rows

Concrete stat: BotKill events = 2,415 vs Kill = 3. Humans are 800x more likely to kill a bot than another human

Actionable: The match-making or player density needs fixing or this might be a subset of the actual data — matches are averaging less than 1 human per match in most cases. 

Metric to watch: Human kill rate per match, average humans per lobby

Level designer angle: PvP-focused design (open sightlines, sniper towers, arena zones, closer spawn zones) is largely wasted real estate if humans never meet. Bot encounter zones and extraction routes matter far more right now.

---

## Insight 3 — Player movement clusters in the center — map edges are dead zones

What caught my eye: The central region of the map is a death trap — 40% of all deaths occur in a small central cluster

Concrete stat: 36,431 deaths in the central 25% of the map vs 52,673 in the remaining 75%. The central 25% is 3.3x denser in deaths than the rest of the map

Actionable: Spread out high-value loot and extraction points to pull players toward the edges. Reduce bot density in the center to decrease friction

Level designer angle: The current map design funnels players into a meat grinder. Opening up the edges creates more strategic movement options and reduces frustration

Recommendation: Add extraction points or adjust storm timing.

---