# Round 7: 八强小组赛 — Design Doc

## 1. 整体流程

```
config.json (roundId=7, team bonuses)
      +
previousResults (R2~R6 eliminated lists + R6 ranking)
      +
players.json (存活玩家 + roundPoints)
      ↓
① 过滤已淘汰玩家 → 得到 34 名存活玩家
② 读取 Round6 排名 → 按顺位分入 A~H 组
③ 按 seed 分配球队（A5/B5 随机）
④ 读取 config 球队加分
⑤ 计算 finalPoints = roundPoints + bonus
⑥ 每组最高分晋级，其余淘汰
      ↓
result.json (groups + ranking + qualified + eliminated)
```

## 2. 过滤已淘汰玩家

与 Round3/4/5 完全一致：

```
deadSet = ∅
for each round in previousResults (R2, R3, R4, R5, R6):
    for each e in round.eliminated:
        deadSet.add(e.userId)

alive = players.filter(p => !deadSet.has(p.userId))
```

断言：`alive.length === 34`。若不等于 34，在 `extra` 中标记警告。

**依赖**：Round6 必须已执行且产出 `previousResults["6"].ranking`，用于第三步的分档排序。

## 3. 分组算法

### 输入
Round6 的 ranking（来自 `previousResults["6"].ranking`），按 Round6 排名升序排列（第1名排最前）。

### 固定顺位分配（蛇形第一轮 = 顺序分配）

| R6 排名 | 组-顺位 | R6 排名 | 组-顺位 |
|---------|---------|---------|---------|
| 1 | A1 | 18 | C3 |
| 2 | B1 | 19 | D3 |
| 3 | C1 | 20 | E3 |
| 4 | D1 | 21 | F3 |
| 5 | E1 | 22 | G3 |
| 6 | F1 | 23 | H3 |
| 7 | G1 | 24 | A3 |
| 8 | H1 | 25 | B3 |
| 9 | A2 | 26 | C4 |
| 10 | B2 | 27 | D4 |
| 11 | C2 | 28 | E4 |
| 12 | D2 | 29 | F4 |
| 13 | E2 | 30 | G4 |
| 14 | F2 | 31 | H4 |
| 15 | G2 | 32 | A4 |
| 16 | H2 | 33 | B4 |
| 17 | A3 | 34 | A5 |
| — | B3 | — | B5 |

注意：上表中的组-顺位分配需要验证。让我重新整理。

八组 A~H，每组 seed 1~4（A/B 组多一个 seed 5）。

| R6 Rank | Seed | → Group |
|---------|------|---------|
| 1~8 | 1st | A1→H1 |
| 9~16 | 2nd | A2→H2 |
| 17~24 | 3rd | A3→H3 |
| 25~32 | 4th | A4→H4 |
| 33 | 5th | A5 |
| 34 | 5th | B5 |

伪代码：
```
GROUPS = ['A','B','C','D','E','F','G','H']
r6ranking = previousResults["6"].ranking  // ordered by R6 performance

groups = { A:[], B:[], C:[], D:[], E:[], F:[], G:[], H:[] }

for (i = 0; i < 32; i++) {
  groupIdx = i % 8
  seed = Math.floor(i / 8) + 1   // 1, 2, 3, 4
  groups[GROUPS[groupIdx]].push({ player: r6ranking[i], seed })
}
groups['A'].push({ player: r6ranking[32], seed: 5 })
groups['B'].push({ player: r6ranking[33], seed: 5 })
```

## 4. 球队分配

### 四人组固定映射

| Seed | Team |
|------|------|
| 1 | Argentina |
| 2 | England |
| 3 | France |
| 4 | Spain |

所有组（A~H）统一。

### 五人组 A5 / B5

A5 和 B5 各随机分配四队之一。球队可重复（A 组可能有两个 Argentina）。

**随机方案**（建议）：用 `roundId * 10000 + userId` 作为伪随机种子，对 `['Argentina','England','France','Spain']` 做基于种子的 shuffle，取第一个。保证同一次运行结果稳定、可复现。

```
function seededPick(seed, options) {
  // simple LCG: next = (seed * 1103515245 + 12345) & 0x7fffffff
  const r = ((seed * 1103515245 + 12345) >>> 0) % options.length
  return options[r]
}
a5team = seededPick(7 * 10000 + a5Player.userId, TEAMS)
b5team = seededPick(7 * 10000 + b5Player.userId, TEAMS)
```

结果记录在 `extra.a5Team` 和 `extra.b5Team` 中。

## 5. config.json 数据设计

### 现有结构
```json
{
  "roundId": 7,
  "qualifier": 1,
  "COOKIE": "..."
}
```

### 需要新增的字段

```json
{
  "roundId": 7,
  "qualifier": 1,
  "COOKIE": "...",
  "bonuses": {
    "Argentina": 2,
    "England": 1,
    "France": 3,
    "Spain": 0
  }
}
```

**建议**：用 `bonuses` 对象包裹四个球队的加分，语义清晰，未来如果新增球队只需在此对象内加 key。

如果希望保持 config 扁平（不增加嵌套层级），可以改为：
```json
"argentina_bonus": 2,
"england_bonus": 1,
"france_bonus": 3,
"spain_bonus": 0
```

**推荐前者**（`bonuses` 对象），因为前端读取 `config.bonuses[teamName]` 比逐个判断字段名更简洁。

### loadConfig 改动

```js
function loadConfig() {
  const cfg = readJSON(path.join(ROOT, 'config.json'));
  return {
    roundId: cfg.roundId,
    cookie: cfg.COOKIE || cfg.cookie || '',
    qualifier: cfg.qualifier || 0,
    bonuses: cfg.bonuses || {}
  };
}
```

