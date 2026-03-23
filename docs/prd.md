# 海龟汤 Bot - 产品需求文档 (PRD)

**版本**：MVP v1.0  
**更新时间**：2026-03-24  
**项目类型**：Telegram Group Bot  

---

## 📋 产品概述

### 产品定位
一个基于 AI 的 Telegram 群组游戏 Bot，玩家通过提问是/否问题来推理出完整故事。

### 游戏玩法（海龟汤 / Lateral Thinking Puzzle）
1. Bot（AI 主持人）给出一个诡异/不完整的场景描述
2. 玩家只能问封闭式问题（是/否问题）
3. Bot 根据完整故事回答：是 / 否 / 无关
4. 玩家通过多轮提问逐步推理出完整真相
5. 玩家提交完整猜测，Bot 显示答案对比

### 核心特点
- 🤖 AI 生成无限题库（OpenRouter Gemini API）
- 🌍 支持英语和俄语
- 👥 群组协作推理
- 🎯 即开即玩，无需注册

---

## 🎮 功能需求

### 核心命令

| 命令 | 功能 | 使用场景 |
|------|------|----------|
| `/newgame` | 启动游戏 / 重置向导 | 无 `status=playing` 的记录时（含向导进行中；向导内再次发送会重置向导）|
| `/guess <内容>` | 提交完整猜测并结束游戏 | 游戏进行中 |
| `/reveal` | 直接查看答案并结束游戏 | 游戏进行中 |
| `/hint` | 获取方向性线索（每局免费 3 次） | 游戏进行中 |
| `/cancel` | 取消当前游戏 | 游戏进行中 |
| `/help` | 显示玩法说明 | 任何时候 |

### 难度定义（重新校准）

原有三个难度档位语义已调整，生成故事与预期提问量需与下表一致：

| 档位 | 说明 |
|------|------|
| **Easy（新手友好）** | 约 5–10 个问题可解开；故事仅一个核心反转；人物不超过 2 个；情节直给、答案呼之欲出；目标是新用户第一次玩也能成功建立信心。 |
| **Medium（标准难度）** | 约 15–25 个问题；含 1–2 个误导性细节，需一定推理；相当于原 PRD 中的 Easy 难度定位。 |
| **Hard（烧脑版）** | 30+ 个问题；多层反转、强误导；面向老手。 |

上表中「约 5–10 / 15–25 / 30+ 个问题」为对 **AI 的写作约束**（通过 prompt 引导故事复杂度），**不是**产品层面的硬编码计数器：不做题数上限/下限校验，不展示进度条。

### 汤的类型（题材维度）

与难度独立组合，用户在选择难度后再选择「汤的类型」，生成故事时同时传入难度与类型。

**与难度的关系**：两维度**完全独立**，可任意组合（包括 Easy+黑汤）。`soup_type` 控制题材尺度与内容风格；`difficulty` 只控制故事结构复杂度与解题所需问题数（见上表题数约束）。示例：Easy+黑汤＝情节简单但内容猎奇；Hard+清汤＝纯逻辑烧脑。

| 类型 | 含义 |
|------|------|
| 🍵 **清汤（clear）** | 纯逻辑推理，无血腥，家庭友好。 |
| 🔴 **红汤（red）** | 悬疑/惊悚元素，轻度血腥或心理恐怖。 |
| ⚫ **黑汤（black）** | 猎奇、血腥、变格，强刺激。 |

**数据库存储**：`soup_type` 取值 `clear` / `red` / `black`（与 UI 文案对应）。

**i18n 约定（按钮文案，写入 i18n）**：

| `soup_type` | 英语 | 俄语 |
|-------------|------|------|
| `clear` | 🍵 Clear Soup | 🍵 Светлый суп |
| `red` | 🔴 Red Soup | 🔴 Красный суп |
| `black` | ⚫ Black Soup | ⚫ Чёрный суп |

### 提示功能（`/hint`）

- 每局游戏免费提供 **3 次** 提示机会。
- AI 根据当前已提问次数与场景生成**方向性线索**，不直接揭示答案或汤底。
- **`/hint` 调用 AI 时的输入**：
  - 场景描述（`scenario`）
  - 已问过的问题数量（`questions_count`，语义见「提问阶段」）
  - **注意**：不传入 `truth`，避免 AI 提示过于直接
  - 要求 AI 给出一个方向性线索，**不超过 2 句话**，不能直接说出关键人物 / 关键动作 / 结局
