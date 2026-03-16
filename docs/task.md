# 海龟汤 Bot - 任务拆解

**版本**：MVP v1.0  
**更新时间**：2026-03-13  
**基于**：PRD v1.0 + Tech Design v1.0

---

## 📋 任务总览

本项目分为 **7 个阶段**，共 **25 个任务**，按依赖顺序执行。

### 阶段概览
1. **Phase 0：项目初始化**（3 个任务）
2. **Phase 1：数据库层**（3 个任务）
3. **Phase 2：AI 客户端**（2 个任务）
4. **Phase 3：核心业务逻辑**（2 个任务）
5. **Phase 4：消息和多语言**（2 个任务）
6. **Phase 5：Handler 层**（3 个任务）
7. **Phase 6：集成和测试**（3 个任务）
8. **Phase 7：部署上线**（2 个任务）

---

## Phase 0：项目初始化

### ✅ Task 0.1：创建项目结构和配置文件（已完成）

**状态**：✅ 已手动创建

**已完成内容**：
- 项目目录结构已建立
- 基础配置文件已就绪
- docs/ 文档目录已创建（prd.md, tech_design.md, task.md, changelog.md）

---

### ✅ Task 0.2：创建目录结构（已完成）

**状态**：✅ 已手动创建

**已完成内容**：
```
src/
├── config/
├── db/
├── core/
├── handlers/
├── messages/
└── utils/
```

---

### Task 0.3：安装依赖并测试

**目标**：确保开发环境可用

**依赖**：无（项目结构已就绪）

**步骤**：

1. 检查 Node 版本：
```bash
node --version  # 应该 >= 18
```

2. 创建 `package.json`：
```json
{
  "name": "lovetest_bot",
  "version": "1.0.0",
  "type": "module",
  "description": "Lateral Thinking Puzzle Bot for Telegram",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js",
    "dev": "node --watch bot.js"
  },
  "dependencies": {
    "grammy": "^1.21.1",
    "mysql2": "^3.9.0",
    "node-fetch": "^3.3.2"
  },
  "engines": {
    "node": ">=18"
  }
}
```

3. 创建 `.gitignore`：
```
node_modules/
.env
*.log
.DS_Store
```

4. 创建 `.env.example`：
```bash
# Telegram Bot
BOT_TOKEN=your_bot_token_here

# MySQL Database
DB_HOST=your_mysql_host_here
DB_PORT=3306
DB_NAME=railway
DB_USER=root
DB_PASSWORD=your_db_password_here

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional
LOG_LEVEL=info
```

5. 安装依赖：
```bash
npm install
```

**验收标准**：
- [ ] `node_modules/` 生成
- [ ] 无依赖冲突错误
- [ ] Node 版本 >= 18

---

## Phase 1：数据库层

### Task 1.1：实现环境变量配置 (`src/config/env.js`)

**目标**：加载和验证环境变量

**依赖**：无

**文件**：`src/config/env.js`

