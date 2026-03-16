// bot.js
import 'dotenv/config';
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

main().catch((error) => {
  console.error('❌ Bot 启动失败:', error);
  process.exit(1);
});