- AI **输出为纯自然语言**，不要求 JSON；提示用语必须与该局游戏的 `language` 字段一致。
- `hint_count`：**仅当 AI 成功返回提示内容时**递增；超时 / API 失败**不扣次数**，用户可**立刻再次** `/hint`。用完 3 次后，回复「本局提示已用完」（或所选语言下的等价文案）。
- `/help` 文案需补充 **`/hint`** 与**汤类型**说明（与 Bot 所选语言一致）。
- 未开始游戏或已结束游戏时调用 `/hint` 需有对应提示（与无游戏时提问一致的业务规则）。

---

## 🔄 游戏流程

### 1. 启动游戏

**v1.1 游戏启动流程**：

```
用户: /newgame
Bot: 显示 inline keyboard [English] [Русский]
用户: 点击语言按钮
Bot: 显示 inline keyboard [🟢 Easy] [🟡 Medium] [🔴 Hard]
用户: 点击难度按钮
Bot: 显示 inline keyboard（文案见「汤的类型」i18n 表；回调数据对应 clear / red / black）
用户: 点击汤的类型按钮
Bot: ⏳ 正在生成故事...
Bot: 📖 场景描述
     [生成的场景文本]
     
     💡 回复此消息提问，只能问是/否问题；需要线索时可使用 /hint（每局 3 次）
```

**规则**：
- 一个群同时只能有一场 **`status=playing`** 的游戏（已结束不占名额）
- **多步向导的状态模型**：
  - 向导进行中（选语言 / 难度 / 汤类型阶段）**不向数据库写入任何记录**
  - 仅当 **AI 生成故事成功**后，**INSERT** 一条 `status=playing` 的记录
  - 并发控制仍依赖 `chat_id` 的 **UNIQUE** 约束，并在 INSERT 时捕获 **`ER_DUP_ENTRY`**，映射为「游戏进行中」类提示
- **向导进行中**若有人发 `/newgame`：因库中尚无 `playing` 记录，视为「无游戏」，**允许重置向导**——直接重新弹出语言选择键盘，**不**提示「请点完」（体验优先）
- **生成故事失败回退**：仅对「生成故事」这一步重试，**最多额外重试 1 次**（共 2 次调用）；**不回退**到选语言 / 难度 / 汤类型，**保留**用户已选配置。重试仍失败 → 提示「生成失败，请重新发送 /newgame」
- 已有 `playing` 时有人发 `/newgame` → 提示"游戏进行中，请先使用 /reveal、/guess 或 /cancel 结束当前游戏"

### 2. 提问阶段

```
用户: [回复 bot 消息] 他是故意的吗？
Bot: ✅ 是
```

**提问方式**：
- 回复 bot 的**任何消息**都算提问（场景消息、之前的答案消息等）
- 多人同时提问 → 都回答（群组协作）

**回答格式**：
- ✅ 是
- ❌ 否
- 🤷 无关

**边缘情况**：
- 当前群没有游戏时，回复 bot 消息 → 提示"当前没有游戏，使用 /newgame 开始"

**`questions_count` 语义**：
- 只统计**成功完成 AI 判断流程**的提问次数（每次用户发起一条有效提问并完成一次判断后 +1）
- 判定为 `IRRELEVANT`（无关）**也计入**，因为用户确实发起了提问
- `/hint` 调用 AI 时传入的「已问过的问题数量」即当前库中的 `questions_count` 值

### 3. 结束游戏

#### 方式 A：提交猜测 (`/guess`)

```
用户: /guess 因为男人一直打嗝，服务员用枪吓他，打嗝停了所以说谢谢
Bot: 🎯 游戏结束
     
     【你的猜测】
     因为男人一直打嗝，服务员用枪吓他，打嗝停了所以说谢谢
     
     【汤底】
     男人一直打嗝，医生说如果不停止可能有生命危险。他走进酒吧想喝水缓解，
     服务员察觉到了，故意拿枪吓他，打嗝停止了，男人意识到服务员的用意所以道谢。
     
     🎮 使用 /newgame 开始新游戏
```

