// src/handlers/messages.js
import { gameLogic } from '../core/gameLogic.js';
import { messageBuilder } from '../messages/builder.js';
import { t } from '../messages/i18n.js';

export function registerMessageHandlers(bot) {
  // 处理回复 bot 的消息（视为提问）
  bot.on('message:text', async (ctx) => {
    const replyTo = ctx.message.reply_to_message;
    if (!replyTo || replyTo.from?.id !== ctx.me.id) {
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
      } else if (error.message === 'API_TIMEOUT') {
        await ctx.reply(t('en', 'networkError'));
      } else {
        console.error('Error handling question:', error);
        await ctx.reply(t('en', 'unknownError'));
      }
    }
  });
}
