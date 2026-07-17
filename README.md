# combat-sim-kit

`combat-sim-kit` is a config-driven, Monte-Carlo combat balance simulator for turn-based games. 

## Pitch

Game balancing is often a mix of gut feeling, tedious spreadsheet formulas, and endless playtesting. `combat-sim-kit` solves this by giving you a **zero-hardcoded** simulation engine. You define your stats, derived attributes, and combat formulas in a YAML configuration file as mathematical expressions. The library takes care of the rest: deterministic pseudorandom number generation (PRNG), battle loops, Monte-Carlo aggregation, and stat-sweep analysis.

Whether you're balancing a roguelike, a strategy game, or an RPG, `combat-sim-kit` allows you to simulate thousands of battles in seconds to find balance breakpoints and verify that your changes have the desired effect.

---

## Features

- ⚙️ **Zero Hardcoded Rules**: Define all attributes and combat formulas via expressions.
- 🎲 **Deterministic RNG**: Mulberry32 seed-based PRNG ensures every simulation run is 100% reproducible.
- 📊 **Stat Sweeps**: Automatically iterate over range of stat values and draw ASCII win-rate charts.
- 📈 **Monte-Carlo Analysis**: Generate win rates, draw rates, timeout rates, round averages/medians, and histograms.
- 💻 **CLI & API**: Works both as a global CLI tool for quick tests and as a programmatic TypeScript library.

---

## Installation

### As a Library
Install it in your Node.js project:
```bash
npm install combat-sim-kit
```

### As a Global CLI
Install it globally to use the `combat-sim` command:
```bash
npm install -g combat-sim-kit
```

---

## Quick Start

### 1. Configuration (`game.yaml`)

Define stats, derived attributes, and combat rules:

```yaml
stats:
  - name: ATK
  - name: DEF
  - name: SPD
  - name: VIT
  - name: CRIT
derived:
  hp: "150 + VIT * 12"
  baseDamage: "ATK * (0.95 + rand() * 0.10)"
  dodgeChance: "max(0.05, min(0.45, 0.10 + (SPD_self - SPD_enemy) / 150))"
  critChance: "max(0.05, min(0.50, 0.05 + CRIT / 100))"
  critMultiplier: "1.5 + max(0, ATK / 1000)"
  absorbFlat: "DEF * 0.25"
  absorbPct: "DEF / (DEF + 300)"
combat:
  maxRounds: 50
  initiative: "SPD * (1.0 + rand() * 0.2)"
  damage: "(baseDamage * (isCrit ? critMultiplier : 1) - absorbFlat_enemy) * (1 - absorbPct_enemy)"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
```

### 2. Fighter Profiles (`cat.yaml` and `dog.yaml`)

Define primary stat configurations (with 60 points allocated over base of 10):

```yaml
# cat.yaml
name: Agile Cat
stats:
  ATK: 20
  DEF: 10
  SPD: 40
  VIT: 10
  CRIT: 30
```

```yaml
# dog.yaml
name: Tanky Dog
stats:
  ATK: 20
  DEF: 30
  SPD: 10
  VIT: 40
  CRIT: 10
```

### 3. Command Line Interface (CLI)

#### Run a Single Fight (Detailed Log)
```bash
combat-sim fight -c game.yaml -a cat.yaml -b dog.yaml --seed 42
```
*Output:*
```text
Using seed: 42
[Round 01] Agile Cat hits Tanky Dog for 14.42 damage (HP: 615.58)
[Round 01] Tanky Dog hits Agile Cat for 9.87 damage (HP: 260.13)
[Round 02] Agile Cat hits Tanky Dog for 13.91 damage (HP: 601.67)
[Round 02] Tanky Dog hits Agile Cat for 9.77 damage (HP: 250.36)
...
[Round 23] Agile Cat hits Tanky Dog for 14.16 damage (HP: 5.61)
[Round 23] Tanky Dog hits Agile Cat for 10.14 damage (HP: 0.00)

Winner: B (KO)
```

#### Run Monte-Carlo Simulation (Win Rates)
```bash
combat-sim run -c game.yaml -a cat.yaml -b dog.yaml --seed 42
```
*Output:*
```text
Using seed: 42
--------------------------------------------------
 Monte-Carlo Simulation Results (10000 battles)
--------------------------------------------------
 Win Rate (Agile Cat):        0.00%
 Win Rate (Tanky Dog):        100.00%
 Draw Rate:                   0.00%
 Timeout Rate:                0.00%
 Average Rounds:              21.71
 Median Rounds:               21
 Avg Damage/Round:            26.80
--------------------------------------------------
```

#### Run Stat Sweep (Analyze Impact of ATK on Agile Cat)
```bash
combat-sim sweep -c game.yaml -a cat.yaml -b dog.yaml --stat ATK --from 20 --to 70 --step 5 -n 100 --seed 42
```
*Output:*
```text
Using seed: 42
ATK        | Win Rate   | Avg Rds  | Win Rate Chart
-----------+------------+----------+----------------------
20         | 0.0%       | 21.8     | [░░░░░░░░░░░░░░░░░░░░]
25         | 0.0%       | 21.8     | [░░░░░░░░░░░░░░░░░░░░]
30         | 13.0%      | 21.5     | [███░░░░░░░░░░░░░░░░░]
35         | 54.0%      | 20.3     | [███████████░░░░░░░░░]
40         | 82.0%      | 18.3     | [████████████████░░░░]
45         | 92.0%      | 16.3     | [██████████████████░░]
50         | 99.0%      | 14.5     | [████████████████████]
55         | 99.0%      | 13.0     | [████████████████████]
60         | 100.0%     | 11.9     | [████████████████████]
65         | 100.0%     | 10.8     | [████████████████████]
70         | 100.0%     | 10.0     | [████████████████████]
```

