// src/core/aiClient.js
import { config } from '../config/env.js';

export const aiClient = {
  /**
   * 生成故事（场景 + 汤底）
   * @param {string} language - 'en' 或 'ru'
   * @param {string} [difficulty='medium'] - 'easy' | 'medium' | 'hard'
   * @returns {Promise<{scenario: string, truth: string}>}
   */
  async generateStory(language, difficulty = 'medium') {
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

Puzzle Type (MUST follow this style):
${randomType}

Requirements:
1. Scenario: 50-100 words, mysterious and intriguing
2. Truth: 150-300 words, complete explanation
3. The puzzle MUST have at least 2 unexpected plot twists
4. The most obvious explanation should be misleading
5. The puzzle must be solvable through yes/no questions
6. Aim for medium-high difficulty (requires deep reasoning)

FORBIDDEN scenarios (do NOT use):
- Albatross/turtle soup stories
- Elevator scenarios
- Locked room suicide
- Bartender cures hiccups with gun
- Any variation of these classic puzzles

Return ONLY a valid JSON object with this exact format:
{"scenario": "...", "truth": "..."}
Do not include any other text or explanation.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s 超时

    try {
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
        signal: controller.signal,
      });

      clearTimeout(timeout);

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
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('API_TIMEOUT');
      }
      throw error;
    }
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s 超时

    try {
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
        signal: controller.signal,
      });

      clearTimeout(timeout);

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
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('API_TIMEOUT');
      }
      throw error;
    }
  },
};
