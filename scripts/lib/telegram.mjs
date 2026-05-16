/**
 * Shared Telegram notification utility.
 *
 * Usage:
 *   import { sendTelegram } from './lib/telegram.mjs';
 *   await sendTelegram('Hello from a script');
 *
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars.
 */

/**
 * Send a message to the configured Telegram chat.
 *
 * @param {string} message - Markdown-formatted message text
 * @param {Object} [opts]
 * @param {string} [opts.parseMode='Markdown'] - 'Markdown' or 'HTML'
 * @param {Object} [opts.replyMarkup] - Telegram InlineKeyboardMarkup (use buildInlineKeyboard helper)
 * @param {string|number} [opts.chatId] - Override TELEGRAM_CHAT_ID (e.g. per-owner DM)
 * @returns {Promise<boolean>} true if sent successfully
 */
export async function sendTelegram(message, { parseMode = 'Markdown', replyMarkup, chatId: chatIdOverride } = {}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  // Resolution order: explicit override → TELEGRAM_CHAT_ID → first entry of
  // TELEGRAM_AUTHORIZED_USERS (matches the convention used by
  // telegram-money-alerts.mjs and other cron scripts in this repo).
  const fallbackFromAuth = (process.env.TELEGRAM_AUTHORIZED_USERS || '').split(',')[0]?.trim();
  const chatId = chatIdOverride ?? process.env.TELEGRAM_CHAT_ID ?? fallbackFromAuth;

  if (!botToken || !chatId) {
    console.log('Telegram not configured (missing TELEGRAM_BOT_TOKEN or chat id — set TELEGRAM_CHAT_ID or TELEGRAM_AUTHORIZED_USERS)');
    return false;
  }

  const body = {
    chat_id: chatId,
    text: message,
    parse_mode: parseMode,
    disable_web_page_preview: true,
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      console.log('Sent to Telegram');
      return true;
    } else {
      const err = await res.text();
      console.error('Telegram send failed:', err);
      return false;
    }
  } catch (err) {
    console.error('Telegram send error:', err.message);
    return false;
  }
}

/**
 * Build a Telegram InlineKeyboardMarkup from a 2D array of {text, callbackData} buttons.
 *
 * @param {Array<Array<{text: string, callbackData: string}>>} rows
 * @returns {{inline_keyboard: Array<Array<{text: string, callback_data: string}>>}}
 */
export function buildInlineKeyboard(rows) {
  return {
    inline_keyboard: rows.map((row) =>
      row.map(({ text, callbackData }) => ({ text, callback_data: callbackData })),
    ),
  };
}
