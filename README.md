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
  hp: "100 + VIT * 5"
  baseDamage: "(20 + ATK * 0.7) * (0.95 + rand() * 0.10)"
  dodgeChance: "max(0.05, min(0.45, SPD_self / (SPD_self + SPD_enemy + 50)))"
  critChance: "max(0.05, min(0.50, 0.05 + CRIT / 75))"
  critMultiplier: "1.5 + CRIT / 40"
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

### 2. Fighter Profiles (`cat-agile.yaml`, `dog-tank.yaml`, and `dog-speed.yaml`)

Define primary stat configurations (with 60 points allocated over base of 10 for a total budget of 110 points):

```yaml
# cat-agile.yaml
name: Agile Cat
stats:
  ATK: 20
  DEF: 10
  SPD: 40
  VIT: 10
  CRIT: 30
```

```yaml
# dog-tank.yaml
name: Tanky Dog
stats:
  ATK: 20
  DEF: 30
  SPD: 10
  VIT: 40
  CRIT: 10
```

```yaml
# dog-speed.yaml
name: Speedy Dog
stats:
  ATK: 20
  DEF: 10
  SPD: 50
  VIT: 20
  CRIT: 10
```

### 3. Command Line Interface (CLI)

#### Run a Single Fight (Detailed Log)
```bash
combat-sim fight -c game.yaml -a cat-agile.yaml -b dog-tank.yaml --seed 42
```
*Output:*
```text
Using seed: 42
[Round 01] Agile Cat hits Tanky Dog for 25.61 damage (HP: 274.39)
[Round 01] Tanky Dog attacks Agile Cat, but Agile Cat DODGES! (HP: 150.00)
[Round 02] Agile Cat CRITS Tanky Dog for 62.55 damage! (HP: 211.84)
[Round 02] Tanky Dog hits Agile Cat for 29.29 damage (HP: 120.71)
[Round 03] Agile Cat hits Tanky Dog for 24.40 damage (HP: 187.44)
[Round 03] Tanky Dog attacks Agile Cat, but Agile Cat DODGES! (HP: 120.71)
[Round 04] Agile Cat CRITS Tanky Dog for 65.11 damage! (HP: 122.33)
[Round 04] Tanky Dog hits Agile Cat for 31.70 damage (HP: 89.01)
[Round 05] Agile Cat hits Tanky Dog for 22.63 damage (HP: 99.70)
[Round 05] Tanky Dog attacks Agile Cat, but Agile Cat DODGES! (HP: 89.01)
[Round 06] Agile Cat CRITS Tanky Dog for 62.63 damage! (HP: 37.07)
[Round 06] Tanky Dog hits Agile Cat for 31.53 damage (HP: 57.48)
[Round 07] Agile Cat attacks Tanky Dog, but Tanky Dog DODGES! (HP: 37.07)
[Round 07] Tanky Dog CRITS Agile Cat for 53.84 damage! (HP: 3.63)
[Round 08] Agile Cat attacks Tanky Dog, but Tanky Dog DODGES! (HP: 37.07)
[Round 08] Tanky Dog hits Agile Cat for 31.63 damage (HP: 0.00)

Winner: B (KO)
```

#### Run Monte-Carlo Simulation (Win Rates)
```bash
combat-sim run -c game.yaml -a cat-agile.yaml -b dog-tank.yaml --seed 42
```
*Output:*
```text
Using seed: 42
--------------------------------------------------
 Monte-Carlo Simulation Results (10000 battles)
--------------------------------------------------
 Win Rate (Agile Cat):        46.59%
 Win Rate (Tanky Dog):        53.41%
 Draw Rate:                   0.00%
 Timeout Rate:                0.00%
 Average Rounds:              7.22
 Median Rounds:               7
 Avg Damage/Round:            56.83
--------------------------------------------------
```

#### Run Stat Sweep (Analyze Impact of ATK on Agile Cat)
```bash
combat-sim sweep -c game.yaml -a cat-agile.yaml -b dog-tank.yaml --stat ATK --from 20 --to 70 --step 5 -n 100 --seed 42
```
*Output:*
```text
Using seed: 42
ATK        | Win Rate   | Avg Rds  | Win Rate Chart
-----------+------------+----------+----------------------
20         | 46.0%      | 7.2      | [█████████░░░░░░░░░░░]
25         | 60.0%      | 6.8      | [████████████░░░░░░░░]
30         | 70.0%      | 6.5      | [██████████████░░░░░░]
35         | 79.0%      | 6.1      | [████████████████░░░░]
40         | 83.0%      | 5.8      | [█████████████████░░░]
45         | 85.0%      | 5.4      | [█████████████████░░░]
50         | 94.0%      | 5.3      | [███████████████████░]
55         | 97.0%      | 5.0      | [███████████████████░]
60         | 98.0%      | 4.8      | [████████████████████]
65         | 99.0%      | 4.5      | [████████████████████]
70         | 100.0%     | 4.2      | [████████████████████]
```

### 4. Programmatic API

```typescript
import { loadConfig, createRng, simulateBattle, runMonteCarlo, sweep } from 'combat-sim-kit';
import fs from 'fs';

// 1. Load config
const yamlString = fs.readFileSync('game.yaml', 'utf-8');
const config = loadConfig(yamlString);

const a = { name: 'Agile Cat', stats: { ATK: 20, DEF: 10, SPD: 40, VIT: 10, CRIT: 30 } };
const b = { name: 'Tanky Dog', stats: { ATK: 20, DEF: 30, SPD: 10, VIT: 40, CRIT: 10 } };

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
  stat: 'ATK',
  from: 20,
  to: 70,
  step: 5,
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

## Balance Tuning Workflow

Pitting your fighters against each other in a combat simulation loop allows you to systematically tune your game's balance:
1. **Identify Imbalance (`run`)**: Running the initial combat config (where `hp: 150 + VIT * 12`) showed an extreme balance issue: `Agile Cat` vs `Tanky Dog` resulted in a **0% : 100%** win rate.
2. **Locate Breakpoints (`sweep`)**: Sweeping the `ATK` stat showed a severe balance cliff where Agile Cat's damage was completely absorbed until reaching a critical threshold.
3. **Calibrate Formulas (Tweak)**: To smooth the curve, the HP formula was calibrated down from `150 + VIT * 12` to `100 + VIT * 5`, and `dodgeChance` was made relative to speed ratios instead of flat speed differences.
4. **Verify Balance (`run` again)**: Re-running the simulations confirms that all three matchups are now in the healthy **35-65%** win rate corridor, forming a perfect rock-paper-scissors counter loop:
   - **Speedy Dog** counterplays **Agile Cat** (~`60/40` win rate)
   - **Tanky Dog** counterplays **Speedy Dog** (~`60/40` win rate)
   - **Tanky Dog** vs **Agile Cat** is close and highly competitive (~`53/47` win rate)

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
