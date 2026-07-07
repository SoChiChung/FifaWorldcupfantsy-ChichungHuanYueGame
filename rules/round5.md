# Round 5: 奇数偶数大逃杀

## 1. 数据来源

| 数据 | 来源 | 说明 |
|------|------|------|
| `roundPoints` | `players.json` → `p.roundPoints` | 第五轮得分，无需 `getStat` |
| `qualifier` | `config.json` → `qualifier` 字段 | 已存在，值为 `1` 或 `2` |
| 历史淘汰名单 | `previousResults` | 排除 R1~R4 已淘汰玩家 |

## 2. 过滤已淘汰玩家

与 Round3、Round4 完全一致：

```
deadSet = ∅
for each round in previousResults:
    for each e in round.eliminated:
        deadSet.add(e.userId)

alive = players.filter(p => !deadSet.has(p.userId))
```

## 3. 读取 qualifier 字段

**问题**：`runRules.js` 当前传给规则的参数是 `{ players, getStat, roundId, previousResults }`，不包含 `qualifier`。`loadConfig()` 也只返回 `roundId` 和 `cookie`。

**方案**：修改 `scripts/lib/data.js` 的 `loadConfig()`，在返回值中增加 `qualifier` 字段。然后修改 `scripts/runRules.js`，在调用规则时传入 `qualifier`。

`data.js` 改动（+1 行）：
```js
function loadConfig() {
  const cfg = readJSON(path.join(ROOT, 'config.json'));
  return {
    roundId: cfg.roundId,
    cookie: cfg.COOKIE || cfg.cookie || '',
    qualifier: cfg.qualifier || 0    // 新增
  };
}
```

`runRules.js` 改动（+1 行）：
```js
const rule = require(rulePath);
const result = rule({
  players,
  getStat,
  roundId,
  previousResults,
  qualifier: config.qualifier   // 新增
});
```

规则函数签名变为：
```js
module.exports = function round5({ players, getStat, roundId, previousResults, qualifier }) {
```

**影响范围**：`qualifier` 默认值为 `0`，前几轮规则不使用该字段，不受影响。

## 4. 按第五轮得分排名

```
ranking = alive
  .map(p => ({ userId: p.userId, userName: p.userName, points: p.roundPoints }))
  .sort((a, b) => b.points - a.points || a.userId - b.userId)
```

然后为每条记录附加 `rank`（1-based）：
```
ranking.forEach((r, i) => { r.rank = i + 1 })
```

`rank` 作为排序后的数组下标 +1，不需要额外计算。

## 5. 根据 qualifier 判断淘汰

### qualifier == 1（Spain 晋级）

- **保留**：奇数排名（rank = 1, 3, 5, 7, 9, ...）
- **淘汰**：偶数排名（rank = 2, 4, 6, 8, 10, ...）

```js
eliminated = ranking.filter(r => r.rank % 2 === 0)
```

### qualifier == 2（Portugal 晋级）

- **保留**：偶数排名（rank = 2, 4, 6, 8, 10, ...）
- **淘汰**：奇数排名（rank = 1, 3, 5, 7, 9, ...）

```js
eliminated = ranking.filter(r => r.rank % 2 === 1)
```

### qualifier 为其他值

视为配置错误，淘汰全部玩家，并在 `extra` 中标记：
```js
extra: { qualifier, qualifierName: "Unknown", eliminationType: "All" }
```

## 6. 数据结构设计

### ranking
```js
[
  { rank: 1, userId: 2794666, userName: "superkod", points: 89 },
  { rank: 2, userId: 3213180, userName: "Henry Tian", points: 85 },
  ...
]
```

### eliminated
```js
[
  { rank: 2, userId: 3213180, userName: "Henry Tian", points: 85 },
  { rank: 4, userId: 65850, userName: "mystery-13", points: 78 },
  ...
]
```

### extra
qualifier == 1：
```js
{ qualifier: 1, qualifierName: "Spain", eliminationType: "Even Rank" }
```
qualifier == 2：
```js
{ qualifier: 2, qualifierName: "Portugal", eliminationType: "Odd Rank" }
```

### 完整返回
```js
return {
  title: "Round 5: Odd Even Battle Royale",
  description: "Spain晋级：淘汰排名为偶数的玩家。",
  ranking,
  eliminated,
  extra: { qualifier: 1, qualifierName: "Spain", eliminationType: "Even Rank" }
}
```

## 7. 需要修改的文件

| 文件 | 改动 | 说明 |
|------|------|------|
| `rules/round5.js` | **新增** | Round 5 规则实现 |
| `scripts/lib/data.js` | +1 行 | `loadConfig()` 增加 `qualifier` 返回值 |
| `scripts/runRules.js` | +1 行 | 传递 `qualifier` 给规则函数 |
| `README.md` | 更新 | 新增 Round 5 规则说明 |

## 8. 是否需要修改公共模块

**需要**。具体为：

| 模块 | 改动 | 理由 |
|------|------|------|
| `scripts/lib/data.js` | `loadConfig()` 返回 `qualifier` | 规则层需要读取 `qualifier`，但不能直接读文件（违反架构原则）；通过 `loadConfig` 统一返回是最小改动 |
| `scripts/runRules.js` | 传递 `qualifier` 参数 | 规则函数签名扩展，保持数据注入模式一致 |

**不影响已有规则**：`qualifier` 默认值为 `0`，`round1.js` ~ `round4.js` 不使用该字段，`round5.js` 也不会匹配到 `0`（会走 `else` 分支全员淘汰）。

## 9. 示例验证

存活玩家 = 6 人，排名如下：

| rank | 玩家 | points |
|------|------|--------|
| 1 | Alice | 95 |
| 2 | Bob | 88 |
| 3 | Carol | 82 |
| 4 | David | 75 |
| 5 | Eric | 70 |
| 6 | Frank | 65 |

**qualifier = 1（Spain）**：淘汰 rank=2,4,6（Bob, David, Frank）
**qualifier = 2（Portugal）**：淘汰 rank=1,3,5（Alice, Carol, Eric）
