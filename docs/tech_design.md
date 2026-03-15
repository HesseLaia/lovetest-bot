# 海龟汤 Bot - 技术设计文档

**版本**：MVP v1.0  
**更新时间**：2026-03-13  
**基于**：PRD v1.0

---

## 📦 技术栈

### 核心依赖
- **Bot 框架**：`grammy` (最新版)
- **数据库客户端**：`mysql2` (promise 模式 + 连接池)
- **HTTP 客户端**：`node-fetch` 或 `axios` (用于 OpenRouter API)
- **Node 版本**：>= 18

### 部署环境
- **平台**：Railway
- **数据库**：MySQL (Railway 提供)
- **Node 运行时**：Node.js 18+

---

## 🗂️ 项目结构

```
lovetest_bot/
├── .env.example           # 环境变量模板
├── .gitignore
├── package.json
├── CLAUDE.md              # 通用开发规则
├── .cursorrules           # 项目专用规则
├── bot.js                 # 主入口文件
├── docs/
│   ├── prd.md
│   ├── tech_design.md     # 本文件
│   ├── task.md
│   └── changelog.md
└── src/
    ├── config/
    │   └── env.js         # 环境变量加载和验证
    ├── db/
    │   ├── pool.js        # MySQL 连接池
    │   └── gameRepo.js    # 游戏数据操作层
    ├── core/
    │   ├── aiClient.js    # OpenRouter API 封装
    │   └── gameLogic.js   # 游戏核心逻辑
    ├── handlers/
    │   ├── commands.js    # 命令处理 (/newgame, /guess 等)
    │   ├── callbacks.js   # inline keyboard 回调处理
    │   └── messages.js    # 消息处理 (回复提问)
    ├── messages/
    │   ├── builder.js     # 消息文本构建
    │   └── i18n.js        # 多语言文本
    └── utils/
        └── logger.js      # 日志工具 (可选)
```

---

## 🔧 核心模块设计

### 1. 环境变量配置 (`src/config/env.js`)

```javascript
// src/config/env.js
export const config = {
  // Telegram Bot
  BOT_TOKEN: process.env.BOT_TOKEN,

  // MySQL 数据库
  DB_HOST: process.env.DB_HOST,      // 必须用公网地址，不用 mysql.railway.internal
  DB_PORT: process.env.DB_PORT || 3306,
  DB_NAME: process.env.DB_NAME || 'railway',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD,

  // OpenRouter API
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  OPENROUTER_MODEL: 'google/gemini-2.0-flash-exp',

  // 可选配置
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// 启动时验证必需环境变量
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

---

### 2. 数据库层设计

#### 2.1 连接池 (`src/db/pool.js`)

```javascript
// src/db/pool.js
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

// 创建连接池
export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// 测试连接
export async function testConnection() {
  const conn = await pool.getConnection();
  console.log('✅ 数据库连接成功');
  conn.release();
}

// 初始化数据库表
export async function initDatabase() {
  const createTableSQL = `
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
  `;

  await pool.execute(createTableSQL);
  console.log('✅ 数据库表初始化完成');
}
```

#### 2.2 游戏数据仓库 (`src/db/gameRepo.js`)

```javascript
// src/db/gameRepo.js
import { pool } from './pool.js';

export const gameRepo = {
  /**
   * 创建新游戏
   */
  async create(chatId, language, scenario, truth) {
    const [result] = await pool.execute(
      `INSERT INTO games (chat_id, language, scenario, truth, status)
       VALUES (?, ?, ?, ?, 'playing')`,
      [chatId, language, scenario, truth]
    );
    return result.insertId;
  },

  /**
   * 获取当前游戏（by chat_id）
   */
  async getCurrentGame(chatId) {
    const [rows] = await pool.execute(
      `SELECT * FROM games WHERE chat_id = ? AND status = 'playing' LIMIT 1`,
      [chatId]
    );
    return rows[0] || null;
  },

  /**
   * 增加提问次数
   */
  async incrementQuestions(chatId) {
    await pool.execute(
      `UPDATE games SET questions_count = questions_count + 1
       WHERE chat_id = ? AND status = 'playing'`,
      [chatId]
    );
  },

  /**
   * 结束游戏
   */
  async endGame(chatId) {
    await pool.execute(
      `UPDATE games SET status = 'ended', ended_at = NOW()
       WHERE chat_id = ? AND status = 'playing'`,
      [chatId]
    );
  },

  /**
   * 删除游戏（用于 /cancel）
   */
  async deleteGame(chatId) {
    await pool.execute(
      `DELETE FROM games WHERE chat_id = ? AND status = 'playing'`,
      [chatId]
    );
  },
};
```

**设计原则**：
- ✅ scenario 和 truth 是普通字符串，直接存取
- ✅ 每次操作都直接查数据库，不维护内存缓存
- ✅ 使用参数化查询防止 SQL 注入

---

### 3. AI 客户端 (`src/core/aiClient.js`)

```javascript
// src/core/aiClient.js
import { config } from '../config/env.js';