**规则**：
- `/guess` 后必须有内容
- 如果没有内容 → 提示"请在 /guess 后面写上你的完整猜测"
- 显示对比后立即结束游戏
- **不进行 AI 自动判断是否正确**，由玩家自行判断

#### 方式 B：直接查看答案 (`/reveal`)

```
用户: /reveal
Bot: 📖 汤底揭晓
     
     【完整故事】
     男人一直打嗝，医生说如果不停止可能有生命危险...
     
     🎮 使用 /newgame 开始新游戏
```

#### 方式 C：取消游戏 (`/cancel`)

```
用户: /cancel
Bot: ❌ 游戏已取消
     🎮 使用 /newgame 开始新游戏
```

---

## 🤖 AI 集成规范

### OpenRouter API 配置
- **模型**：`google/gemini-2.0-flash-exp`
- **API 端点**：OpenRouter API
- **调用场景**：
  1. 生成故事（游戏启动时）
  2. 判断问题（每次提问时）
  3. 生成提示（`/hint` 时）

### 生成故事 Prompt

**要求**：
- 难度：根据用户选择（Easy / Medium / Hard），并遵循上文「难度定义（重新校准）」的预期题量与结构。
- 汤的类型：根据用户选择（`clear` / `red` / `black`），控制题材与刺激度（见「汤的类型」）；与难度的分工见「与难度的关系」。
- 语言：根据用户选择（英语 / 俄语）
- `scenario` / `truth` 字数按所选**难度**约束（通过 prompt 引导，非运行时硬校验）：
  - **Easy**：`scenario` 30–60 字，`truth` 80–150 字
  - **Medium**：`scenario` 50–100 字，`truth` 150–250 字
  - **Hard**：`scenario` 80–150 字，`truth` 250–400 字
- 返回格式：**必须是有效 JSON**

**返回格式**：
```json
{
  "scenario": "场景描述（字数见上表按难度）",
  "truth": "完整故事/汤底（字数见上表按难度）"
}
```

**代码处理**：
- 生成失败（含 JSON 解析失败、超时、API 错误）：按「生成故事失败回退」**自动再试 1 次**；仍失败 → 提示「生成失败，请重新发送 /newgame」

### 判断问题 Prompt

**要求**：
- 输入：场景 + 汤底 + 用户问题
- 返回格式：**只返回三个词之一**

**返回格式**：
```
YES
```
或
```
NO
```
或
```
IRRELEVANT
```

**代码强制映射**：
```javascript
// 伪代码
const response = await callAI(question);
const answer = response.trim().toUpperCase();

if (answer.includes('YES')) return 'YES';
if (answer.includes('NO')) return 'NO';
// 其他任何情况都视为 IRRELEVANT
return 'IRRELEVANT';
```

**显示映射**：
- `YES` → ✅ 是
- `NO` → ❌ 否
- `IRRELEVANT` → 🤷 无关

### 提示 Prompt

**要求**：
- **输入**：仅 `scenario` + `questions_count`（**不传入 `truth`**，避免提示过于直白）；`questions_count` 语义见「提问阶段」
- **输出**：**纯自然语言**（不要求 JSON），**不超过 2 句话**，语言与该局 `language` 一致；不得直接说出关键人物、关键动作或结局

**代码处理**：
- 超时/API 错误：**不递增 `hint_count`**，友好提示（所选语言），用户可立即重试 `/hint`

---

## 💾 数据存储

### 数据库：MySQL

#### `games` 表结构

```sql
CREATE TABLE games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id BIGINT NOT NULL UNIQUE,
  language VARCHAR(2) NOT NULL COMMENT 'en 或 ru',
  difficulty VARCHAR(10) NOT NULL COMMENT 'easy / medium / hard',
  soup_type VARCHAR(10) NOT NULL COMMENT 'clear / red / black',
  scenario LONGTEXT NOT NULL COMMENT '场景描述',
  truth LONGTEXT NOT NULL COMMENT '完整故事/汤底',
  questions_count INT DEFAULT 0 COMMENT '成功完成判断的提问次数，含IRRELEVANT',
  hint_count INT DEFAULT 0 COMMENT '本局已使用提示次数',
  status VARCHAR(20) NOT NULL COMMENT 'playing 或 ended',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  INDEX idx_chat_id (chat_id),
  INDEX idx_status (status)
);
```

