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
 * @returns {Promise<boolean>} true if sent successfully
 */
export async function sendTelegram(message, { parseMode = 'Markdown' } = {}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
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
