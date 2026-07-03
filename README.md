# FIFA Fantasy — 大逃杀联赛

一个部署在 GitHub Pages 上的静态网站，展示 FIFA World Cup Fantasy 大逃杀联赛的每轮排名与淘汰结果。

---

## 项目结构

```
/
├── config.json                   # 全局配置（roundId、Cookie）
│
├── data/
│   ├── huanyue.json              # 范特西玩家快照（固定名单，手动维护）
│   ├── players.json              # 玩家阵容数据（GitHub Action 生成）
│   ├── footballers.json          # 球员统计数据（GitHub Action 生成）
│   └── result.json               # 每轮结果，格式为 { "1": {...}, "2": {...} }
│
├── rules/
│   ├── round1.js                 # Round 1 规则：淘汰总分最低 1 人
│   ├── round2.js                 # Round 2 规则：淘汰首发 ST 最少 5 人
│   └── ...                       # 后续每轮新增一个文件即可
│
├── scripts/
│   ├── lib/
│   │   ├── data.js               # 统一数据读写 + getStat 查询函数
│   │   └── pool.js               # Promise 并发池（固定并发 + 指数退避重试）
│   ├── fetchPlayers.js           # 拉取所有玩家阵容（并发 10、自动重试）
│   ├── fetchFootballers.js       # 去重拉取唯一球员数据（并发 10、自动重试）
│   ├── runRules.js               # 执行当前轮规则
│   ├── dev.js                    # 本地开发服务器（零依赖）
│   └── update.js                 # 完整编排脚本（上述三步 + 复制到 docs）
│
├── docs/
│   ├── index.html                # 前端页面
│   └── data/                     # 前端读取的 JSON（update.js 自动生成）
│       ├── result.json
│       └── huanyue.json
│
└── .github/workflows/
    └── update.yml                # GitHub Actions 定时更新
```

## 数据流（前端如何获取数据）

```
GitHub Actions
     │
     ▼
① node scripts/update.js
     │
     ├── ② fetchPlayers.js  ──▶ FIFA API ──▶ data/players.json
     ├── ③ fetchFootballers.js ──▶ FIFA API ──▶ data/footballers.json
     ├── ④ runRules.js     ──▶ 读取 data/*.json ──▶ data/result.json
     └── ⑤ 复制 data/result.json, data/huanyue.json ──▶ docs/data/
                                                              │
     GitHub Pages 站点根目录 = docs/                            │
                                                              ▼
                                             浏览器访问 docs/index.html
                                                    │
                                          fetch('data/result.json')
                                          fetch('data/huanyue.json')
                                                    │
                                                    ▼
                                              渲染页面
```

关键点：

- **前端不请求 FIFA API**，只读取 `docs/data/` 下的静态 JSON。
- `docs/data/` 里的 JSON 由 `update.js` 在每次 Action 运行时自动复制。
- `docs/index.html` 使用相对路径 `fetch('data/result.json')` 加载数据——因为 GitHub Pages 将 `docs/` 作为站点根目录，请求 `/data/result.json` 即对应 `docs/data/result.json`。

## 本地开发

### 前置条件

- Node.js 20+
- `config.json` 中已填写有效的 `cookie` 和 `roundId`

### 运行

```bash
# 完整流程（抓取数据 + 执行规则 + 复制到 docs）
npm run update

# 或单独执行某个步骤
node scripts/fetchPlayers.js      # 仅抓取玩家阵容
node scripts/fetchFootballers.js  # 仅抓取球员数据
node scripts/runRules.js          # 仅执行当前轮规则（需要前两步已生成 JSON）
```

### 启动前端开发服务器

```bash
npm run dev
```

浏览器打开 `http://localhost:3000` 即可预览前端页面。开发服务器自动以 `docs/` 为根目录，无需额外配置。

> 前提：已运行过 `npm run update`（或 `node scripts/update.js`），确保 `docs/data/` 下有 JSON 文件。

## 规则列表

### Round 1: 最低总分淘汰

- **文件**: `rules/round1.js`
- **规则**: 淘汰 `roundPoints` 最低的 1 位玩家
- **数据来源**: `p.roundPoints`（来自 `players.json`，无需 `getStat`）
- **Tie-break**: 无（仅按 `points` 降序，userId 稳定排序）