**字段说明**：
- `chat_id`：Telegram 群组 ID（唯一索引，一个群只能一场游戏）
- `language`：`en` 或 `ru`
- `difficulty`：`easy` / `medium` / `hard`
- `soup_type`：`clear`（清汤）/ `red`（红汤）/ `black`（黑汤）
- `scenario`、`truth`：用 `LONGTEXT` 存储（避免 JSON 类型坑）
- `questions_count`：成功走完 AI 判断流程的提问次数（`IRRELEVANT` 也计入）；语义见「提问阶段」；不存储具体问题内容
- `hint_count`：本局已成功消耗提示的次数（上限 3；仅成功返回提示时递增，见「提示功能」）
- `status`：`playing`（进行中）或 `ended`（已结束）

**存取规则**：
```javascript
// scenario 和 truth 是普通字符串，直接存取
await db.execute(
  'INSERT INTO games (chat_id, scenario, truth, ...) VALUES (?, ?, ?, ...)',
  [chatId, scenario, truth, ...]
);

const game = rows[0];
console.log(game.scenario); // 直接是字符串

// ⚠️ 如果未来有复杂对象字段，必须用 LONGTEXT + JSON.stringify/parse
// 例如：questions_history LONGTEXT
// 存：JSON.stringify(questionsArray)
// 取：JSON.parse(row.questions_history)
```

### Bot 重启恢复
- **不维护内存缓存**，每次收到消息时直接查数据库获取当前游戏状态
- Bot 启动时无需预加载游戏数据

---

## 🚫 MVP 不包含功能（后续迭代）

- ❌ 用户数据 / 排行榜
- ❌ 历史游戏记录查询
- ❌ 私聊支持（只支持群组）
- ❌ AI 自动判断猜测是否正确
- ❌ 提问历史详情显示（只统计次数）
- ❌ 游戏时间限制

---

## 🎯 用户体验要点

### 多语言支持
- 启动游戏时选择语言（English / Русский）
- Bot 的提示消息、按钮文本也要用对应语言
- 汤类型按钮文案见「汤的类型」**i18n 约定**表
- `/help`：需包含玩法说明，并明确介绍 **`/hint`**（每局 3 次等）与 **汤类型**（清汤 / 红汤 / 黑汤与尺度），文案随所选语言切换
- 示例：
  - 英语：`🎮 Game started! Here's your scenario...`
  - 俄语：`🎮 Игра началась! Вот ваш сценарий...`

### 错误处理
| 场景 | 提示消息 |
|------|----------|
| 故事生成失败（含重试 1 次后仍失败） | "生成失败，请重新发送 /newgame" |
| API 调用失败（判断问题 / 提示等非生成故事场景） | 友好错误提示（所选语言），可重试原操作 |
| 网络超时 | "⏳ 网络超时，请稍后重试" |
| JSON 解析失败（非生成故事场景） | "❌ 数据解析错误，请重试" |
| `/guess` 无内容 | "⚠️ 请在 /guess 后面写上你的完整猜测" |
| 游戏进行中发 `/newgame` | "⚠️ 游戏进行中，请先使用 /reveal、/guess 或 /cancel 结束当前游戏" |
| 无游戏时提问 | "⚠️ 当前没有游戏，使用 /newgame 开始" |

### 性能要求
- 场景生成：< 10 秒
- 问题判断：< 3 秒
- 超时时显示友好提示

---

## 📦 技术栈

- **Bot 框架**：grammy
- **AI API**：OpenRouter (`google/gemini-2.0-flash-exp`)
- **数据库**：mysql2/promise（连接池模式）
- **部署**：Railway
- **Node 版本**：>= 18

---

## ✅ MVP 验收标准

### 核心流程验收
- [ ] 能够启动游戏并选择语言
- [ ] AI 能成功生成场景和汤底
- [ ] 回复 bot 消息能触发 AI 判断
- [ ] 判断结果正确映射为 是/否/无关
- [ ] `/guess` 能显示对比并结束游戏
- [ ] `/reveal` 能直接显示答案
- [ ] `/cancel` 能取消游戏
- [ ] 一个群同时只能一场游戏
- [ ] Bot 重启后能恢复游戏状态

