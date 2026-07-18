# Round 8: Final Round — Design Doc

## 1. 整体流程

```
config.json (roundId=8, winningGoalPlayerIds, championTeamId)
      +
previousResults["7"].qualified
      +
players.json (当前轮 roundPoints + lineup + captain)
      +
footballers.json / fullfootballers.json (球员统计数据 + team/squad 信息)
      ->
读取 Round 7 晋级名单
      ->
得到 9 名晋级最后一轮的参赛玩家
      ->
按当轮得分排名
      ->
检查三四名决赛和世界杯决赛的 Winning Goal 球员
      ->
持有 Winning Goal 球员的玩家额外 +5 分
      ->
同分时依次比较队长本轮得分、冠军队伍首发人数、总分
      ->
result.json (ranking + eliminated + extra)
```

## 2. Round 7 结算与晋级名单

Round 8 不重新计算 Round 7 小组赛结果，直接读取已经写入 `result.json` 的 Round 7 结果：

```js
const round7 = previousResults["7"];
const finalists = round7.qualified || [];
```

`finalists` 即为晋级最后一轮的 9 名参赛玩家名单。

### 校验规则

- `previousResults["7"]` 必须存在。
- `previousResults["7"].qualified` 必须是数组。
- `qualified.length` 预期为 `9`。
- 如果晋级人数不是 9 人，仍继续输出结果，但在 `extra.warning` 中记录异常，便于页面或日志提示。

### 推荐输出字段

Round 8 的 `extra` 中保留 Round 7 晋级名单快照：

```json
{
  "extra": {
    "finalistCount": 9,
    "finalists": [
      {
        "userId": 123,
        "userName": "playerA",
        "group": "A"
      }
    ]
  }
}
```

这样前端可以清楚展示“由 Round 7 结算得到的最后一轮 9 人名单”。

## 3. Round 8 排名方式

Round 8 只统计 Round 7 晋级玩家。

基础分为玩家在当前轮的 `roundPoints`：

```js
basePoints = player.roundPoints || 0
```

最终分为：

```js
finalPoints = basePoints + winningGoalBonus
```

排名按 `finalPoints` 降序排列。

### Tie-break

如果 `finalPoints` 相同，按以下顺序稳定排序：

| 优先级 | 字段 | 方向 | 说明 |
|---|---|---|---|
| 1 | `captainPoints` | 降序 | 当前轮队长得分更高者靠前 |
| 2 | `championStarterCount` | 降序 | 首发阵容中冠军队伍球员更多者靠前 |
| 3 | `overallPoints` | 降序 | 总分更高者靠前 |
| 4 | `userId` | 升序 | 稳定排序 |

注意：这里的同分是指 `finalPoints` 相同，不再回退比较 `basePoints`。

## 4. Winning Goal 附加分

在以下两场比赛中，如果玩家阵容中持有 Winning Goal 球员，则该玩家额外加 `5` 分：

- 三四名决赛
- 世界杯决赛

Winning Goal 球员由 `config.json` 配置。Round 8 规则只判断玩家是否持有这些球员，不再判断具体比赛、进球时间或球员事件来源。

### 加分规则

- `config.json` 中的 Winning Goal 球员 ID 是一个数组。
- 如果玩家阵容中至少持有数组中的任意一名球员，则 `winningGoalBonus = 5`。
- 如果玩家同时持有多个 Winning Goal 球员，仍只加 `5` 分，不重复叠加。
- 如果数组为空或未配置，则所有玩家 `winningGoalBonus = 0`。

伪代码：

```js
const winningGoalIds = new Set(config.winningGoalPlayerIds || []);

const hasWinningGoalPlayer = lineupPlayerIds.some(id => winningGoalIds.has(id));
const winningGoalBonus = hasWinningGoalPlayer ? 5 : 0;
```

## 5. config.json 数据设计

新增字段：

```json
{
  "roundId": 8,
  "winningGoalPlayerIds": [12345, 67890],
  "championTeamId": 99,
  "COOKIE": "..."
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `roundId` | number | 当前轮次，Round 8 时为 `8` |
| `winningGoalPlayerIds` | number[] | 三四名决赛和世界杯决赛 Winning Goal 球员 ID |
| `championTeamId` | number | 冠军队伍 ID，用于同分时统计首发阵容中的冠军队伍球员数量 |
| `COOKIE` | string | FIFA API Cookie |

### 命名建议

推荐字段名为 `winningGoalPlayerIds`，原因：

- 明确表示数组内容是球员 ID。
- 避免和球员对象、球员名称混淆。
- 后续如果需要扩展为不同比赛的 Winning Goal，可以再新增结构化字段，不影响当前数组。

冠军队伍字段推荐使用 `championTeamId`。`fullfootballers.json` 样例中球员所属球队字段为 `squadId`，实现时用 `footballer.squadId === config.championTeamId` 判断该球员是否属于冠军队伍。

## 6. 阵容读取方式

Round 8 需要从玩家阵容中提取所有球员 ID。

玩家阵容通常保存在：

```js
player.lineup.GK
player.lineup.DEF
player.lineup.MID
player.lineup.FWD
```

推荐统一展开：

```js
const positions = ["GK", "DEF", "MID", "FWD"];
const lineupPlayerIds = positions.flatMap(pos =>
  player.lineup?.[pos] || []
);
```

注意：只统计 `lineup` 首发阵容，不包含 `bench` 替补。

## 7. 队长分数计算

Round 8 同分时需要比较队长在当前轮的得分。

玩家数据中队长字段为：

```js
player.captain
```

该字段是球员 ID。实现时通过该 ID 去 `footballers.json` 或 `fullfootballers.json` 中找到对应球员，再读取第 8 轮分数。

`fullfootballers.json` 的参考结构：

```json
{
  "id": 468,
  "stats": {
    "roundPoints": {
      "8": 0
    }
  }
}
```

推荐读取逻辑：

```js
const captainId = player.captain;
const footballer = footballersById.get(captainId);
const captainPoints = footballer?.stats?.roundPoints?.["8"] || 0;
```

因为当前比赛还未结算到第八轮，`stats.roundPoints["8"]` 可能暂时不存在。不存在时统一按 `0` 处理，等后续接口开放第八轮数据后自动读取真实分数。

说明：

- 队长分只用于同分排序。
- 队长分不额外加入 `finalPoints`。
- 如果玩家没有 `captain`，或找不到对应球员，`captainPoints = 0`。

## 8. 同分时的冠军成员数比较

如果两名玩家 `finalPoints` 相同，且 `captainPoints` 也相同，则比较双方首发阵容里的冠军队伍球员数量；只有这一项也相同，才比较 `overallPoints`。

判断逻辑：

1. 遍历玩家 `lineup` 里的全部球员 ID。
2. 不遍历 `bench`，替补不参与统计。
3. 对每个球员 ID，在 `footballers.json` 或 `fullfootballers.json` 中找到对应球员。
4. 读取球员的 `squadId`。
5. 如果 `footballer.squadId === config.championTeamId`，计数 +1。
6. `championStarterCount` 更多者排名靠前。
7. 如果冠军成员数也相同，`overallPoints` 更高者排名靠前。

伪代码：

```js
const championTeamId = config.championTeamId;

