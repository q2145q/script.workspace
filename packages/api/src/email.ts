import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not configured, skipping email to:", to);
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Script Workspace <noreply@yomimovie.art>",
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[email] Failed to send:", error);
    throw new Error(error.message);
  }
}

function emailLayout(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#161616;border:1px solid #232323;border-radius:12px;overflow:hidden">
        <tr><td style="padding:32px 32px 0">
          <div style="font-size:14px;font-weight:600;color:#6b6560;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:24px">
            YOMI · Script Workspace
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          ${content}
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #232323">
          <div style="font-size:12px;color:#6b6560;text-align:center">
            © 2026 YOMI Film · script.yomimovie.art
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function verificationEmailTemplate(name: string, url: string) {
  return emailLayout(`
    <h1 style="font-size:22px;color:#f5f0e8;margin:0 0 12px;font-weight:600">
      Подтвердите email
    </h1>
    <p style="font-size:15px;color:#a09a8e;line-height:1.6;margin:0 0 24px">
      Здравствуйте, ${name}! Для завершения регистрации в Script Workspace подтвердите свой email-адрес.
    </p>
    <a href="${url}" style="display:inline-block;background:#e8c97a;color:#0d0d0d;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
      Подтвердить email
    </a>
    <p style="font-size:13px;color:#6b6560;margin:24px 0 0;line-height:1.5">
      Если вы не регистрировались, просто проигнорируйте это письмо. Ссылка действительна 1 час.
    </p>
  `);
}

export function resetPasswordTemplate(name: string, url: string) {
  return emailLayout(`
    <h1 style="font-size:22px;color:#f5f0e8;margin:0 0 12px;font-weight:600">
      Сброс пароля
    </h1>
    <p style="font-size:15px;color:#a09a8e;line-height:1.6;margin:0 0 24px">
      ${name}, вы запросили сброс пароля для Script Workspace. Нажмите кнопку ниже, чтобы установить новый пароль.
    </p>
    <a href="${url}" style="display:inline-block;background:#e8c97a;color:#0d0d0d;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
      Сбросить пароль
    </a>
    <p style="font-size:13px;color:#6b6560;margin:24px 0 0;line-height:1.5">
      Если вы не запрашивали сброс, проигнорируйте это письмо. Ссылка действительна 1 час.
    </p>
  `);
}