### 边缘情况验收
- [ ] 游戏进行中发 `/newgame` 有提示
- [ ] 无游戏时提问有提示
- [ ] `/guess` 无内容有提示
- [ ] API 失败有友好提示
- [ ] 多人同时提问都能收到回复

### 多语言验收
- [ ] 英语场景生成正常
- [ ] 俄语场景生成正常
- [ ] Bot 提示消息使用对应语言

### 难度、汤类型与提示验收
- [ ] 启动流程为：选语言 → 选难度 → 选汤的类型 → 生成故事；向导阶段无 DB 写入，成功生成后才 `INSERT` 且 `status=playing`
- [ ] 向导中再次 `/newgame` 会重置向导并重新选语言；`playing` 中发 `/newgame` 仍被拦截
- [ ] 生成失败时仅重试生成 1 次且保留已选配置，仍失败则提示「生成失败，请重新发送 /newgame」
- [ ] 生成故事符合当前 PRD 中 Easy / Medium / Hard 的定义边界（题量与结构预期）及分难度字数约束（prompt 层）
- [ ] `soup_type`（clear / red / black）正确写入数据库并参与生成；汤类型按钮与 i18n 表一致
- [ ] `/hint` 每局最多 3 次**成功**提示，失败不扣次数可立即重试；已成功用满 3 次后再请求 `/hint` → 提示「本局提示已用完」
- [ ] `hint_count` 仅成功返回时递增并持久化；`questions_count` 含 IRRELEVANT 且与 `/hint` 传入一致
- [ ] `/help` 含 `/hint` 与汤类型说明（en/ru）

---

## 🔧 MVP v1.1 - 并发和稳定性优化

### 待修复问题

#### 问题 1：startGame 竞态条件（高优先级）

**问题描述**：
向导阶段不写库；两路几乎同时完成「选汤类型 → 生成故事成功 → INSERT」时：
- 用户 A、B 均可能在无 `playing` 行时各自完成生成并尝试 `INSERT` 同 `chat_id`
- 第二笔 INSERT 会因 `chat_id UNIQUE` 失败

**影响**：
- 用户看到 "unknownError" 而不是 "gameInProgress"
- 浪费一次 OpenRouter API 调用

**修复方案**：
利用数据库 UNIQUE 约束做并发控制，捕获 `ER_DUP_ENTRY` 错误：

```javascript
// src/core/gameLogic.js - finalizeGame（示意：生成成功后再 INSERT）
async finalizeGame(chatId, language, difficulty, soupType) {
  try {
    const { scenario, truth } = await aiClient.generateStory({ language, difficulty, soupType });
    await gameRepo.create(chatId, { language, difficulty, soupType, scenario, truth, status: 'playing' });
    return { scenario, truth };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('GAME_IN_PROGRESS');
    }
    throw error;
  }
}
```

**注意**：向导无 DB 状态；并发窗口在「生成完成后的 INSERT」。捕获 `ER_DUP_ENTRY` 后提示游戏进行中即可。

#### 问题 2：AI API 超时处理（中优先级）

**问题描述**：
OpenRouter API 调用没有超时设置，可能导致：
- 网络问题时请求无限挂起
- 用户长时间等待没有反馈
- 成本浪费（超时后重试会再次调用 API）

**影响**：
- 用户体验差（卡住不响应）
- Railway 实例可能因为请求堆积导致资源耗尽

**修复方案**：
在 `aiClient` 的 `fetch` 调用中添加 15 秒超时和重试机制：

```javascript
// src/core/aiClient.js - generateStory / judgeQuestion
async generateStory(language) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s 超时

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    // ... 正常处理
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('API_TIMEOUT');
    }
    throw error;
  }
}
```

**超时时间设定**：
- `generateStory`：15 秒（场景生成通常 3-8 秒）
- `judgeQuestion`：10 秒（问题判断通常 1-3 秒）

**错误映射**：
- `API_TIMEOUT` → handler 捕获后显示 "networkError"

---

## 📝 后续迭代方向

1. **用户数据**：记录参与次数、胜率
2. **排行榜**：群内玩家排名
3. **历史记录**：`/history` 查看过往游戏
4. **私聊支持**：单人练习模式
5. **时间限制**：限时挑战模式
6. **软删除**：`/cancel` 改为软删除，保留数据用于分析
7. **提问计数优化**：在 AI 判断前累加，避免顺序错乱

---

**文档结束**
