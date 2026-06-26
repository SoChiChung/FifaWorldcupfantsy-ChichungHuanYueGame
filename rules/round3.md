# Round 3: 掐头去尾

## 规则说明

淘汰当前存活玩家中，**本轮得分（roundPoints）前 10 名**和**后 10 名**，共淘汰 20 人。

## 输入

| 参数 | 来源 |
|------|------|
| `players` | `players.json`，每人有 `roundPoints` |
| `getStat` | 本轮不需要（不统计球员数据） |
| `roundId` | 当前轮次 |
| `previousResults` | `result.json` 中所有之前轮次的结果 |

## 排序指标

仅按 `p.roundPoints` **降序**排列。

## 淘汰逻辑

1. 从 `players` 中**排除**已在之前轮次被淘汰的玩家（根据 `previousResults` 中每个 round 的 `eliminated` 列表，建立 `deadSet`）。
2. 剩余存活玩家按 `roundPoints` 降序排列。
3. 取排名**前 10 名**（分数最高）和**后 10 名**（分数最低）作为本轮淘汰者。
4. 如果存活玩家不足 20 人，全数淘汰（edge case，正常情况下不会发生）。

## Tie-break

本轮不涉及球员统计数据，不需要 getStat 的 Tie-break。

如果前 10 名边界出现并列（第 10 名和第 11 名 roundPoints 相同），或后 10 名边界出现并列（倒数第 10 和倒数第 11 名 roundPoints 相同），设置 `extra.tieDetected = true`。

比法：仅比较 `roundPoints`，无需二级指标。

## 输出

```js
{
  title: "Round 3: Cut Head and Tail",
  description: "淘汰本轮得分前 10 名和后 10 名的玩家，共淘汰 20 人。",
  ranking: [ { userId, userName, points } ],   // 仅存活玩家参与排序
  eliminated: [ ... ],                         // 前 10 + 后 10 = 20 人
  extra: {
    tieDetected: false
  }
}
```

## ranking 字段

```js
{ userId, userName, points }   // points = p.roundPoints
```

## 注意事项

- 已淘汰玩家不参与排名也不占据淘汰名额。
- ranking 只包含存活玩家。
- 前 10 和后 10 可能有重叠？不会——若存活玩家 ≥ 20，前 10 和后 10 无交集；若存活玩家 < 20，全部淘汰。
- `roundPoints` 来自 `players.json`，字段已在 `fetchPlayers.js` 中生成，不需要 `getStat`。
