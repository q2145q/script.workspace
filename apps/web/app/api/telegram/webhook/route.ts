import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@script/db";
import {
  telegramApi,
  handleTelegramVerification,
  answerCallbackQuery,
  editMessageReplyMarkup,
} from "@script/api/telegram";

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Handle /start messages (Telegram verification deep links)
    const message = body.message;
    if (message?.text?.startsWith("/start v_")) {
      const token = message.text.replace("/start v_", "").trim();
      const chatId = message.chat.id;

      const result = await handleTelegramVerification(token, chatId);

      await telegramApi("sendMessage", {
        chat_id: chatId,
        text: result.success
          ? `✅ ${result.userName}, ваш аккаунт подтверждён! Вернитесь на сайт для входа.`
          : "❌ Ссылка для подтверждения недействительна или устарела. Запросите новую на сайте.",
      });

      return NextResponse.json({ ok: true });
    }

    // Handle callback queries (admin approve/reject)
    const callbackQuery = body.callback_query;

    if (!callbackQuery?.data) {
      return NextResponse.json({ ok: true });
    }

    const { data, id: callbackQueryId, message: cbMessage } = callbackQuery;
    const chatId = cbMessage?.chat?.id;
    const messageId = cbMessage?.message_id;

    const [action, userId] = data.split(":");

    if (!userId || (action !== "approve" && action !== "reject")) {
      await answerCallbackQuery(callbackQueryId, "Неизвестное действие");
      return NextResponse.json({ ok: true });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, betaApproved: true },
    });

    if (!user) {
      await answerCallbackQuery(callbackQueryId, "Пользователь не найден");
      return NextResponse.json({ ok: true });
    }

    if (action === "approve") {
      await prisma.user.update({
        where: { id: userId },
        data: { betaApproved: true },
      });

      await answerCallbackQuery(callbackQueryId, `✅ ${user.name} одобрен`);

      if (chatId && messageId) {
        await editMessageReplyMarkup(
          chatId,
          messageId,
          `✅ *Одобрен*\n\n👤 ${user.name}\n📧 ${user.email}`,
        );
      }
    } else {
      await answerCallbackQuery(callbackQueryId, `❌ ${user.name} отклонён`);

      if (chatId && messageId) {
        await editMessageReplyMarkup(
          chatId,
          messageId,
          `❌ *Отклонён*\n\n👤 ${user.name}\n📧 ${user.email}`,
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram webhook] Error:", error);
    return NextResponse.json({ ok: true });
  }
}