export const aiClient = {
  /**
   * 生成故事（场景 + 汤底）
   * @param {string} language - 'en' 或 'ru'
   * @returns {Promise<{scenario: string, truth: string}>}
   */
  async generateStory(language) {
    const languageMap = {
      en: 'English',
      ru: 'Russian',
    };

    const prompt = `You are a host of a Lateral Thinking Puzzle game (also known as "Situation Puzzle" or "海龟汤"). 
Generate a medium-difficulty puzzle in ${languageMap[language]}.

Requirements:
1. The scenario should be mysterious and intriguing (50-100 words)
2. The truth should be the complete story that explains the scenario (150-300 words)
3. The puzzle should be solvable through yes/no questions
4. Return ONLY a valid JSON object with this exact format:

{"scenario": "...", "truth": "..."}

Do not include any other text or explanation.`;

    const response = await fetch(`${config.OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/yourusername/lovetest_bot', // 可选
      },
      body: JSON.stringify({
        model: config.OPENROUTER_MODEL,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API 错误: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // 解析 JSON
    const storyData = JSON.parse(content);

    if (!storyData.scenario || !storyData.truth) {
      throw new Error('AI 返回的数据格式不正确');
    }

    return storyData;
  },

  /**
   * 判断问题（是/否/无关）
   * @param {string} scenario - 场景描述
   * @param {string} truth - 完整故事
   * @param {string} question - 用户问题
   * @param {string} language - 'en' 或 'ru'
   * @returns {Promise<'YES'|'NO'|'IRRELEVANT'>}
   */
  async judgeQuestion(scenario, truth, question, language) {
    const languageMap = {
      en: 'English',
      ru: 'Russian',
    };

    const prompt = `You are the host of a Lateral Thinking Puzzle game.

Scenario: ${scenario}

Complete Story (Truth): ${truth}

Player's Question: ${question}

Based on the complete story, answer the player's question. You MUST respond with ONLY ONE of these three words:
- YES (if the answer is yes based on the truth)
- NO (if the answer is no based on the truth)
- IRRELEVANT (if the question is not relevant to the story or cannot be answered with yes/no)

Respond in ${languageMap[language]}. Output ONLY the word, nothing else.`;

    const response = await fetch(`${config.OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.OPENROUTER_MODEL,
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: 10, // 只需要一个词
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API 错误: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content.trim().toUpperCase();

    // 强制映射到三个值之一
    if (answer.includes('YES')) return 'YES';
    if (answer.includes('NO')) return 'NO';
    return 'IRRELEVANT'; // 其他任何情况都视为无关
  },
};
```

**错误处理**：
- API 调用失败 → throw Error，由调用方捕获并提示用户
- JSON 解析失败 → throw Error
- 超时处理 → 可选添加 `AbortController` (后续优化)

---

### 4. 游戏核心逻辑 (`src/core/gameLogic.js`)

```javascript
// src/core/gameLogic.js
import { gameRepo } from '../db/gameRepo.js';
import { aiClient } from './aiClient.js';

export const gameLogic = {
  /**
   * 启动新游戏
   */
  async startGame(chatId, language) {
    // 检查是否已有游戏
    const existingGame = await gameRepo.getCurrentGame(chatId);
    if (existingGame) {
      throw new Error('GAME_IN_PROGRESS');
    }

    // 生成故事
    const { scenario, truth } = await aiClient.generateStory(language);

    // 创建游戏记录
    await gameRepo.create(chatId, language, scenario, truth);

    return { scenario, truth };
  },

  /**
   * 处理提问
   */
  async handleQuestion(chatId, question) {
    const game = await gameRepo.getCurrentGame(chatId);
    if (!game) {
      throw new Error('NO_GAME');
    }

    // 调用 AI 判断
    const answer = await aiClient.judgeQuestion(
      game.scenario,
      game.truth,
      question,
      game.language
    );

    // 增加提问次数
    await gameRepo.incrementQuestions(chatId);

    return { answer, game };
  },

  /**
   * 提交猜测并结束游戏
   */
  async submitGuess(chatId, guess) {
    const game = await gameRepo.getCurrentGame(chatId);
    if (!game) {
      throw new Error('NO_GAME');
    }

    // ⚠️ 先拿数据再结束游戏，否则拿不到 language
    const result = {
      guess,
      truth: game.truth,
      language: game.language,
      questionsCount: game.questions_count,
    };

    // 结束游戏
    await gameRepo.endGame(chatId);

    return result;
  },

  /**
   * 直接查看答案
   */
  async revealAnswer(chatId) {
    const game = await gameRepo.getCurrentGame(chatId);
    if (!game) {
      throw new Error('NO_GAME');
    }

    // ⚠️ 先拿数据再结束游戏，否则拿不到 language
    const result = {
      truth: game.truth,
      language: game.language,
      questionsCount: game.questions_count,
    };

    // 结束游戏
    await gameRepo.endGame(chatId);

    return result;
  },

  /**
   * 取消游戏
   */
  async cancelGame(chatId) {
    const game = await gameRepo.getCurrentGame(chatId);
    if (!game) {
      throw new Error('NO_GAME');
    }

    // ⚠️ 先拿 language 再删除游戏
    const language = game.language;

    await gameRepo.deleteGame(chatId);

    return { language };
  },
};
```

**错误类型**：
- `GAME_IN_PROGRESS` → 游戏进行中，无法开始新游戏
- `NO_GAME` → 当前没有游戏

---

### 5. 多语言消息 (`src/messages/i18n.js`)

```javascript
// src/messages/i18n.js
export const messages = {
  en: {
    // 命令相关
    selectLanguage: '🌍 Please select a language:',
    generating: '⏳ Generating story...',
    gameStarted: '🎮 Game started! Here\'s your scenario:\n\n',
    askHint: '\n\n💡 Reply to this message to ask yes/no questions',
    
    // 回答
    answerYes: '✅ Yes',
    answerNo: '❌ No',
    answerIrrelevant: '🤷 Irrelevant',
    
    // 结束游戏
    gameEnded: '🎯 Game ended!\n\n',
    yourGuess: '【Your Guess】\n',
    theTruth: '\n【The Truth】\n',
    revealed: '📖 The Truth Revealed\n\n',
    completeStory: '【Complete Story】\n',
    gameCancelled: '❌ Game cancelled',
    startNewGame: '\n\n🎮 Use /newgame to start a new game',
    
    // 错误提示
    gameInProgress: '⚠️ Game in progress. Please end it first with /reveal, /guess, or /cancel',
    noGame: '⚠️ No active game. Use /newgame to start',
    guessEmpty: '⚠️ Please write your guess after /guess command',
    generationFailed: '❌ Story generation failed. Please try /newgame again',
    networkError: '⏳ Network timeout. Please try again later',
    unknownError: '❌ An error occurred. Please try again',
    
    // 帮助
    helpText: `🎮 **Lateral Thinking Puzzle (Situation Puzzle)**

**How to Play:**
1. Use /newgame to start
2. Bot shows a mysterious scenario
3. Ask yes/no questions by replying to bot's messages
4. Deduce the complete story
5. Submit your guess with /guess or reveal answer with /reveal

**Commands:**
/newgame - Start a new game
/guess <your guess> - Submit your guess
/reveal - Show the answer
/cancel - Cancel current game
/help - Show this help

Good luck! 🍀`,
  },
  
  ru: {
    // 命令相关
    selectLanguage: '🌍 Пожалуйста, выберите язык:',
    generating: '⏳ Генерация истории...',
    gameStarted: '🎮 Игра началась! Вот ваш сценарий:\n\n',
    askHint: '\n\n💡 Ответьте на это сообщение, чтобы задать вопросы да/нет',
    
    // 回答
    answerYes: '✅ Да',
    answerNo: '❌ Нет',
    answerIrrelevant: '🤷 Не имеет значения',
    
    // 结束游戏
    gameEnded: '🎯 Игра окончена!\n\n',
    yourGuess: '【Ваша догадка】\n',
    theTruth: '\n【Истина】\n',
    revealed: '📖 Истина раскрыта\n\n',
    completeStory: '【Полная история】\n',
    gameCancelled: '❌ Игра отменена',
    startNewGame: '\n\n🎮 Используйте /newgame, чтобы начать новую игру',
    
    // 错误提示
    gameInProgress: '⚠️ Игра в процессе. Сначала завершите её с помощью /reveal, /guess или /cancel',
    noGame: '⚠️ Нет активной игры. Используйте /newgame для начала',
    guessEmpty: '⚠️ Пожалуйста, напишите вашу догадку после команды /guess',
    generationFailed: '❌ Не удалось создать историю. Попробуйте /newgame снова',
    networkError: '⏳ Тайм-аут сети. Попробуйте позже',
    unknownError: '❌ Произошла ошибка. Попробуйте снова',
    
    // 帮助
    helpText: `🎮 **Загадка на логику (Головоломка ситуации)**

**Как играть:**
1. Используйте /newgame для начала
2. Бот показывает загадочный сценарий
3. Задавайте вопросы да/нет, отвечая на сообщения бота
4. Выведите полную историю
5. Отправьте свою догадку с /guess или покажите ответ с /reveal

**Команды:**
/newgame - Начать новую игру
/guess <ваша догадка> - Отправить вашу догадку
/reveal - Показать ответ
/cancel - Отменить текущую игру
/help - Показать эту справку

Удачи! 🍀`,
  },
};

/**
 * 获取消息文本
 */
export function t(language, key) {
  return messages[language]?.[key] || messages.en[key] || key;
}
```

---

### 6. 消息构建器 (`src/messages/builder.js`)

```javascript
// src/messages/builder.js
import { t } from './i18n.js';

export const messageBuilder = {
  /**
   * 构建场景消息
   */
  buildScenarioMessage(language, scenario) {
    return t(language, 'gameStarted') + scenario + t(language, 'askHint');
  },

  /**
   * 构建答案消息
   */
  buildAnswerMessage(language, answer) {
    const answerMap = {
      YES: t(language, 'answerYes'),
      NO: t(language, 'answerNo'),
      IRRELEVANT: t(language, 'answerIrrelevant'),
    };
    return answerMap[answer] || answerMap.IRRELEVANT;
  },

  /**
   * 构建猜测结果消息
   */
  buildGuessResultMessage(language, guess, truth) {
    return (
      t(language, 'gameEnded') +
      t(language, 'yourGuess') + guess +
      t(language, 'theTruth') + truth +
      t(language, 'startNewGame')
    );
  },

  /**
   * 构建揭晓答案消息
   */
  buildRevealMessage(language, truth) {
    return (
      t(language, 'revealed') +
      t(language, 'completeStory') + truth +
      t(language, 'startNewGame')
    );
  },

  /**
   * 构建取消消息
   */
  buildCancelMessage(language) {
    return t(language, 'gameCancelled') + t(language, 'startNewGame');
  },
};
```

---

### 7. Handler 层设计

#### 7.1 命令处理 (`src/handlers/commands.js`)

```javascript
// src/handlers/commands.js
import { gameLogic } from '../core/gameLogic.js';
import { gameRepo } from '../db/gameRepo.js';
import { messageBuilder } from '../messages/builder.js';
import { t } from '../messages/i18n.js';
import { InlineKeyboard } from 'grammy';

export function registerCommands(bot) {
  // /newgame - 启动游戏
  bot.command('newgame', async (ctx) => {
    const chatId = ctx.chat.id;

    try {
      // ✅ 先检查是否已有游戏在进行
      const existingGame = await gameRepo.getCurrentGame(chatId);
      if (existingGame) {
        await ctx.reply(t(existingGame.language || 'en', 'gameInProgress'));
        return;
      }

      // 弹出语言选择
      const keyboard = new InlineKeyboard()
        .text('English', 'lang_en')
        .text('Русский', 'lang_ru');

      await ctx.reply(t('en', 'selectLanguage'), {
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error('Error in /newgame:', error);
      await ctx.reply(t('en', 'unknownError'));
    }
  });

  // /guess - 提交猜测
  bot.command('guess', async (ctx) => {
    const chatId = ctx.chat.id;
    const guess = ctx.message.text.replace('/guess', '').trim();

    // 先获取游戏检查是否存在
    try {
      const game = await gameRepo.getCurrentGame(chatId);
      
      if (!game) {
        await ctx.reply(t('en', 'noGame'));
        return;
      }

      if (!guess) {
        await ctx.reply(t(game.language, 'guessEmpty'));
        return;
      }

      // 提交猜测（会返回 language）
      const result = await gameLogic.submitGuess(chatId, guess);
      
      const message = messageBuilder.buildGuessResultMessage(
        result.language,
        result.guess,
        result.truth
      );
      await ctx.reply(message);
    } catch (error) {
      console.error('Error in /guess:', error);
      await ctx.reply(t('en', 'unknownError'));
    }
  });

  // /reveal - 查看答案
  bot.command('reveal', async (ctx) => {
    const chatId = ctx.chat.id;

    try {
      const result = await gameLogic.revealAnswer(chatId);
      
      const message = messageBuilder.buildRevealMessage(result.language, result.truth);
      await ctx.reply(message);
    } catch (error) {
      if (error.message === 'NO_GAME') {
        await ctx.reply(t('en', 'noGame'));
      } else {
        console.error('Error in /reveal:', error);
        await ctx.reply(t('en', 'unknownError'));
      }
    }
  });

  // /cancel - 取消游戏
  bot.command('cancel', async (ctx) => {
    const chatId = ctx.chat.id;

    try {
      const result = await gameLogic.cancelGame(chatId);
      
      const message = messageBuilder.buildCancelMessage(result.language);
      await ctx.reply(message);
    } catch (error) {
      if (error.message === 'NO_GAME') {
        await ctx.reply(t('en', 'noGame'));
      } else {
        console.error('Error in /cancel:', error);
        await ctx.reply(t('en', 'unknownError'));
      }
    }
  });

  // /help - 帮助
  bot.command('help', async (ctx) => {
    await ctx.reply(t('en', 'helpText'), { parse_mode: 'Markdown' });
  });
}
```

#### 7.2 回调处理 (`src/handlers/callbacks.js`)

```javascript
// src/handlers/callbacks.js
import { gameLogic } from '../core/gameLogic.js';
import { messageBuilder } from '../messages/builder.js';
import { t } from '../messages/i18n.js';

export function registerCallbacks(bot) {
  // 语言选择回调
  bot.callbackQuery(/^lang_(en|ru)$/, async (ctx) => {
    const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
    if (!chatId) return;

    const language = ctx.match[1]; // 'en' 或 'ru'

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(t(language, 'generating'));

    try {
      const { scenario } = await gameLogic.startGame(chatId, language);
      const message = messageBuilder.buildScenarioMessage(language, scenario);
      await ctx.reply(message);
    } catch (error) {
      if (error.message === 'GAME_IN_PROGRESS') {
        await ctx.reply(t(language, 'gameInProgress'));
      } else {
        console.error('Error generating story:', error);
        await ctx.reply(t(language, 'generationFailed'));
      }
    }
  });
}
```

#### 7.3 消息处理 (`src/handlers/messages.js`)

```javascript
// src/handlers/messages.js
import { gameLogic } from '../core/gameLogic.js';
import { messageBuilder } from '../messages/builder.js';
import { t } from '../messages/i18n.js';

export function registerMessageHandlers(bot) {
  // 处理回复 bot 的消息（视为提问）
  bot.on('message:text', async (ctx) => {
    // 只处理回复 bot 消息的情况
    const replyTo = ctx.message.reply_to_message;
    if (!replyTo || replyTo.from.id !== ctx.me.id) {
      return; // 不是回复 bot 的消息，忽略
    }

    const chatId = ctx.chat.id;
    const question = ctx.message.text;

    try {
      const { answer, game } = await gameLogic.handleQuestion(chatId, question);
      const replyText = messageBuilder.buildAnswerMessage(game.language, answer);
      await ctx.reply(replyText);
    } catch (error) {
      if (error.message === 'NO_GAME') {
        await ctx.reply(t('en', 'noGame'));
      } else {
        console.error('Error handling question:', error);
        await ctx.reply(t('en', 'unknownError'));
      }
    }
  });
}
```

---

### 8. 主入口文件 (`bot.js`)

```javascript
// bot.js
import { Bot } from 'grammy';
import { config, validateConfig } from './src/config/env.js';
import { testConnection, initDatabase } from './src/db/pool.js';
import { registerCommands } from './src/handlers/commands.js';
import { registerCallbacks } from './src/handlers/callbacks.js';
import { registerMessageHandlers } from './src/handlers/messages.js';

async function main() {
  // 1. 验证环境变量
  validateConfig();
  console.log('✅ 环境变量验证通过');

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

// 错误处理
main().catch((error) => {
  console.error('❌ Bot 启动失败:', error);
  process.exit(1);
});
```

---

## 🔐 环境变量配置

### Railway 部署环境变量

```bash
# Telegram Bot
BOT_TOKEN=your_bot_token_here

# MySQL 数据库
DB_HOST=your_mysql_host_here  # 使用公网地址，不用 mysql.railway.internal
DB_PORT=3306
DB_NAME=railway
DB_USER=root
DB_PASSWORD=your_db_password_here

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key_here

# 可选
LOG_LEVEL=info
```

### 本地开发 `.env` 文件

```bash
# 本地开发时创建 .env 文件（不要提交到 git）
BOT_TOKEN=...
DB_HOST=...
DB_PORT=3306
DB_NAME=railway
DB_USER=root
DB_PASSWORD=...
OPENROUTER_API_KEY=...
```

---

## 🚨 关键技术要点

### 1. callbackQuery 获取 chatId

grammy 的 callbackQuery 里 `ctx.chat` 有时是 undefined。

```javascript
// ❌ 错误
const chatId = ctx.chat.id;

// ✅ 正确
const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
if (!chatId) return;
```

### 2. 数据库字段类型

- ✅ 使用 `LONGTEXT` 存储文本字段（scenario, truth）
- ❌ 不使用 `JSON` 类型（mysql2 会自动解析导致问题）
- ✅ scenario 和 truth 是普通字符串，直接存取
- ⚠️ 如果未来需要存 JSON 对象，用 `LONGTEXT + JSON.stringify/parse`

### 3. 连接池模式

- ✅ 使用 `mysql2/promise` 的连接池
- ✅ 每次查询后连接自动归还
- ❌ 不手动管理连接的获取和释放（pool.execute 自动处理）

### 4. 不维护内存缓存

- ✅ 每次消息/命令都直接查数据库
- ❌ 不在内存中缓存游戏状态
- ✅ Bot 重启后自动从数据库恢复

### 5. AI 返回值强制映射

```javascript
// 判断问题时的强制映射
const answer = response.trim().toUpperCase();
if (answer.includes('YES')) return 'YES';
if (answer.includes('NO')) return 'NO';
return 'IRRELEVANT'; // 其他任何情况
```

### 6. 错误处理层次

```
用户操作 → Handler 捕获错误 → 返回用户友好提示
                ↓
         gameLogic throw Error
                ↓
         aiClient / gameRepo 底层错误
```

---

## 📝 依赖安装

### package.json

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

### 安装命令

```bash
npm install grammy mysql2 node-fetch
```

---

## 🔄 开发流程

### 1. 本地开发

```bash
# 1. 克隆项目
git clone <repo>
cd lovetest_bot

# 2. 安装依赖
npm install

# 3. 配置 .env
cp .env.example .env
# 编辑 .env 填入你的配置

# 4. 启动（确保 Railway 上的 bot 已停止！）
npm run dev
```

⚠️ **重要**：本地开发时**必须先停止 Railway 上的 bot**，否则会冲突（409 Conflict）。

### 2. 检查本地 node 进程

```powershell
# Windows PowerShell
Get-Process node | ForEach-Object { (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine }
```

Cursor 的 tsserver 进程不用管，只关注 `node bot.js`。

### 3. Railway 部署

1. 连接 GitHub 仓库
2. 设置环境变量（见上文）
3. Railway 自动检测 `npm start` 并运行
4. 查看日志确认启动成功

---

## 🧪 测试计划

### 单元测试（可选，后续添加）
- `gameRepo` 数据库操作
- `aiClient` API 调用 mock
- `messageBuilder` 消息构建

### 集成测试（手动）
1. `/newgame` 流程
2. 语言选择
3. 提问回复
4. `/guess` 提交
5. `/reveal` 查看答案
6. `/cancel` 取消
7. 边缘情况（游戏进行中发 /newgame 等）

---

## 📊 性能和成本考量

### API 调用频率
- 生成故事：每次 `/newgame` 调用 1 次
- 判断问题：每次提问调用 1 次

### 数据库查询频率
- 每次命令/消息 → 1-2 次查询
- 连接池复用，性能充足

### OpenRouter 成本
- Gemini 2.0 Flash Exp：免费或低成本模型
- 每局游戏预估：10-30 次 API 调用

---

## 🔮 后续优化方向

1. **缓存优化**：Redis 缓存活跃游戏（降低数据库压力）
2. **API 超时处理**：添加 AbortController
3. **限流**：防止用户恶意刷 API
4. **监控**：添加日志聚合（如 Sentry）
5. **测试**：添加自动化测试
6. **CI/CD**：GitHub Actions 自动部署

---

**文档结束**
