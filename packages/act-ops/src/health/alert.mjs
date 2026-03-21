/**
 * Alerting — sends notifications to Telegram.
 *
 * Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from env.
 */

/**
 * Send a message to the configured Telegram chat.
 *
 * @param {string} message - Markdown-formatted message text
 * @param {Object} [opts]
 * @param {string} [opts.parseMode='Markdown'] - 'Markdown' or 'HTML'
 * @returns {Promise<boolean>} true if sent successfully
 */
export async function sendAlert(message, { parseMode = 'Markdown' } = {}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('[health/alert] Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
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
      return true;
    } else {
      const err = await res.text();
      console.error('[health/alert] Telegram send failed:', err);
      return false;
    }
  } catch (err) {
    console.error('[health/alert] Telegram send error:', err.message);
    return false;
  }
}
