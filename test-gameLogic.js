/**
 * Task 3.2 - 测试游戏核心逻辑
 * 仅用数据库验证，不调用 OpenRouter API。
 * 运行前请确保 .env 中已设置 DB_HOST、DB_PASSWORD 等。
 * 运行: node --env-file=.env test-gameLogic.js  (Node 20+)
 */
import { gameRepo } from './src/db/gameRepo.js';
import { gameLogic } from './src/core/gameLogic.js';
import { initDatabase, testConnection } from './src/db/pool.js';

const CHAT_ID_1 = 999001;
const CHAT_ID_2 = 999002;
const CHAT_ID_3 = 999003;
const CHAT_ID_NO_GAME = 999999;

async function test() {
  await testConnection();
  await initDatabase();

  // 1. 重复启动游戏应抛出 GAME_IN_PROGRESS
  await gameRepo.create(CHAT_ID_1, 'en', 'medium', 'clear', 'Scenario A', 'Truth A');
  try {
    await gameLogic.startGame(CHAT_ID_1, 'en');
    throw new Error('预期抛出 GAME_IN_PROGRESS');
  } catch (e) {
    if (e.message !== 'GAME_IN_PROGRESS') throw e;
  }
  console.log('✓ 重复启动游戏抛出 GAME_IN_PROGRESS');

  // 2. 没有游戏时提问应抛出 NO_GAME
  try {
    await gameLogic.handleQuestion(CHAT_ID_NO_GAME, 'Is it?');
    throw new Error('预期抛出 NO_GAME');
  } catch (e) {
    if (e.message !== 'NO_GAME') throw e;
  }
  console.log('✓ 没有游戏时提问抛出 NO_GAME');

  // 3. submitGuess 返回 language
  const guessResult = await gameLogic.submitGuess(CHAT_ID_1, 'my guess');
  if (guessResult.language !== 'en') {
    throw new Error(`submitGuess 应返回 language 'en'，得到: ${guessResult.language}`);
  }
  console.log('✓ submitGuess 正确返回 language');

  // 4. revealAnswer 返回 language
  await gameRepo.create(CHAT_ID_2, 'ru', 'medium', 'clear', 'Сценарий', 'Правда');
  const revealResult = await gameLogic.revealAnswer(CHAT_ID_2);
  if (revealResult.language !== 'ru') {
    throw new Error(`revealAnswer 应返回 language 'ru'，得到: ${revealResult.language}`);
  }
  console.log('✓ revealAnswer 正确返回 language');

  // 5. cancelGame 返回 language
  await gameRepo.create(CHAT_ID_3, 'en', 'medium', 'clear', 'Scenario C', 'Truth C');
  const cancelResult = await gameLogic.cancelGame(CHAT_ID_3);
  if (cancelResult.language !== 'en') {
    throw new Error(`cancelGame 应返回 language 'en'，得到: ${cancelResult.language}`);
  }
  console.log('✓ cancelGame 正确返回 language');

  console.log('\n✅ Task 3.2 所有测试通过');
}

test().catch((err) => {
  console.error('❌ 测试失败:', err.message);
  process.exit(1);
});
