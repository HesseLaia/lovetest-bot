/**
 * Task 2.2 - 测试 AI 客户端
 * 运行前请确保 .env 中已设置 OPENROUTER_API_KEY
 * 运行: node --env-file=.env test-ai.js  (Node 20+)
 * 若报 404，请检查 OpenRouter 模型 ID 与文档是否一致
 */
import { aiClient } from './src/core/aiClient.js';

async function test() {
  console.log('--- 测试 generateStory(en) ---');
  const storyEn = await aiClient.generateStory('en');
  console.log('Scenario:', storyEn.scenario);
  console.log('Truth:', storyEn.truth);

  console.log('\n--- 测试 generateStory(ru) ---');
  const storyRu = await aiClient.generateStory('ru');
  console.log('Scenario:', storyRu.scenario);
  console.log('Truth:', storyRu.truth);

  console.log('\n--- 测试 judgeQuestion ---');
  const answer = await aiClient.judgeQuestion(
    storyEn.scenario,
    storyEn.truth,
    'Is this intentional?',
    'en'
  );
  console.log('Answer:', answer);

  console.log('\n✅ 所有测试通过');
}

test().catch((err) => {
  console.error('❌ 测试失败:', err.message);
  process.exit(1);
});