### 4. Programmatic API

```typescript
import { loadConfig, createRng, simulateBattle, runMonteCarlo, sweep } from 'combat-sim-kit';
import fs from 'fs';

// 1. Load config
const yamlString = fs.readFileSync('game.yaml', 'utf-8');
const config = loadConfig(yamlString);

const a = { name: 'Cat', stats: { ATK: 60, DEF: 20, SPD: 130, VIT: 15, CRIT: 15 } };
const b = { name: 'Dog', stats: { ATK: 45, DEF: 50, SPD: 80, VIT: 30, CRIT: 5 } };

// 2. Single Battle
const rng = createRng(42);
const battleResult = simulateBattle({ a, b, config, rng });
console.log(`Battle winner: ${battleResult.winner} in ${battleResult.rounds} rounds`);

// 3. Monte-Carlo Sim
const mcResult = runMonteCarlo({ a, b, config, battles: 1000, seed: 12345 });
console.log(`Cat Winrate: ${mcResult.winRateA * 100}%`);

// 4. Sweep analysis
const sweepResult = sweep({
  base: a,
  opponent: b,
  config,
  stat: 'SPD',
  from: 50,
  to: 150,
  step: 10,
  battlesPerPoint: 500,
  seed: 42,
});
console.log(sweepResult);
```

---

## Config Format Reference

- **`stats`**: Array of object definitions with name representing primary user stats. Any name is allowed (e.g. `Strength`, `Agility`, `Luck`).
- **`derived`**: Key-value map of computed attributes as mathematical expressions. They are lazily resolved and cached per battle if they contain no random functions.
- **`combat`**:
  - `maxRounds`: Hard round limit for battles to prevent infinite loops.
  - `initiative`: Expression determining turn order each round.
  - `damage`: Expression evaluating the raw damage of an attack.
  - `minDamage`: Minimum damage floor.
  - `timeout`:
    - `winner`: `"hpPercent"` - determines winner at timeout based on remaining HP percentage.
    - `drawMarginPct`: difference margin under which the battle is declared a draw.

---

## Expression Language Reference

Formulas are parsed using a safe, customized `expr-eval` parser.

### Variables Context

- **Base Stats / Derived Attributes**: Available by their exact names (e.g. `VIT`, `hp`).
- **`_self` Suffix**: Refers explicitly to own stats/derived values (e.g. `SPD_self`).
- **`_enemy` Suffix**: Refers explicitly to opponent stats/derived values (e.g. `SPD_enemy`).
- **`isCrit`**: Available within `combat.damage` context. Boolean value (`true` / `false`) representing if the current attack is critical.

### Functions
- **`rand()`**: A uniform `[0, 1)` number drawn from the battle's deterministic RNG. Re-evaluated every time it is used.
- **Mathematical Built-ins**: `min(a, b)`, `max(a, b)`, `abs(x)`, `floor(x)`, `ceil(x)`, `round(x)`, `sin(x)`, `cos(x)`, `tan(x)`, `sqrt(x)`, `log(x)`, `exp(x)`.

---

## Balancing Workflow

1. **Analyze Initial Build Balance**:
   Pitting our example characters against each other using `combat-sim run` reveals a severe balance issue:
   - **Agile Cat** (SPD/CRIT focus): **0.00%** win rate.
   - **Tanky Dog** (DEF/VIT focus): **100.00%** win rate.
   
   Because Agile Cat's `ATK` (20) is low, its damage is almost completely negated by Tanky Dog's high `DEF` (30) combined with a huge HP pool (630 HP vs 270 HP).
   
2. **Identify Breakpoints via Sweep**:
   To find how much `ATK` Agile Cat needs to stand a chance, we run `combat-sim sweep` on the `ATK` stat:
   - At `ATK = 20-25`, the win rate is `0.0%` (complete negation).
   - At `ATK = 30`, win rate rises to `13.0%`.
   - At `ATK = 35`, win rate jumps to `54.0%` (the golden 50% balance mark).
   - At `ATK = 40`, win rate is `82.0%`.
   - At `ATK >= 50`, win rate is `99.0%` or higher.

   This steep slope (from 0% to 99% in just 30 stat points) highlights a **balance cliff**. Designers can use this info to either boost Agile Cat's starting ATK, adjust the defense scaling formula (e.g. increase diminishing returns), or add alternative damage sources (like crit multipliers or armor-piercing stats).

3. **Control Timeouts**:
   In both runs, the **Timeout Rate** is `0.00%`. If you see high timeout rates, it indicates that defense or health pools are too high compared to offensive capabilities. Use this feedback loop to adjust overall stat weights.

---

## FAQ

#### How many battles do I need for Monte-Carlo?
The standard error of a win rate estimate is approximately \( \sigma = \frac{1}{2\sqrt{N}} \), where \( N \) is the number of battles.
- \( N = 100 \): margin of error is ~\( \pm 5\% \)
- \( N = 1,000 \): margin of error is ~\( \pm 1.5\% \)
- \( N = 10,000 \): margin of error is ~\( \pm 0.5\% \)

For balancing, **2,000 to 10,000** battles per data point is the sweet spot.

#### Why deterministic seeds?
By using a deterministic Mulberry32 generator, every simulation is reproducible byte-for-byte. If balance designers find a weird case or an unexpected win rate, they can share the exact seed and files to replay the battle step-by-step and inspect the logs.

#### Can I model complex abilities or active skills?
In `v0.1.0`, `combat-sim-kit` is designed to simulate stat-driven auto-battles. For complex active skills, cooldowns, and tactical decision-making, the library has dynamic abilities on the roadmap.

---

## License

MIT License. Copyright (c) 2026 Koval09.
