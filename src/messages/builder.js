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
   * 构建答案消息（YES / NO / IRRELEVANT）
   */
  buildAnswerMessage(language, answer) {
    const answerMap = {
      YES: t(language, 'answerYes'),
      NO: t(language, 'answerNo'),
      IRRELEVANT: t(language, 'answerIrrelevant'),
    };
    return answerMap[answer] ?? answerMap.IRRELEVANT;
  },

  /**
   * 构建猜测结果消息（你的猜测 + 汤底对比）
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

  /**
   * 构建提示消息
   */
  buildHintMessage(language, hint) {
    return t(language, 'hintPrefix') + '\n\n' + hint;
  },
};