### runRules 改动

```js
const result = rule({
  players, getStat, roundId, previousResults,
  qualifier: config.qualifier,
  bonuses: config.bonuses
});
```

## 6. result.json 数据设计

Round7 新增 `groups` 和 `qualified` 字段，保留 `ranking` / `eliminated` 以兼容旧版。

```json
{
  "7": {
    "title": "Round 7: Quarter-Final Group Stage",
    "description": "八强小组赛：34名玩家分入A~H八组，每组最高分晋级。",
    "groups": {
      "A": [
        {
          "userId": 2794666,
          "userName": "superkod",
          "seed": 1,
          "assignedTeam": "Argentina",
          "roundPoints": 85,
          "bonus": 2,
          "finalPoints": 87,
          "qualified": true
        },
        { "seed": 2, "assignedTeam": "England", ... },
        { "seed": 3, "assignedTeam": "France", ... },
        { "seed": 4, "assignedTeam": "Spain", ... },
        { "seed": 5, "assignedTeam": "France", ... }
      ],
      "B": [ ... ],
      "C": [ ... ],
      "D": [ ... ],
      "E": [ ... ],
      "F": [ ... ],
      "G": [ ... ],
      "H": [ ... ]
    },
    "ranking": [ ... ],
    "qualified": [ { "userId": ..., "userName": ..., "group": "A", ... } ],
    "eliminated": [ { "userId": ..., "userName": ..., "group": "B", ... } ],
    "extra": {
      "teamBonuses": { "Argentina": 2, "England": 1, "France": 3, "Spain": 0 },
      "a5Team": "France",
      "b5Team": "England",
      "aliveCount": 34
    }
  }
}
```

### ranking 字段

全部存活玩家按 `finalPoints` 降序排列：
```js
{ rank, userId, userName, group, seed, assignedTeam, roundPoints, bonus, finalPoints, qualified }
```

### runRules.js 校验调整

当前校验：
```js
if (!result || !result.title || !result.ranking || !result.eliminated) { ... }
```

Round7 的 `ranking` 和 `eliminated` 仍然存在，该校验无需修改。

## 7. 同分处理方案（待确认）

组内第一名同分时，按以下优先级依次比较，请选择方案：

| 方案 | 第一优先级 | 第二优先级 | 第三优先级 |
|------|-----------|-----------|-----------|
| **A（推荐）** | `roundPoints` 高者胜 | `overallPoints` 高者胜 | `userId` 升序 |
| B | `roundPoints` 高者胜 | seed 低者胜（顺位靠前） | `userId` 升序 |
| C | 直接比较 `overallPoints` | `roundPoints` | `userId` |

**推荐方案 A**：优先看个人表现（roundPoints），再看赛季积累（overallPoints），最后 userId 兜底。逻辑清晰且与已有 Tie-break 习惯一致。

## 8. 前端方案

### 新增 Round7 Tab

在 `index.html` 的 round-tabs 中，Round 7 使用独立渲染逻辑。其他 Round 保持现有表格渲染不变。

### 渲染判断

```js
if (currentRoundId === '7') {
  renderGroupStage(result);
} else {
  renderLeaderboard(result);  // 现有逻辑
}
```

### 小组赛渲染

每个小组一张卡片，包含：

```
┌─ Group A ─────────────────────────┐
│ #  Player      Team       Pts+Bon=Total  │
│ 1  superkod    Argentina  85 +2 = 87  ✓ │
│ 2  Henry Tian  England    78 +1 = 79     │
│ 3  mystery-13  France     72 +3 = 75     │
│ 4  Loki777     Spain      80 +0 = 80     │
│ 5  dongma      France     65 +3 = 68     │
└────────────────────────────────────┘
```

✓ = 晋级标记。

### 需要新增 CSS

- `.groups-grid`：8 组卡片网格布局
- `.group-card`：单组卡片样式
- `.group-card .qualified`：晋级行高亮

### 数据文件

不需要新增 JSON 文件。前端直接读取 `result.json` 中 Round 7 的 `groups` 字段。

## 9. 文件修改清单

| 文件 | 改动 | 说明 |
|------|------|------|
| `config.json` | 新增 `bonuses` | 四队加分 |
| `scripts/lib/data.js` | `loadConfig()` 返回 `bonuses` | +1 行 |
| `scripts/runRules.js` | 传入 `bonuses` 参数 | +1 行 |
| `rules/round7.js` | **新增** | 完整规则实现 |
| `rules/round7.md` | **新增** | 设计文档 |
| `docs/index.html` | 新增 Round7 渲染分支 + 小组赛 CSS | ~80 行 |
| `docs/css/style.css` | 新增小组赛卡片样式 | ~60 行 |
| `README.md` | 新增 Round7 规则说明 | 更新 |

## 10. 是否需要修改公共模块

| 模块 | 改动 | 理由 |
|------|------|------|
| `scripts/lib/data.js` | `loadConfig()` 返回 `bonuses` | 规则层不能直接读 config 文件 |
| `scripts/runRules.js` | 传递 `bonuses` 参数 | 保持数据注入模式 |

不改动 `pool.js`、`fetchPlayers.js`、`fetchFootballers.js`、`update.js`、`dev.js`。

## 11. 待确认事项

1. **同分方案**：请从上述 A/B/C 中选定一个。
2. **config 结构**：`bonuses` 嵌套对象 vs 扁平字段，请确认。
3. **A5/B5 随机种子方案**：基于 `userId` 的确定性伪随机，是否接受？
4. **Round6 数据依赖**：Round7 需要 `previousResults["6"].ranking` 作为分档依据，Round6 规则是否已就绪？