### Round 2: 最低射正淘汰

- **文件**: `rules/round2.js`
- **规则**: 淘汰首发 11 人 **射正（ST）总数** 最少的 5 位玩家
- **数据来源**: `getStat(playerId, roundId, 'ST')` — 遍历 lineup GK/DEF/MID/FWD
- **Tie-break**（四级排序）:

| 优先级 | 指标 | 方向 | 说明 |
|--------|------|------|------|
| 1 | `totalST` | 降序 | 射正越多越靠前 |
| 2 | `totalGS` | 降序 | 进球越多越靠前 |
| 3 | `totalMP` | 升序 | 出场时间越少越靠前 |
| 4 | `userId` | 升序 | 稳定排序，不参与规则判定 |

- **ranking 字段**: `{ userId, userName, totalST, totalGS, totalMP }`
- **并列检测**: 第 5 名与第 6 名三项指标完全相同 → `extra.tieDetected = true`

### Round 3: 掐头去尾

- **文件**: `rules/round3.js`
- **规则**: 淘汰本轮得分 **前 10 名**（最高分）和 **后 10 名**（最低分），合计 20 人
- **数据来源**: `p.roundPoints`（来自 `players.json`，无需 `getStat`）
- **前置过滤**: 从 `previousResults` 中排除前两轮已淘汰的玩家，仅存活玩家参与排名
- **Tie-break**: 仅按 `points` 降序，userId 稳定排序
- **ranking 字段**: `{ userId, userName, points }`
- **并列检测**: 第 10/11 名边界 或 倒数第 10/11 名边界 `points` 相同 → `extra.tieDetected = true`

---

## 新增一轮规则

1. 修改 `config.json` 中的 `roundId`。

2. 在 `rules/` 下新建 `round{N}.js`，导出一个函数：

```js
module.exports = function roundN({ players, getStat, roundId, previousResults }) {
  return {
    title: 'Round N: ...',
    description: '规则说明（中文）',
    ranking: [ { userId, userName, 自定义指标 } ],
    eliminated: [ { userId, userName, 自定义指标 } ],
    extra: { tieDetected: false }
  };
};
```

参数说明：

| 参数 | 说明 |
|------|------|
| `players` | `players.json` 全体数组，保留 lineup（GK/DEF/MID/FWD）结构 |
| `getStat(id, roundId, stat)` | 查询某球员在某轮的某项数据，不存在返回 0 |
| `roundId` | 当前轮次号 |
| `previousResults` | 之前所有轮次的 `result.json`，不含当前轮（用于排除已淘汰玩家） |

3. 提交代码，GitHub Actions 会自动执行新规则。无需修改任何其他文件。

### getStat 可用的 stat 名称

`ST`、`GS`、`AS`、`YC`、`RC`、`CS`、`SV`、`GC`、`PKG`、`OG`、`MP`、`points`。

## 架构原则

1. **数据层与规则层彻底分离** — `scripts/` 负责网络请求，`rules/` 只接收数据
2. **规则层禁止网络请求** — 只能通过 `getStat` 和 `players` 获取数据
3. **同一球员只请求一次** — `fetchFootballers.js` 用 Set 去重
4. **数据结构优先扩展性** — 阵容保留 GK/DEF/MID/FWD 位置，`footballers.json` 用 `{id: {round: {stats}}}` 结构
5. **新增规则不改底层** — 只需加一个 `rules/roundN.js`，不改 scripts
6. **并发请求 + 自动重试** — `pool.js` 固定并发 10，每个请求最多重试 3 次（指数退避 1s / 2s / 4s），避免瞬时波动导致整轮数据丢失

## 配置说明

`config.json`：

```json
{
  "roundId": 2,
  "COOKIE": "你的 Cookie 字符串"
}
```

| 字段 | 说明 |
|------|------|
| `roundId` | 当前轮次，全局统一读取 |
| `COOKIE` | FIFA 网站 Cookie，所有 API 请求携带 |

## GitHub Actions

配置在 `.github/workflows/update.yml`，每 6 小时自动执行并 commit 生成的 JSON。同时支持手动触发（`workflow_dispatch`）。

GitHub Pages 设置中需将来源设为 `docs/` 目录。
