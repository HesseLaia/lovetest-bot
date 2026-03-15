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
        'HTTP-Referer': 'https://github.com/yourusername/lovetest_bot',
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
    const rawContent = data.choices?.[0]?.message?.content;
    if (rawContent == null) {
      throw new Error('AI 返回的数据格式不正确');
    }
    const content = String(rawContent).trim();

    // 若模型返回了 markdown 代码块，尝试剥离
    const jsonStr = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const storyData = JSON.parse(jsonStr);

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
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API 错误: ${response.status}`);
    }

    const data = await response.json();
    const rawAnswer = data.choices?.[0]?.message?.content;
    const answer = (rawAnswer != null ? String(rawAnswer) : '').trim().toUpperCase();

    // 强制映射到三个值之一（PRD：其他任何返回都当 IRRELEVANT）
    if (answer.includes('YES')) return 'YES';
    if (answer.includes('NO')) return 'NO';
    return 'IRRELEVANT';
  },
};
