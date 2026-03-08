const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = () => process.env.TELEGRAM_ADMIN_CHAT_ID;

async function telegramApi(method: string, body: Record<string, unknown>) {
  const token = BOT_TOKEN();
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not configured, skipping");
    return null;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[telegram] ${method} failed:`, text);
    return null;
  }

  return res.json();
}

export async function notifyTelegramNewUser(user: {
  id: string;
  name: string;
  email: string;
}) {
  const chatId = ADMIN_CHAT_ID();
  if (!chatId) {
    console.warn("[telegram] TELEGRAM_ADMIN_CHAT_ID not configured, skipping");
    return;
  }

  const date = new Date().toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const text = [
    "🆕 *Новая регистрация*",
    "",
    `👤 *Имя:* ${escapeMarkdown(user.name)}`,
    `📧 *Email:* ${escapeMarkdown(user.email)}`,
    `📅 *Дата:* ${date}`,
  ].join("\n");

  await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "✅ Одобрить",
            callback_data: `approve:${user.id}`,
          },
          {
            text: "❌ Отклонить",
            callback_data: `reject:${user.id}`,
          },
        ],
      ],
    },
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text: string
) {
  await telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function editMessageReplyMarkup(
  chatId: string | number,
  messageId: number,
  text: string
) {
  await telegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
  });
}

function escapeMarkdown(text: string) {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