**实现要点**：
```javascript
export const config = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT || 3306,
  DB_NAME: process.env.DB_NAME || 'railway',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  OPENROUTER_MODEL: 'google/gemini-2.0-flash-exp',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

export function validateConfig() {
  const required = [
    'BOT_TOKEN',
    'DB_HOST',
    'DB_PASSWORD',
    'OPENROUTER_API_KEY',
  ];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`);
  }
}
```

**参考**：`tech_design.md` 第 1 节

**验收标准**：
- [ ] `validateConfig()` 能正确检测缺失的环境变量
- [ ] `config` 对象包含所有配置项

---

### Task 1.2：实现数据库连接池 (`src/db/pool.js`)

**目标**：创建 MySQL 连接池和初始化表

**依赖**：Task 1.1

**文件**：`src/db/pool.js`

**实现要点**：
1. 创建连接池（参考 `tech_design.md` 2.1 节）
2. 实现 `testConnection()` 测试连接
3. 实现 `initDatabase()` 创建 `games` 表

**games 表结构**（严格按 PRD）：
```sql
CREATE TABLE IF NOT EXISTS games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id BIGINT NOT NULL UNIQUE,
  language VARCHAR(2) NOT NULL COMMENT 'en 或 ru',
  scenario LONGTEXT NOT NULL COMMENT '场景描述',
  truth LONGTEXT NOT NULL COMMENT '完整故事/汤底',
  questions_count INT DEFAULT 0 COMMENT '提问次数',
  status VARCHAR(20) NOT NULL COMMENT 'playing 或 ended',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  INDEX idx_chat_id (chat_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**关键点**：
- ✅ 使用 `LONGTEXT` 存储 scenario 和 truth
- ✅ `chat_id` 设置 UNIQUE 索引（一个群只能一场游戏）

**参考**：`tech_design.md` 2.1 节

**验收标准**：
- [ ] `testConnection()` 能成功连接数据库
- [ ] `initDatabase()` 能成功创建表
- [ ] 表结构符合 PRD 要求

---

### Task 1.3：实现游戏数据仓库 (`src/db/gameRepo.js`)

**目标**：封装游戏数据的 CRUD 操作

**依赖**：Task 1.2

**文件**：`src/db/gameRepo.js`

**实现方法**：
1. `create(chatId, language, scenario, truth)` - 创建游戏
2. `getCurrentGame(chatId)` - 获取当前游戏
3. `incrementQuestions(chatId)` - 增加提问次数
4. `endGame(chatId)` - 结束游戏（设置 status='ended', ended_at=NOW()）
5. `deleteGame(chatId)` - 删除游戏（用于 /cancel）

**关键点**：
- ✅ scenario 和 truth 是普通字符串，直接存取
- ✅ 使用参数化查询防止 SQL 注入
- ✅ 每次操作都直接查数据库，不维护内存缓存

**参考**：`tech_design.md` 2.2 节

**验收标准**：
- [ ] 所有方法都能正确执行数据库操作
- [ ] `getCurrentGame()` 返回 null 当没有游戏时
- [ ] `chat_id` UNIQUE 约束能正确防止重复游戏

---

## Phase 2：AI 客户端

### Task 2.1：实现 OpenRouter API 客户端 (`src/core/aiClient.js`)

**目标**：封装 OpenRouter API 调用

**依赖**：Task 1.1

**文件**：`src/core/aiClient.js`

**实现方法**：
1. `generateStory(language)` - 生成场景和汤底
2. `judgeQuestion(scenario, truth, question, language)` - 判断问题

**关键要求**：

#### `generateStory(language)`
- **输入**：`'en'` 或 `'ru'`
- **输出**：`{ scenario: string, truth: string }`
- **Prompt 要求**（参考 PRD）：
  - 难度：中等
  - scenario：50-100 字
  - truth：150-300 字
  - 返回格式：纯 JSON `{"scenario": "...", "truth": "..."}`
- **错误处理**：
  - JSON 解析失败 → throw Error
  - API 错误 → throw Error

#### `judgeQuestion(scenario, truth, question, language)`
- **输入**：场景、汤底、问题、语言
- **输出**：`'YES'` / `'NO'` / `'IRRELEVANT'`
- **Prompt 要求**（参考 PRD）：
  - 只返回三个词之一：YES / NO / IRRELEVANT
  - max_tokens: 10
- **强制映射**（关键）：
```javascript
const answer = data.choices[0].message.content.trim().toUpperCase();
if (answer.includes('YES')) return 'YES';
if (answer.includes('NO')) return 'NO';
return 'IRRELEVANT'; // 其他任何情况
```

**参考**：`tech_design.md` 3 节、`prd.md` AI 集成规范

**验收标准**：
- [ ] `generateStory()` 能返回正确格式的 JSON
- [ ] `judgeQuestion()` 返回值严格为三个值之一
- [ ] API 错误能正确 throw Error

---

### Task 2.2：测试 AI 客户端

**目标**：验证 API 调用正常

**依赖**：Task 2.1

**测试脚本**：
```javascript
// test-ai.js
import { aiClient } from './src/core/aiClient.js';

async function test() {
  // 测试生成故事
  const story = await aiClient.generateStory('en');
  console.log('Scenario:', story.scenario);
  console.log('Truth:', story.truth);

  // 测试判断问题
  const answer = await aiClient.judgeQuestion(
    story.scenario,
    story.truth,
    'Is this intentional?',
    'en'
  );
  console.log('Answer:', answer);
}

test();
```

**验收标准**：
- [ ] 能成功生成英语故事
- [ ] 能成功生成俄语故事
- [ ] 能正确判断问题

---

## Phase 3：核心业务逻辑

### Task 3.1：实现游戏核心逻辑 (`src/core/gameLogic.js`)

**目标**：封装游戏业务逻辑

**依赖**：Task 1.3, Task 2.1

**文件**：`src/core/gameLogic.js`

**实现方法**：
1. `startGame(chatId, language)` - 启动游戏
2. `handleQuestion(chatId, question)` - 处理提问
3. `submitGuess(chatId, guess)` - 提交猜测
4. `revealAnswer(chatId)` - 查看答案
5. `cancelGame(chatId)` - 取消游戏

**关键要点**：

#### `startGame(chatId, language)`
```javascript
// 1. 检查是否已有游戏
const existingGame = await gameRepo.getCurrentGame(chatId);
if (existingGame) {
  throw new Error('GAME_IN_PROGRESS');
}

// 2. 生成故事
const { scenario, truth } = await aiClient.generateStory(language);

// 3. 创建游戏记录
await gameRepo.create(chatId, language, scenario, truth);

return { scenario, truth };
```

#### `submitGuess(chatId, guess)` / `revealAnswer(chatId)` / `cancelGame(chatId)`
⚠️ **关键修正**：先拿 language，再结束游戏
```javascript
const game = await gameRepo.getCurrentGame(chatId);
if (!game) {
  throw new Error('NO_GAME');
}

// ✅ 先保存需要的数据
const result = {
  truth: game.truth,
  language: game.language,  // ← 先拿
  questionsCount: game.questions_count,
};

// 再结束游戏
await gameRepo.endGame(chatId);

return result;
```

**错误类型**：
- `GAME_IN_PROGRESS` - 游戏进行中
- `NO_GAME` - 没有游戏

**参考**：`tech_design.md` 4 节（已修正版）

**验收标准**：
- [ ] `startGame()` 检查重复游戏
- [ ] `handleQuestion()` 能调用 AI 判断并增加计数
- [ ] `submitGuess()` / `revealAnswer()` / `cancelGame()` 正确返回 language

---

### Task 3.2：测试游戏核心逻辑

**目标**：验证业务逻辑正确

**依赖**：Task 3.1

**测试要点**：
- [ ] 重复启动游戏抛出 `GAME_IN_PROGRESS`
- [ ] 没有游戏时提问抛出 `NO_GAME`
- [ ] 结束游戏后能正确返回 language

---

## Phase 4：消息和多语言

### Task 4.1：实现多语言支持 (`src/messages/i18n.js`)

**目标**：英语和俄语双语支持

**依赖**：无

**文件**：`src/messages/i18n.js`

**实现要点**：
- 定义 `messages.en` 和 `messages.ru` 对象
- 实现 `t(language, key)` 函数

**必需的文本 key**（参考 PRD）：
```javascript
{
  selectLanguage,
  generating,
  gameStarted,
  askHint,
  answerYes,
  answerNo,
  answerIrrelevant,
  gameEnded,
  yourGuess,
  theTruth,
  revealed,
  completeStory,
  gameCancelled,
  startNewGame,
  gameInProgress,
  noGame,
  guessEmpty,
  generationFailed,
  networkError,
  unknownError,
  helpText,
}
```

**参考**：`tech_design.md` 5 节、`prd.md` 用户体验要点

**验收标准**：
- [ ] 所有 key 都有英语和俄语翻译
- [ ] `t()` 函数能正确返回文本
- [ ] 缺失 key 时回退到英语

---

### Task 4.2：实现消息构建器 (`src/messages/builder.js`)

**目标**：构建各种消息文本

**依赖**：Task 4.1

**文件**：`src/messages/builder.js`

**实现方法**：
1. `buildScenarioMessage(language, scenario)` - 场景消息
2. `buildAnswerMessage(language, answer)` - 是/否/无关消息
3. `buildGuessResultMessage(language, guess, truth)` - 猜测对比消息
4. `buildRevealMessage(language, truth)` - 揭晓答案消息
5. `buildCancelMessage(language)` - 取消消息

**参考**：`tech_design.md` 6 节

**验收标准**：
- [ ] 所有方法返回格式正确的消息
- [ ] 消息包含正确的 emoji 和格式

---

## Phase 5：Handler 层

### Task 5.1：实现命令处理器 (`src/handlers/commands.js`)

**目标**：处理所有 bot 命令

**依赖**：Task 3.1, Task 4.2

**文件**：`src/handlers/commands.js`

**实现命令**：
1. `/newgame` - 启动游戏
2. `/guess <内容>` - 提交猜测
3. `/reveal` - 查看答案
4. `/cancel` - 取消游戏
5. `/help` - 帮助

**关键要点**：

#### `/newgame` 修正
```javascript
bot.command('newgame', async (ctx) => {
  const chatId = ctx.chat.id;
  
  // ✅ 先检查是否已有游戏
  const existingGame = await gameRepo.getCurrentGame(chatId);
  if (existingGame) {
    await ctx.reply(t(existingGame.language || 'en', 'gameInProgress'));
    return;
  }
  
  // ✅ 使用 InlineKeyboard
  const keyboard = new InlineKeyboard()
    .text('English', 'lang_en')
    .text('Русский', 'lang_ru');
  
  await ctx.reply(t('en', 'selectLanguage'), {
    reply_markup: keyboard,
  });
});
```

#### `/guess` / `/reveal` / `/cancel` 修正
```javascript
// ✅ 从 result.language 获取语言
const result = await gameLogic.submitGuess(chatId, guess);
const message = messageBuilder.buildGuessResultMessage(
  result.language,  // ← 从返回值获取
  result.guess,
  result.truth
);
```

**参考**：`tech_design.md` 7.1 节（已修正版）

**验收标准**：
- [ ] 所有命令都能正确处理
- [ ] 错误处理完整（GAME_IN_PROGRESS, NO_GAME 等）
- [ ] InlineKeyboard 正确显示

---

### Task 5.2：实现回调处理器 (`src/handlers/callbacks.js`)

**目标**：处理 inline keyboard 回调

**依赖**：Task 3.1, Task 4.2

**文件**：`src/handlers/callbacks.js`

**实现回调**：
- 语言选择：`lang_en` / `lang_ru`

**关键要点**：
```javascript
// ✅ 正确获取 chatId
const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
if (!chatId) return;

// 回调正则匹配
bot.callbackQuery(/^lang_(en|ru)$/, async (ctx) => {
  const language = ctx.match[1]; // 'en' 或 'ru'
  // ...
});
```

**参考**：`tech_design.md` 7.2 节

**验收标准**：
- [ ] 语言选择回调能正确触发
- [ ] 能成功生成故事并显示
- [ ] 错误处理完整

---

### Task 5.3：实现消息处理器 (`src/handlers/messages.js`)

**目标**：处理回复 bot 的消息（提问）

**依赖**：Task 3.1, Task 4.2

**文件**：`src/handlers/messages.js`

**实现要点**：
```javascript
bot.on('message:text', async (ctx) => {
  // 只处理回复 bot 消息的情况
  const replyTo = ctx.message.reply_to_message;
  if (!replyTo || replyTo.from.id !== ctx.me.id) {
    return; // 不是回复 bot 的消息，忽略
  }
  
  const chatId = ctx.chat.id;
  const question = ctx.message.text;
  
  // 调用 gameLogic.handleQuestion
  // ...
});
```

**参考**：`tech_design.md` 7.3 节、`prd.md` 提问方式

**验收标准**：
- [ ] 回复 bot 任何消息都能触发提问
- [ ] 非回复消息被忽略
- [ ] 没有游戏时显示正确提示

---

## Phase 6：集成和测试

### Task 6.1：实现主入口文件 (`bot.js`)

**目标**：整合所有模块并启动 bot

**依赖**：Task 1.2, Task 5.1, Task 5.2, Task 5.3

**文件**：`bot.js`

**实现流程**：
```javascript
async function main() {
  // 1. 验证环境变量
  validateConfig();
  
  // 2. 测试数据库连接
  await testConnection();
  
  // 3. 初始化数据库表
  await initDatabase();
  
  // 4. 创建 bot 实例
  const bot = new Bot(config.BOT_TOKEN);
  
  // 5. 注册处理器
  registerCommands(bot);
  registerCallbacks(bot);
  registerMessageHandlers(bot);
  
  // 6. 启动 bot
  console.log('🤖 Bot 启动中...');
  await bot.start();
  console.log('✅ Bot 已启动');
}

main().catch((error) => {
  console.error('❌ Bot 启动失败:', error);
  process.exit(1);
});
```

**参考**：`tech_design.md` 8 节

**验收标准**：
- [ ] `npm start` 能成功启动 bot
- [ ] 环境变量验证正常
- [ ] 数据库连接成功
- [ ] 所有 handler 正常工作

---

### Task 6.2：本地完整测试

**目标**：验证所有功能正常

**依赖**：Task 6.1

**测试清单**（参考 PRD 验收标准）：

#### 核心流程
- [ ] `/newgame` 能启动游戏并选择语言
- [ ] AI 能成功生成英语场景
- [ ] AI 能成功生成俄语场景
- [ ] 回复 bot 消息能触发提问
- [ ] AI 判断返回正确的 是/否/无关
- [ ] `/guess <内容>` 能显示对比并结束游戏
- [ ] `/reveal` 能直接显示答案
- [ ] `/cancel` 能取消游戏

#### 边缘情况
- [ ] 游戏进行中发 `/newgame` 有正确提示
- [ ] 无游戏时回复 bot 消息有正确提示
- [ ] `/guess` 无内容有正确提示
- [ ] API 失败有友好提示
- [ ] 多人同时提问都能收到回复

#### 多语言
- [ ] 英语场景和提示正确
- [ ] 俄语场景和提示正确
- [ ] `/help` 显示正确

#### 数据持久化
- [ ] Bot 重启后游戏状态正常恢复
- [ ] 一个群只能有一场游戏（重复启动被拦截）

**测试方法**：
1. 创建测试群组
2. 添加 bot
3. 按测试清单逐项测试
4. 记录问题到 `changelog.md`

---

### Task 6.3：修复测试中发现的 Bug

**目标**：解决本地测试发现的问题

**依赖**：Task 6.2

**流程**：
1. 根据测试清单，修复所有发现的 bug
2. 每个 bug 修复后重新测试
3. 更新 `changelog.md`

**验收标准**：
- [ ] 所有测试清单项通过
- [ ] 无已知 bug

---

## Phase 7：部署上线

### Task 7.1：Railway 部署

**目标**：部署到 Railway 生产环境

**依赖**：Task 6.3

**步骤**：

1. **创建 Railway 项目**
   - 连接 GitHub 仓库
   - 添加 MySQL 数据库服务

2. **配置环境变量**（参考 `tech_design.md` 环境变量配置）
```bash
BOT_TOKEN=<生产 token>
DB_HOST=<Railway MySQL 公网地址>
DB_PORT=3306
DB_NAME=railway
DB_USER=root
DB_PASSWORD=<Railway 生成的密码>
OPENROUTER_API_KEY=<你的 API key>
```

3. **部署**
   - Railway 自动检测 `npm start`
   - 查看日志确认启动成功

4. **测试生产环境**
   - 在正式群组测试核心功能
   - 验证数据库连接正常

**验收标准**：
- [ ] Bot 在 Railway 上正常运行
- [ ] 所有功能在生产环境正常
- [ ] 日志无错误

---

### Task 7.2：文档完善和项目收尾

**目标**：完善文档，项目收尾

**依赖**：Task 7.1

**步骤**：

1. **更新 README.md**
   - 添加功能介绍
   - 添加部署说明
   - 添加使用示例

2. **完善 changelog.md**
   - 记录 MVP 版本完成
   - 记录所有修复的 bug

3. **代码清理**
   - 移除调试日志
   - 确保代码符合 CLAUDE.md 规范

4. **Git 提交**
```bash
git add .
git commit -m "feat: MVP 版本完成"
git push
```

**验收标准**：
- [ ] README.md 完整清晰
- [ ] changelog.md 记录完整
- [ ] 代码整洁无调试代码
- [ ] Git 仓库整洁

---

## 📊 任务进度跟踪

### Phase 0：项目初始化
- [x] Task 0.1：创建项目结构和配置文件（已手动完成）
- [x] Task 0.2：创建目录结构（已手动完成）
- [x] Task 0.3：安装依赖并测试

### Phase 1：数据库层
- [x] Task 1.1：实现环境变量配置
- [x] Task 1.2：实现数据库连接池
- [x] Task 1.3：实现游戏数据仓库

### Phase 2：AI 客户端
- [x] Task 2.1：实现 OpenRouter API 客户端
- [x] Task 2.2：测试 AI 客户端

### Phase 3：核心业务逻辑
- [x] Task 3.1：实现游戏核心逻辑
- [x] Task 3.2：测试游戏核心逻辑

### Phase 4：消息和多语言
- [x] Task 4.1：实现多语言支持
- [x] Task 4.2：实现消息构建器

### Phase 5：Handler 层
- [x] Task 5.1：实现命令处理器
- [x] Task 5.2：实现回调处理器
- [x] Task 5.3：实现消息处理器

### Phase 6：集成和测试
- [x] Task 6.1：实现主入口文件
- [x] Task 6.2：本地完整测试
- [x] Task 6.3：修复测试中发现的 Bug

### Phase 7：部署上线
- [x] Task 7.1：Railway 部署
- [x] Task 7.2：文档完善和项目收尾

---

## ✅ MVP v1.0 已完成！

所有 Task 已完成，项目已成功部署并测试通过。

---

## Phase 8：v1.1 并发和稳定性优化

### Task 8.1：修复 startGame 竞态条件

**目标**：解决多用户同时点击语言按钮导致的并发问题

**依赖**：无（基于现有 Task 3.1）

**问题描述**：
当多个用户几乎同时点击语言按钮时，会出现竞态条件导致第二个请求因 MySQL UNIQUE 约束失败。

**修改文件**：`src/core/gameLogic.js`

**修改内容**：
```javascript
// 修改前（有竞态问题）
async startGame(chatId, language) {
  const existingGame = await gameRepo.getCurrentGame(chatId);
  if (existingGame) {
    throw new Error('GAME_IN_PROGRESS');
  }
  const { scenario, truth } = await aiClient.generateStory(language);
  await gameRepo.create(chatId, language, scenario, truth);
  return { scenario, truth };
}

// 修改后（利用数据库约束）
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

**关键改动**：
1. 移除 `getCurrentGame` 的提前检查
2. 直接调用 `create`，依赖数据库 `chat_id UNIQUE` 约束
3. 捕获 MySQL 的 `ER_DUP_ENTRY` 错误，转换为 `GAME_IN_PROGRESS`

**影响分析**：
- ✅ 解决并发竞态问题
- ✅ 用户看到正确的 "gameInProgress" 提示
- ✅ 避免浪费 OpenRouter API 调用（第二个请求会在生成前就发现冲突）
- ⚠️ 注意：这个方案会在生成故事**之后**才检测冲突，仍可能浪费一次 API（但比现在好）

**验收标准**：
- [ ] 两个用户同时点击不同语言按钮，第二个用户看到 "gameInProgress" 而不是 "unknownError"
- [ ] 单用户正常流程不受影响
- [ ] 错误日志中不再出现未捕获的 `ER_DUP_ENTRY`

**参考**：PRD v1.1 - 问题 1

---

### Task 8.2：添加 AI API 超时处理

**目标**：为 OpenRouter API 调用添加超时和错误处理

**依赖**：无（基于现有 Task 2.1）

**问题描述**：
OpenRouter API 调用没有超时设置，网络问题时请求可能无限挂起，导致用户长时间等待。

**修改文件**：`src/core/aiClient.js`

**修改内容**：

在 `generateStory` 和 `judgeQuestion` 中添加超时控制：

```javascript
// 为两个方法添加超时逻辑
async generateStory(language) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s

  try {
    const response = await fetch(`${config.OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { ... },
      body: JSON.stringify({ ... }),
      signal: controller.signal, // ← 添加这一行
    });

    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`OpenRouter API 错误: ${response.status}`);
    }
    // ... 其余逻辑不变
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('API_TIMEOUT');
    }
    throw error;
  }
}

// judgeQuestion 同样添加（超时改为 10s）
```

**超时设定**：
- `generateStory`：15 秒（故事生成通常 3-8 秒）
- `judgeQuestion`：10 秒（问题判断通常 1-3 秒）

**Handler 层配合修改**：
在 `callbacks.js` 和 `messages.js` 中捕获 `API_TIMEOUT`：

```javascript
// src/handlers/callbacks.js
catch (error) {
  if (error.message === 'GAME_IN_PROGRESS') {
    await ctx.reply(t(language, 'gameInProgress'));
  } else if (error.message === 'API_TIMEOUT') {
    await ctx.reply(t(language, 'networkError'));
  } else {
    console.error('Error generating story:', error);
    await ctx.reply(t(language, 'generationFailed'));
  }
}
```

**关键改动**：
1. 使用 `AbortController` 实现超时
2. 捕获 `AbortError` 并转换为 `API_TIMEOUT`
3. Handler 层统一映射到 "networkError" 提示

**影响分析**：
- ✅ 避免请求无限挂起
- ✅ 用户得到明确的超时提示
- ✅ 防止 Railway 实例因请求堆积耗尽资源
- ⚠️ 超时后用户需要重新 `/newgame`（可接受）

**验收标准**：
- [ ] 模拟网络延迟 > 15s，用户看到 "networkError" 而不是无响应
- [ ] 正常网络下功能不受影响
- [ ] 超时后重新发起请求能正常工作

**参考**：PRD v1.1 - 问题 2

---

---

## 🎯 关键里程碑

1. **Milestone 1**：数据库层完成（Task 1.3）
2. **Milestone 2**：AI 客户端完成（Task 2.2）
3. **Milestone 3**：核心逻辑完成（Task 3.2）
4. **Milestone 4**：Handler 层完成（Task 5.3）
5. **Milestone 5**：本地测试通过（Task 6.2）
6. **Milestone 6**：生产环境上线（Task 7.1）

---

## 📝 开发注意事项

### 开发规范（参考 CLAUDE.md）

1. **不得随意重构**：修改前说明原因和影响范围
2. **数据库约定**：
   - ✅ LONGTEXT 存普通字符串
   - ✅ scenario/truth 直接存取，不用 JSON.stringify
   - ⚠️ 未来 JSON 字段用 LONGTEXT + JSON.stringify/parse
3. **callbackQuery 获取 chatId**：
   ```javascript
   const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
   ```
4. **存库前清理**：删除不可序列化字段（如 timeout）
5. **每个 task 完成后 commit**

### 调试原则

1. 先加日志，再猜原因
2. 每次只改一处
3. commit 前问：这个改动有没有影响其他模块？

### 本地开发

⚠️ **重要**：本地开发时必须先停止 Railway 上的 bot，否则会 409 冲突。

检查本地进程：
```powershell
Get-Process node | ForEach-Object { (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine }
```

---

## Phase 9：故事生成质量优化

### Task 9.1：优化 AI 故事生成 Prompt

**目标**：提升海龟汤故事的多样性、刺激性和复杂度

**依赖**：无（基于现有 Task 2.1 aiClient.js）

**问题背景**：
测试中发现生成的故事场景过于相似，不够刺激/猎奇，不符合年轻用户的期待。

**修改文件**：`src/core/aiClient.js`

**改进方向**：

#### 1. 强制类型多样化
每次生成时从 5 个类型中随机选一个，避免风格单一：

```javascript
const types = [
  'Dark/Disturbing: involves death, crime, psychological horror',
  'Bizarre/Absurd: extremely weird logic, unexpected twists',
  'Gore/Thriller: graphic but tasteful, shocking revelations',
  'Mind-bending: reality isn\'t what it seems, unreliable narrator',
  'Dark Humor: morbid but darkly funny'
];
const randomType = types[Math.floor(Math.random() * types.length)];
```

#### 2. 提高复杂度要求
在 prompt 中明确要求：
- 故事必须有至少 2 层反转
- 表面解释必须是误导性的
- 难度中等偏高（需要深度推理）
- 避免常见套路

#### 3. 明确禁止重复老梗
列出海龟汤界的经典老梗，强制 AI 避开：
- 信天翁/海龟汤故事
- 电梯场景
- 密室自杀
- 酒保用枪治打嗝
- 以上任何变体

**修改后的 Prompt 结构**：

```javascript
async generateStory(language) {
  const languageMap = {
    en: 'English',
    ru: 'Russian',
  };

  // 随机选择类型
  const types = [
    'Dark/Disturbing: involves death, crime, psychological horror',
    'Bizarre/Absurd: extremely weird logic, unexpected twists',
    'Gore/Thriller: graphic but tasteful, shocking revelations',
    'Mind-bending: reality isn\'t what it seems, unreliable narrator',
    'Dark Humor: morbid but darkly funny'
  ];
  const randomType = types[Math.floor(Math.random() * types.length)];

  const prompt = `You are a host of a Lateral Thinking Puzzle game (also known as "Situation Puzzle" or "海龟汤").
Generate a puzzle in ${languageMap[language]} with the following requirements:

**Puzzle Type (MUST follow this style):**
${randomType}

**Requirements:**
1. Scenario: 50-100 words, mysterious and intriguing
2. Truth: 150-300 words, complete explanation
3. The puzzle MUST have at least 2 unexpected plot twists
4. The most obvious explanation should be misleading
5. Solvable through yes/no questions
6. Aim for medium-high difficulty (requires deep reasoning)

**FORBIDDEN scenarios (do NOT use):**
- Albatross/turtle soup stories
- Elevator scenarios
- Locked room suicide
- Bartender cures hiccups with gun
- Any variation of these classic puzzles

Return ONLY a valid JSON object with this exact format:
{"scenario": "...", "truth": "..."}

Do not include any other text or explanation.`;

  // ... 其余代码不变
}
```

**测试要点**：
1. **内容审核测试**：生成 5-10 个 Gore/Dark 类型故事，检查 Gemini 是否会拒绝
   - 如果被拒绝，调整为 "Thriller: shocking but not overly graphic"
2. **类型分布测试**：生成 20 个故事，检查 5 种类型分布是否均匀
3. **老梗避免测试**：确认不再出现禁止列表中的场景
4. **复杂度测试**：实际玩 3-5 局，评估故事是否有 2 层反转、难度是否提升
5. **多语言测试**：俄语故事质量是否与英语一致

**影响分析**：
- ✅ 只修改 `aiClient.generateStory` 的 prompt 和类型选择逻辑
- ✅ 返回值格式不变（仍然是 `{scenario, truth}`）
- ✅ 不影响其他模块（gameLogic, handlers 等）
- ⚠️ 生成时间可能略有增加（更复杂的要求）
- ⚠️ 需要监控 API 是否因内容审核拒绝生成

**验收标准**：
- [ ] 连续生成 10 个故事，5 种类型都有出现
- [ ] 没有出现禁止列表中的老梗
- [ ] 至少 70% 的故事有明显的反转/误导
- [ ] 英语和俄语故事质量一致
- [ ] Gemini 没有因内容审核拒绝生成（或已调整 prompt）

**参考**：
- 当前 `aiClient.generateStory` 实现（`src/core/aiClient.js` L10-L63）
- PRD AI 集成规范

---

## Phase 10：难度选择功能（v1.1）

### 功能概述

**新游戏流程**：`/newgame` → 选语言 → **选难度** → 生成故事

**三个难度**：
- **🟢 Easy（简单）**：逻辑直接，5-10 个问题可解，适合新手
- **🟡 Medium（中等）**：有 1-2 个反转，10-20 个问题，主流体验
- **🔴 Hard（困难）**：多层反转、误导性强、猎奇黑暗风格，20+ 问题

**数据库变更**：
- 新增 `difficulty` 字段（VARCHAR(10)），存储 'easy' / 'medium' / 'hard'

---

### Task 10.1：数据库添加 difficulty 字段

**目标**：在 `games` 表中添加 `difficulty` 字段支持

**依赖**：无

**修改文件**：
- `src/db/pool.js` - 修改 `initDatabase()` 的建表 SQL
- `src/db/gameRepo.js` - 修改 `create()` 方法签名

**具体改动**：

#### 1. `src/db/pool.js` - 修改建表 SQL

在 `CREATE TABLE` 语句中添加 `difficulty` 字段：

```sql
CREATE TABLE IF NOT EXISTS games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id BIGINT NOT NULL UNIQUE,
  language VARCHAR(2) NOT NULL COMMENT 'en 或 ru',
  difficulty VARCHAR(10) NOT NULL COMMENT 'easy / medium / hard',  -- 新增此行
  scenario LONGTEXT NOT NULL COMMENT '场景描述',
  truth LONGTEXT NOT NULL COMMENT '完整故事/汤底',
  questions_count INT DEFAULT 0 COMMENT '提问次数',
  status VARCHAR(20) NOT NULL COMMENT 'playing 或 ended',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  INDEX idx_chat_id (chat_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2. `src/db/gameRepo.js` - 修改 create 方法

```javascript
/**
 * 创建新游戏
 */
async create(chatId, language, difficulty, scenario, truth) {
  const [result] = await pool.execute(
    `INSERT INTO games (chat_id, language, difficulty, scenario, truth, status)
     VALUES (?, ?, ?, ?, ?, 'playing')`,
    [chatId, language, difficulty, scenario, truth]
  );
  return result.insertId;
}
```

**数据库迁移**（如果生产环境已有表）：

```sql
-- 如果表已存在，执行此 SQL（Railway MySQL 控制台）
ALTER TABLE games ADD COLUMN difficulty VARCHAR(10) NOT NULL DEFAULT 'medium';
```

⚠️ **注意**：由于你们使用的是删除式 `endGame`，表里应该没有历史数据，可以直接删表重建：
```sql
DROP TABLE IF EXISTS games;
```
然后重启 bot，会自动用新结构建表。

**验收标准**：
- [ ] 执行 `DESCRIBE games;` 能看到 `difficulty VARCHAR(10)` 字段
- [ ] `gameRepo.create(chatId, 'en', 'hard', scenario, truth)` 能成功插入
- [ ] 已有表需要执行迁移 SQL 或删表重建

**参考**：
- 当前 `pool.js` 实现（`src/db/pool.js` L27-L46）
- 当前 `gameRepo.js` 实现（`src/db/gameRepo.js` L8-L15）

---

### Task 10.2：多语言文本新增难度相关提示

**目标**：在 i18n 中添加难度选择的提示文本

**依赖**：无

**修改文件**：`src/messages/i18n.js`

**具体改动**：

在 `messages.en` 和 `messages.ru` 对象中添加以下 key：

```javascript
// messages.en 中添加
selectDifficulty: '🎯 Select difficulty:',
difficultyEasy: '🟢 Easy',
difficultyMedium: '🟡 Medium',
difficultyHard: '🔴 Hard',
difficultyEasyDesc: 'Simple logic, 5-10 questions',
difficultyMediumDesc: '1-2 twists, 10-20 questions',
difficultyHardDesc: 'Multi-layered, dark themes, 20+ questions',

// messages.ru 中添加
selectDifficulty: '🎯 Выберите сложность:',
difficultyEasy: '🟢 Легко',
difficultyMedium: '🟡 Средне',
difficultyHard: '🔴 Сложно',
difficultyEasyDesc: 'Простая логика, 5-10 вопросов',
difficultyMediumDesc: '1-2 поворота, 10-20 вопросов',
difficultyHardDesc: 'Многослойный, темные темы, 20+ вопросов',
```

**验收标准**：
- [ ] `t('en', 'selectDifficulty')` 返回 `'🎯 Select difficulty:'`
- [ ] `t('ru', 'difficultyHard')` 返回 `'🔴 Сложно'`
- [ ] 所有 7 个新 key 在英语和俄语中都有对应翻译
- [ ] emoji 显示正常

**参考**：
- 当前 `i18n.js` 实现（`src/messages/i18n.js`）

---

### Task 10.3：AI 客户端根据难度调整 Prompt

**目标**：`aiClient.generateStory()` 接收 difficulty 参数并调整 prompt

**依赖**：Task 9.1（已完成，使用了类型系统）

**修改文件**：`src/core/aiClient.js`

**具体改动**：

```javascript
/**
 * 生成故事（场景 + 汤底）
 * @param {string} language - 'en' 或 'ru'
 * @param {string} difficulty - 'easy' / 'medium' / 'hard'
 * @returns {Promise<{scenario: string, truth: string}>}
 */
async generateStory(language, difficulty) {
  const languageMap = {
    en: 'English',
    ru: 'Russian',
  };

  const types = [
    'Dark/Disturbing: involves death, crime, psychological horror',
    'Bizarre/Absurd: extremely weird logic, unexpected twists',
    'Gore/Thriller: graphic but tasteful, shocking revelations',
    "Mind-bending: reality isn't what it seems, unreliable narrator",
    'Dark Humor: morbid but darkly funny',
  ];
  const randomType = types[Math.floor(Math.random() * types.length)];

  // 根据难度调整 prompt
  const difficultyPrompts = {
    easy: `Difficulty: EASY
- Simple, straightforward logic
- Minimal misdirection
- Should be solvable in 5-10 questions
- Avoid overly complex twists
- Type: Light mystery or simple paradox`,
    
    medium: `Difficulty: MEDIUM
- 1-2 unexpected plot twists
- Some misdirection but not overwhelming
- Should require 10-20 questions to solve
- Balanced complexity
- Type: ${randomType}`,
    
    hard: `Difficulty: HARD
- Multiple layers of misdirection and plot twists
- Dark, disturbing, or mind-bending themes preferred
- Requires 20+ questions and deep reasoning
- The obvious explanation should be completely wrong
- Type: ${randomType}`,
  };

  const difficultyPrompt = difficultyPrompts[difficulty] || difficultyPrompts.medium;

  const prompt = `You are a host of a Lateral Thinking Puzzle game (also known as "Situation Puzzle" or "海龟汤").
Generate a puzzle in ${languageMap[language]} with the following requirements:

${difficultyPrompt}

Requirements:
1. Scenario: 50-100 words, mysterious and intriguing
2. Truth: 150-300 words, complete explanation
3. The puzzle must be solvable through yes/no questions
4. Tailor complexity strictly to the difficulty level specified above

FORBIDDEN scenarios (do NOT use):
- Albatross/turtle soup stories
- Elevator scenarios
- Locked room suicide
- Bartender cures hiccups with gun
- Any variation of these classic puzzles

Return ONLY a valid JSON object with this exact format:
{"scenario": "...", "truth": "..."}
Do not include any other text or explanation.`;

  // ... 其余超时和解析逻辑不变
}
```

**关键点**：
- Easy 难度不使用 Task 9.1 的随机类型，固定为 "Light mystery"
- Medium 和 Hard 使用 Task 9.1 的 5 种随机类型
- Hard 难度优先选择 Dark/Gore/Mind-bending 风格（通过 prompt 引导）

**验收标准**：
- [ ] `generateStory('en', 'easy')` 生成的故事逻辑简单，无明显反转
- [ ] `generateStory('en', 'medium')` 生成的故事有 1-2 个反转
- [ ] `generateStory('en', 'hard')` 生成的故事有多层反转和强误导
- [ ] 三个难度的故事风格区分明显
- [ ] Easy 难度能在 5-10 问内猜中（实测 3-5 局验证）
- [ ] Hard 难度需要 15+ 问才能猜中（实测 3-5 局验证）

**参考**：
- 当前 `aiClient.generateStory` 实现（`src/core/aiClient.js` L10-L78）
- Task 9.1 的类型系统设计

---

### Task 10.4：游戏逻辑层支持难度参数

**目标**：`gameLogic.startGame()` 接收 difficulty 并传递给 AI 和数据库

**依赖**：Task 10.1, Task 10.3

**修改文件**：`src/core/gameLogic.js`

**具体改动**：

```javascript
/**
 * 启动新游戏
 */
async startGame(chatId, language, difficulty) {
  try {
    // 生成故事时传入 difficulty
    const { scenario, truth } = await aiClient.generateStory(language, difficulty);
    
    // 创建游戏时传入 difficulty
    await gameRepo.create(chatId, language, difficulty, scenario, truth);
    
    return { scenario, truth };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('GAME_IN_PROGRESS');
    }
    throw error;
  }
}
```

**关键点**：
- 方法签名从 `startGame(chatId, language)` 改为 `startGame(chatId, language, difficulty)`
- 错误处理逻辑（`ER_DUP_ENTRY`、超时等）保持不变
- 返回值结构不变

**验收标准**：
- [ ] `startGame(chatId, 'en', 'hard')` 能成功创建 hard 难度游戏
- [ ] 数据库中 `difficulty` 字段正确存储为 `'hard'`
- [ ] 错误处理逻辑（`GAME_IN_PROGRESS`、`API_TIMEOUT`）正常工作
- [ ] 不传 difficulty 参数会报错（参数必需）

**参考**：
- 当前 `gameLogic.startGame` 实现（`src/core/gameLogic.js` L9-L22）
- Task 8.1 的并发控制逻辑

---

### Task 10.5：Handler 层新增难度选择流程

**目标**：在语言选择后弹出难度选择键盘，点击难度后生成故事

**依赖**：Task 10.2, Task 10.4

**修改文件**：`src/handlers/callbacks.js`

**具体改动**：

#### 1. 修改现有的语言选择回调（不再直接生成故事）

```javascript
// 语言选择回调（callback_data: lang_en / lang_ru）
bot.callbackQuery(/^lang_(en|ru)$/, async (ctx) => {
  const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
  if (!chatId) return;

  const language = ctx.match[1]; // 'en' 或 'ru'

  await ctx.answerCallbackQuery();
  
  // ✅ 显示难度选择键盘，而不是直接生成故事
  const keyboard = new InlineKeyboard()
    .text(t(language, 'difficultyEasy'), `diff_${language}_easy`)
    .text(t(language, 'difficultyMedium'), `diff_${language}_medium`)
    .text(t(language, 'difficultyHard'), `diff_${language}_hard`);
  
  await ctx.editMessageText(t(language, 'selectDifficulty'), {
    reply_markup: keyboard,
  });
});
```

#### 2. 新增难度选择回调（生成故事）

```javascript
// 难度选择回调（callback_data: diff_en_easy / diff_ru_medium / diff_en_hard 等）
bot.callbackQuery(/^diff_(en|ru)_(easy|medium|hard)$/, async (ctx) => {
  const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
  if (!chatId) return;

  const language = ctx.match[1]; // 'en' 或 'ru'
  const difficulty = ctx.match[2]; // 'easy' / 'medium' / 'hard'

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(t(language, 'generating'));

  try {
    const { scenario } = await gameLogic.startGame(chatId, language, difficulty);
    const message = messageBuilder.buildScenarioMessage(language, scenario);
    await ctx.reply(message);
  } catch (error) {
    if (error.message === 'GAME_IN_PROGRESS') {
      await ctx.reply(t(language, 'gameInProgress'));
    } else if (error.message === 'API_TIMEOUT') {
      await ctx.reply(t(language, 'networkError'));
    } else {
      console.error('Error generating story:', error);
      await ctx.reply(t(language, 'generationFailed'));
    }
  }
});
```

**关键点**：
- 语言选择回调不再调用 `gameLogic.startGame`，只显示难度键盘
- 难度选择回调的错误处理与原语言回调完全一致
- Callback 数据格式：`diff_{language}_{difficulty}`，方便正则提取
- 使用 `editMessageText` 更新消息，避免刷屏

**验收标准**：
- [ ] 点击语言按钮后显示三个难度按钮（🟢 🟡 🔴）
- [ ] 难度按钮文本使用对应语言（英语/俄语）
- [ ] 点击难度按钮后显示 "⏳ Generating story..."
- [ ] 成功生成对应难度的故事
- [ ] 错误处理（`GAME_IN_PROGRESS`、`API_TIMEOUT` 等）正常工作
- [ ] 语言+难度组合共 6 种（en/ru × easy/medium/hard）全部测试通过

**参考**：
- 当前 `callbacks.js` 实现（`src/handlers/callbacks.js`）
- Task 8.2 的超时错误处理

---

### Task 10.6：集成测试和文档更新

**目标**：测试 6 种语言+难度组合，更新相关文档

**依赖**：Task 10.1 ~ 10.5 全部完成

**测试矩阵**（6 种组合）：

| 语言 | 难度 | 验收标准 |
|------|------|----------|
| English | Easy | 逻辑简单，5-10 问可解 |
| English | Medium | 有 1-2 个反转，10-20 问 |
| English | Hard | 多层反转，黑暗风格，20+ 问 |
| Русский | Easy | 逻辑简单，5-10 问可解 |
| Русский | Medium | 有 1-2 个反转，10-20 问 |
| Русский | Hard | 多层反转，黑暗风格，20+ 问 |

**测试流程**：
1. 在测试群组执行 `/newgame`
2. 选择语言（English / Русский）
3. 选择难度（Easy / Medium / Hard）
4. 检查生成的故事是否符合难度要求
5. 实际玩 2-3 轮，评估难度是否合理
6. 记录任何问题到 `changelog.md`

本次实际测试结果：
- ✅ 英语 & 俄语 + Easy/Medium/Hard 六种组合全部跑通
- ✅ Easy 难度整体符合「5-10 问即可解出」的预期
- ✅ Hard 难度整体符合「多层反转 / 猎奇黑暗 / 20+ 问」的预期
- ⚠️ Medium 难度略偏难（有时接近 Hard），后续可通过单独 Task 微调 Prompt 复杂度

**需要更新的文档**：

1. **`docs/prd.md`**：
   - 已修改 "游戏流程 → 1. 启动游戏" 部分，添加语言 → 难度 → 生成 的流程说明
   - 已更新 `games` 表结构，添加 `difficulty` 字段
   - 已在 "MVP 不包含功能" 中将难度选择标记为 ✅ v1.1 已实现

2. **`docs/tech_design.md`**（可选）：
   - 后续如有需要再同步更新数据库结构和方法签名说明

3. **`README.md`**：
   - 已在命令列表和游戏流程示例中体现「语言 + 难度选择」流程

**验收标准**：
- [x] 6 种语言+难度组合全部测试通过
- [x] Easy 难度确实比 Hard 简单（通过实际游戏验证）
- [x] 难度选择不影响其他命令（`/guess`、`/reveal`、`/cancel` 等）
- [x] 文档已更新（本次已完成 `docs/prd.md` 和 `README.md`）
- [ ] 无新增 linter 错误
- [ ] 代码已提交到 git

**Git 提交建议**：
```bash
git add src/db/pool.js src/db/gameRepo.js src/messages/i18n.js src/core/aiClient.js src/core/gameLogic.js src/handlers/callbacks.js
git commit -m "feat: Task 10.1-10.5 - 添加三档难度选择功能"

git add docs/prd.md docs/task.md
git commit -m "docs: 更新 PRD 和 task 文档，添加难度选择说明"

git push origin HEAD
```

---

## 📊 Phase 10 总结

### 改动范围

| 类型 | 数量 | 文件列表 |
|------|------|----------|
| 数据库变更 | 1 个字段 | `games.difficulty` |
| 代码文件 | 5 个 | pool.js, gameRepo.js, i18n.js, aiClient.js, gameLogic.js, callbacks.js |
| 文档文件 | 2-3 个 | prd.md, tech_design.md（可选）, README.md（可选）|
| 新增代码 | ~120 行 | 主要在 callbacks.js 和 aiClient.js |
| 修改代码 | ~40 行 | 方法签名和 SQL |

### 兼容性确认

✅ **不影响现有流程**：
- `/newgame` 命令入口不变
- 语言选择逻辑保持不变，只是后面多了一步难度选择
- 其他命令（`/guess`、`/reveal`、`/cancel`、`/help`）完全不受影响
- 提问流程（回复 bot 消息）完全不受影响
- 错误处理逻辑复用现有机制

✅ **向下兼容**：
- Callback 数据格式不冲突（`lang_*` vs `diff_*_*`）
- 数据库字段新增，不影响现有查询
- i18n 函数不需要改动

⚠️ **需要注意**：
- 已有数据库需要执行迁移 SQL 或删表重建
- 需要测试 6 种语言+难度组合
- Easy/Hard 难度的故事质量需要实测调优

### 风险评估

- 🟢 **技术风险**：低（都是扩展性改动，无破坏性）
- 🟡 **测试成本**：中（需要测试 6 种组合）
- 🟢 **用户体验**：正面（提供更多选择，满足不同水平玩家）
- 🟢 **维护成本**：低（代码结构清晰，易于维护）

---

**任务拆解完成，准备开发！** 🚀
