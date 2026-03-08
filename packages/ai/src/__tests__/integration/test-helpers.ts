import { config } from "dotenv";
import { resolve } from "path";
import type { ProviderId, ProviderConfig } from "../../types";

// Load .env.test from packages/ai root
config({ path: resolve(__dirname, "../../../.env.test"), override: true });

// Also load root .env for YANDEX_FOLDER_ID fallback
config({ path: resolve(__dirname, "../../../../.env") });

/** Provider test configurations — skipped if key not set */
export const PROVIDER_CONFIGS: Array<{
  id: ProviderId;
  label: string;
  config: ProviderConfig;
  available: boolean;
}> = [
  {
    id: "openai",
    label: "OpenAI (GPT-4o)",
    config: { apiKey: process.env.OPENAI_API_KEY || "", model: "gpt-4o-mini" },
    available: !!process.env.OPENAI_API_KEY,
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    config: { apiKey: process.env.ANTHROPIC_API_KEY || "", model: "claude-haiku-4-5-20251001" },
    available: !!process.env.ANTHROPIC_API_KEY,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    config: { apiKey: process.env.DEEPSEEK_API_KEY || "", model: "deepseek-chat" },
    available: !!process.env.DEEPSEEK_API_KEY,
  },
  {
    id: "gemini",
    label: "Gemini",
    config: { apiKey: process.env.GEMINI_API_KEY || "", model: "gemini-2.5-flash" },
    available: !!process.env.GEMINI_API_KEY,
  },
  {
    id: "yandex",
    label: "Yandex",
    config: { apiKey: process.env.YANDEX_API_KEY || "", model: "yandexgpt/latest" },
    available: !!process.env.YANDEX_API_KEY && !!process.env.YANDEX_FOLDER_ID,
  },
  {
    id: "grok",
    label: "Grok",
    config: { apiKey: process.env.GROK_API_KEY || "", model: "grok-3-mini" },
    available: !!process.env.GROK_API_KEY,
  },
];

/** Get only available providers */
export function getAvailableProviders() {
  return PROVIDER_CONFIGS.filter(p => p.available);
}

/** Test screenplay scene in Russian */
export const TEST_SCENE = `INT. КАБИНЕТ СЛЕДОВАТЕЛЯ — НОЧЬ

ИВАН (40) сидит за столом, перебирая фотографии с места преступления.

ИВАН
(себе под нос)
Что-то здесь не складывается...

Дверь открывается. Входит МАРИЯ (35), его напарница.

МАРИЯ
Есть новости. Свидетель изменил показания.

ИВАН
(поднимая голову)
Какой именно?

МАРИЯ
Сосед. Теперь говорит, что видел подозреваемого раньше — за неделю до убийства. Он следил за жертвой.`;

/** Short context for project */
export const TEST_PROJECT_CONTEXT = `Жанр: детективный триллер. Главные герои: Иван — следователь, Мария — его напарница. Действие происходит в Москве.`;

/** Unformatted text for format tests */
export const TEST_UNFORMATTED = `INT. ПАРК — ДЕНЬ
Анна бежит по аллее. Её преследует незнакомец в чёрном пальто.
АННА
Оставьте меня в покое!
Незнакомец останавливается и снимает шляпу. Это ВИКТОР.
ВИКТОР
Подождите! Я просто хотел вернуть вашу сумку.`;
