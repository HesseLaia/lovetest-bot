# 海龟汤 Bot - 产品需求文档 (PRD)

**版本**：MVP v1.0  
**更新时间**：2026-03-13  
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
| `/newgame` | 启动游戏 | 任何时候（无游戏时）|
| `/guess <内容>` | 提交完整猜测并结束游戏 | 游戏进行中 |
| `/reveal` | 直接查看答案并结束游戏 | 游戏进行中 |
| `/cancel` | 取消当前游戏 | 游戏进行中 |
| `/help` | 显示玩法说明 | 任何时候 |

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
Bot: ⏳ 正在生成故事...
Bot: 📖 场景描述
     [生成的场景文本]
     
     💡 回复此消息提问，只能问是/否问题
```

**规则**：
- 一个群同时只能有一场游戏
- 游戏进行中有人发 `/newgame` → 提示"游戏进行中，请先使用 /reveal、/guess 或 /cancel 结束当前游戏"

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

### 生成故事 Prompt

**要求**：
- 难度：根据用户选择（Easy / Medium / Hard）
- 语言：根据用户选择（英语 / 俄语）
- 返回格式：**必须是有效 JSON**

**返回格式**：
```json
{
  "scenario": "场景描述（50-100字）",
  "truth": "完整故事/汤底（150-300字）"
}
```

**代码处理**：
- JSON 解析失败 → 提示"故事生成失败，请重试 /newgame"
- 超时/API 错误 → 提示"网络错误，请稍后重试"

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
  scenario LONGTEXT NOT NULL COMMENT '场景描述',
  truth LONGTEXT NOT NULL COMMENT '完整故事/汤底',
  questions_count INT DEFAULT 0 COMMENT '提问次数',
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
- `scenario`、`truth`：用 `LONGTEXT` 存储（避免 JSON 类型坑）
- `questions_count`：提问次数统计（不存储具体问题内容）
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

- ✅ 难度选择（v1.1 已实现：Easy / Medium / Hard）
- ❌ 提示系统（卡住时请求线索）
- ❌ 用户数据 / 排行榜
- ❌ 历史游戏记录查询
- ❌ 私聊支持（只支持群组）
- ❌ AI 自动判断猜测是否正确
- ❌ 提问历史详情显示（只统计次数）
- ❌ 游戏时间限制
- ❌ 主题分类（恐怖/推理/科幻等）

---

## 🎯 用户体验要点

### 多语言支持
- 启动游戏时选择语言（English / Русский）
- Bot 的提示消息、按钮文本也要用对应语言
- 示例：
  - 英语：`🎮 Game started! Here's your scenario...`
  - 俄语：`🎮 Игра началась! Вот ваш сценарий...`

### 错误处理
| 场景 | 提示消息 |
|------|----------|
| API 调用失败 | "❌ 故事生成失败，请重试 /newgame" |
| 网络超时 | "⏳ 网络超时，请稍后重试" |
| JSON 解析失败 | "❌ 数据解析错误，请重试" |
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

---

## 🔧 MVP v1.1 - 并发和稳定性优化

### 待修复问题

#### 问题 1：startGame 竞态条件（高优先级）

**问题描述**：
当多个用户几乎同时点击语言按钮时，会出现竞态条件：
- 用户 A 点击 English → 检查无游戏 → 开始生成故事（耗时 3-10s）
- 用户 B 同时点击 Русский → 检查无游戏（此时 A 还没插入）→ 也开始生成
- 结果：第二个请求会因为 `chat_id UNIQUE` 约束失败，抛出 MySQL 错误

**影响**：
- 用户看到 "unknownError" 而不是 "gameInProgress"
- 浪费一次 OpenRouter API 调用

**修复方案**：
利用数据库 UNIQUE 约束做并发控制，捕获 `ER_DUP_ENTRY` 错误：

```javascript
// src/core/gameLogic.js - startGame
async startGame(chatId, language) {
  try {
    const { scenario, truth } = await aiClient.generateStory(language);
    await gameRepo.create(chatId, language, scenario, truth);
    return { scenario, truth };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('GAME_IN_PROGRESS');
    }
    throw error;
  }
}
```

**注意**：不再需要提前 `getCurrentGame` 检查，直接依赖数据库约束。

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

1. **难度选择**：启动时选择 简单/中等/困难
2. **提示系统**：`/hint` 命令获取方向性线索
3. **用户数据**：记录参与次数、胜率
4. **排行榜**：群内玩家排名
5. **历史记录**：`/history` 查看过往游戏
6. **私聊支持**：单人练习模式
7. **主题分类**：选择恐怖/推理/科幻等类型
8. **时间限制**：限时挑战模式
9. **软删除**：`/cancel` 改为软删除，保留数据用于分析
10. **提问计数优化**：在 AI 判断前累加，避免顺序错乱

---

**文档结束**
