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

Define primary stat configurations:

```yaml
# cat.yaml
name: Agile Cat
stats:
  ATK: 60
  DEF: 20
  SPD: 130
  VIT: 15
  CRIT: 15
```

```yaml
# dog.yaml
name: Tanky Dog
stats:
  ATK: 45
  DEF: 50
  SPD: 80
  VIT: 30
  CRIT: 5
```

### 3. Command Line Interface (CLI)

#### Run a Single Fight (Detailed Log)
```bash
combat-sim fight -c game.yaml -a cat.yaml -b dog.yaml --seed 42
```
*Output:*
```text
Using seed: 42
[Round 01] Agile Cat hits Tanky Dog for 43.24 damage (HP: 466.76)
[Round 01] Tanky Dog attacks Agile Cat, but Agile Cat DODGES! (HP: 330.00)
...
[Round 11] Agile Cat hits Tanky Dog for 42.33 damage (HP: 0.00)

Winner: A (KO)
```

#### Run Monte-Carlo Simulation (Win Rates)
```bash
combat-sim run -c game.yaml -a cat.yaml -b dog.yaml -n 10000 --seed 42
```
*Output:*
```text
Using seed: 42
--------------------------------------------------
 Monte-Carlo Simulation Results (10000 battles)
--------------------------------------------------
 Win Rate (Agile Cat):        86.20%
 Win Rate (Tanky Dog):        13.80%
 Draw Rate:                   0.00%
 Timeout Rate:                0.00%
 Average Rounds:              11.86
 Median Rounds:               12
 Avg Damage/Round:            65.01
--------------------------------------------------
```

#### Run Stat Sweep (Analyze Impact of Speed)
```bash
combat-sim sweep -c game.yaml -a cat.yaml -b dog.yaml --stat SPD --from 50 --to 150 --step 10 -n 2000 --seed 42
```
*Output:*
```text
Using seed: 42
SPD        | Win Rate   | Avg Rds  | Win Rate Chart
-----------+------------+----------+----------------------
50         | 0.0%       | 9.3      | [░░░░░░░░░░░░░░░░░░░░]
60         | 0.0%       | 9.4      | [░░░░░░░░░░░░░░░░░░░░]
70         | 0.0%       | 9.4      | [░░░░░░░░░░░░░░░░░░░░]
80         | 6.0%       | 9.9      | [█░░░░░░░░░░░░░░░░░░░]
90         | 26.0%      | 10.3     | [█████░░░░░░░░░░░░░░░]
100        | 42.0%      | 10.8     | [████████░░░░░░░░░░░░]
110        | 62.0%      | 11.2     | [████████████░░░░░░░░]
120        | 72.0%      | 11.5     | [██████████████░░░░░░]
130        | 84.0%      | 11.9     | [█████████████████░░░]
140        | 86.0%      | 11.8     | [█████████████████░░░]
150        | 86.0%      | 11.8     | [█████████████████░░░]
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

1. **Aim for 45-55% Win Rate**: When pitting equal-cost builds or mirror matches against each other, aim for a win rate as close to 50% as possible.
2. **Find Breakpoints via Sweep**: Execute a sweep on a stat (e.g. `DEF` or `SPD`).
   Look for the slope in the ASCII bar chart. If the win rate jumps from 10% to 90% in a small range, you have discovered a balance cliff/breakpoint. Smoothing your formulas (e.g. adding diminishing returns like `absorbPct: DEF / (DEF + 300)`) will help flatten the curve and make the game feel more forgiving.
3. **Control Timeouts**: If your timeout rate is high (e.g. > 5%), it indicates that defenses are too strong compared to offenses, or that characters have too much HP. Use the average rounds statistic to tune character durability.

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
