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
- [ ] Task 0.3：安装依赖并测试 ← **从这里开始**

### Phase 1：数据库层
- [ ] Task 1.1：实现环境变量配置
- [ ] Task 1.2：实现数据库连接池
- [ ] Task 1.3：实现游戏数据仓库

### Phase 2：AI 客户端
- [ ] Task 2.1：实现 OpenRouter API 客户端
- [ ] Task 2.2：测试 AI 客户端

### Phase 3：核心业务逻辑
- [ ] Task 3.1：实现游戏核心逻辑
- [ ] Task 3.2：测试游戏核心逻辑

### Phase 4：消息和多语言
- [ ] Task 4.1：实现多语言支持
- [ ] Task 4.2：实现消息构建器

### Phase 5：Handler 层
- [ ] Task 5.1：实现命令处理器
- [ ] Task 5.2：实现回调处理器
- [ ] Task 5.3：实现消息处理器

### Phase 6：集成和测试
- [ ] Task 6.1：实现主入口文件
- [ ] Task 6.2：本地完整测试
- [ ] Task 6.3：修复测试中发现的 Bug

### Phase 7：部署上线
- [ ] Task 7.1：Railway 部署
- [ ] Task 7.2：文档完善和项目收尾

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

**任务拆解完成，准备开发！** 🚀
