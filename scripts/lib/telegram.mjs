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
 * @param {boolean} [opts.urgent=false] - Bypass quiet-hours guard (21:00-06:30 AEST)
 * @returns {Promise<boolean>} true if sent successfully
 */
export async function sendTelegram(message, { parseMode = 'Markdown', replyMarkup, chatId: chatIdOverride, urgent = false } = {}) {
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

  // ─── Quiet hours guard (21:00 – 06:30 AEST) ───────────────────────────
  // Hold any non-urgent push during quiet hours by appending to a queue
  // file. A drain cron at 07:00am sends the de-duped queue as a single
  // morning summary. Urgent pushes (set opts.urgent=true) bypass the guard.
  if (!urgent && process.env.TG_FORCE !== '1') {
    const nowAEST = new Date(Date.now() + 10 * 60 * 60 * 1000); // UTC + 10h
    const hour = nowAEST.getUTCHours();
    const minute = nowAEST.getUTCMinutes();
    const aestMinutes = hour * 60 + minute;
    const quietStart = 21 * 60; // 21:00
    const quietEnd = 6 * 60 + 30; // 06:30
    const inQuietHours = aestMinutes >= quietStart || aestMinutes < quietEnd;
    if (inQuietHours) {
      try {
        const { appendFileSync } = await import('node:fs');
        appendFileSync('/tmp/.tg-queue.jsonl',
          JSON.stringify({
            queued_at: new Date().toISOString(),
            chat_id: chatId,
            message,
            parse_mode: parseMode,
            reply_markup: replyMarkup,
          }) + '\n'
        );
        console.log(`[telegram] queued for morning drain (quiet hours, AEST ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')})`);
      } catch (e) {
        console.error('[telegram] queue write failed:', e.message);
      }
      return false;
    }
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