const championStarterCount = lineupPlayerIds.filter(id => {
  const footballer = footballersById.get(id);
  return footballer?.squadId === championTeamId;
}).length;
```

如果 `championTeamId` 未配置，则所有玩家 `championStarterCount = 0`。

## 9. result.json 数据设计

Round 8 输出保持现有规则文件的通用结构：

```json
{
  "8": {
    "title": "Round 8: Final Round",
    "description": "最后一轮：Round 7 晋级的 9 名玩家按当轮得分排名，持有 Winning Goal 球员的玩家额外加 5 分。",
    "ranking": [
      {
        "rank": 1,
        "userId": 123,
        "userName": "playerA",
        "basePoints": 88,
        "winningGoalBonus": 5,
        "finalPoints": 93,
        "captainId": 468,
        "captainPoints": 8,
        "championStarterCount": 3,
        "hasWinningGoalPlayer": true,
        "winningGoalPlayerIds": [12345],
        "overallPoints": 500
      }
    ],
    "eliminated": [],
    "qualified": [],
    "extra": {
      "finalistCount": 9,
      "winningGoalPlayerIds": [12345, 67890],
      "championTeamId": 99,
      "bonusPoints": 5,
      "finalists": [
        {
          "userId": 123,
          "userName": "playerA",
          "group": "A"
        }
      ]
    }
  }
}
```

### ranking 字段

| 字段 | 说明 |
|---|---|
| `rank` | Round 8 最终排名 |
| `userId` | 玩家 ID |
| `userName` | 玩家名称 |
| `basePoints` | 当前轮原始得分，即 `roundPoints` |
| `winningGoalBonus` | Winning Goal 附加分，`0` 或 `5` |
| `finalPoints` | 最终得分 |
| `captainId` | 玩家队长球员 ID |
| `captainPoints` | 队长第 8 轮得分，用于同分排序 |
| `championStarterCount` | 首发阵容中冠军队伍球员数量，用于同分排序 |
| `hasWinningGoalPlayer` | 是否持有 Winning Goal 球员 |
| `winningGoalPlayerIds` | 玩家命中的 Winning Goal 球员 ID |
| `overallPoints` | 玩家总分，用于同分排序 |

### eliminated / qualified

Round 8 是最后一轮，不再产生下一轮晋级名单。

建议：

- `qualified` 输出为空数组。
- `eliminated` 输出为空数组。
- 最终名次全部由 `ranking` 表达。

如果前端需要突出冠军、亚军、季军，可以直接读取 `ranking[0]`、`ranking[1]`、`ranking[2]`。

## 10. 文件修改清单

后续实现 JS 时预计需要修改：

| 文件 | 改动 | 说明 |
|---|---|---|
| `config.json` | 新增 `winningGoalPlayerIds`、`championTeamId` | 配置 Winning Goal 球员 ID 数组和冠军队伍 ID |
| `scripts/lib/data.js` | `loadConfig()` 返回 `winningGoalPlayerIds`、`championTeamId` | 让规则层拿到配置 |
| `scripts/runRules.js` | 传入 `winningGoalPlayerIds`、`championTeamId` | 维持配置注入模式 |
| `rules/round8.js` | 新增 | Round 8 规则实现 |
| `rules/round8.md` | 新增 | 规则设计文档 |
| `README.md` | 可选更新 | 补充 Round 8 规则说明 |

## 11. 待实现要点

1. 从 `previousResults["7"].qualified` 得到 9 名最后一轮玩家。
2. 用 `userId` 回到 `players.json` 中找到当前轮玩家数据。
3. 展开玩家阵容，判断是否持有 `config.json` 中的 Winning Goal 球员。
4. 通过 `player.captain` 找到队长球员，读取 `stats.roundPoints["8"]` 作为 `captainPoints`，不存在则为 0。
5. 根据 `config.championTeamId` 统计首发阵容中的 `championStarterCount`，不包含替补。
6. 计算 `finalPoints = roundPoints + winningGoalBonus`。
7. 按 `finalPoints`、`captainPoints`、`championStarterCount`、`overallPoints`、`userId` 顺序输出 `ranking`。
8. 在 `extra` 中输出晋级名单、Winning Goal 配置、冠军队伍配置和异常提示。
