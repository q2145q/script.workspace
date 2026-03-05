# AI Prompts & Provider Integration Plan

> Статус: ФИНАЛЬНЫЙ
> Дата: 2026-03-05

---

## Обзор

Внедрение двухслойной системы промтов + обновление провайдеров + добавление новых AI-фич.

**Принятые решения:**
- Хранение: **гибрид** — системные промты в коде (.ts), task-промты в отдельных .md файлах
- Rewrite: **сохраняем JSON-формат** (patch operations), берём content-правила из нового rewrite.md
- Provider system prompts: **5 отдельных констант** (по одной на провайдер)
- API references: обновляем код провайдеров + переносим в `docs/`

---

## Архитектура промтов (новая)

```
Финальный системный промт = ProviderSystemPrompt(providerId)
  ├── {{TASK_INSTRUCTIONS}} → TaskPrompt(taskType)  — загружается из .md файла
  ├── {{PROJECT_CONTEXT}}   → contextBlocks          — формируется из buildChatContext()
  ├── {{USER_LANGUAGE}}     → project.language
  └── {{USER_REQUEST}}      → user message / selected text
```

### Файловая структура (целевая)

```
packages/ai/
├── src/
│   ├── prompts/
│   │   ├── system/
│   │   │   ├── openai.ts        ← константа OPENAI_SYSTEM_PROMPT
│   │   │   ├── anthropic.ts     ← константа ANTHROPIC_SYSTEM_PROMPT
│   │   │   ├── deepseek.ts      ← константа DEEPSEEK_SYSTEM_PROMPT
│   │   │   ├── gemini.ts        ← константа GEMINI_SYSTEM_PROMPT
│   │   │   ├── yandex.ts        ← константа YANDEX_SYSTEM_PROMPT
│   │   │   └── index.ts         ← getSystemPrompt(providerId): string
│   │   ├── tasks/
│   │   │   ├── chat.md              ← из promt/system_en_chat.md
│   │   │   ├── rewrite.md          ← из promt/rewrite.md (адаптированный с JSON форматом)
│   │   │   ├── format.md           ← из promt/task_format.md
│   │   │   ├── analysis.md         ← из promt/analysis.md
│   │   │   ├── character-analysis.md ← из promt/character_analysis.md
│   │   │   ├── structure-analysis.md ← из promt/structure_analysis.md
│   │   │   ├── logline.md          ← из promt/logline_system_ru.md
│   │   │   ├── synopsis.md         ← из promt/synopsis_system_en.md
│   │   │   ├── describe-character.md ← из promt/short_description_сharasters.md
│   │   │   ├── describe-location.md  ← из promt/short_description_location.md
│   │   │   └── knowledge-graph.md   ← из promt/PROJECT KNOWLEDGE GRAPH TASK PROMPT.md
│   │   ├── loader.ts           ← loadTaskPrompt(taskName): string
│   │   └── compose.ts          ← composePrompt(providerId, taskName, variables): string
│   ├── context.ts              ← обновлённый (без CHAT_SYSTEM_PROMPT, использует compose)
│   ├── chat-stream.ts          ← обновлённый (принимает composed prompt)
│   ├── providers/base.ts       ← обновлённый (без старых промтов)
│   └── ...
docs/
├── api-references/
│   ├── claude.md       ← из AI Instruction/claude_api_reference.md
│   ├── deepseek.md     ← из AI Instruction/deepseek_api_reference.md
│   ├── gemini.md       ← из AI Instruction/gemini_api_reference.md
│   ├── openai.md       ← из AI Instruction/openai_api_engineering_bible.md
│   └── yandex.md       ← из AI Instruction/yandex_api_reference.md
```

---

## Фаза 1: Инфраструктура промтов

### 1.1 Template Engine (`packages/ai/src/prompts/compose.ts`)

Простая функция замены `{{VARIABLE}}` в промтах:

```typescript
type TemplateVars = Record<string, string>;

function fillTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}
```

Также поддержка XML-тегов для Claude:
```typescript
// Claude использует <project_context>{{PROJECT_CONTEXT}}</project_context>
// Другие провайдеры — простой текст
// Template engine обрабатывает оба формата одинаково
```

### 1.2 Provider System Prompts (`packages/ai/src/prompts/system/`)

5 файлов с константами, каждая содержит полный текст из соответствующего `promt/*_system.md`.

**Важно**: Промты из `promt/claude_system.md` используют XML-теги (`<project_context>`), остальные — `{USER_LANGUAGE}`. Нужно унифицировать placeholder-формат в коде (всё через `{{VARIABLE}}`), т.к. template engine единый.

```typescript
// packages/ai/src/prompts/system/index.ts
export function getSystemPrompt(providerId: ProviderId): string {
  switch (providerId) {
    case "openai": return OPENAI_SYSTEM_PROMPT;
    case "anthropic": return ANTHROPIC_SYSTEM_PROMPT;
    case "deepseek": return DEEPSEEK_SYSTEM_PROMPT;
    case "gemini": return GEMINI_SYSTEM_PROMPT;
    case "yandex": return YANDEX_SYSTEM_PROMPT;
    case "grok": return OPENAI_SYSTEM_PROMPT; // Grok использует OpenAI-промт
  }
}
```

### 1.3 Task Prompt Loader (`packages/ai/src/prompts/loader.ts`)

```typescript
import { readFileSync } from "fs";
import { join } from "path";

const TASKS_DIR = join(__dirname, "tasks");
const cache = new Map<string, string>();

export function loadTaskPrompt(taskName: string): string {
  if (cache.has(taskName)) return cache.get(taskName)!;
  const content = readFileSync(join(TASKS_DIR, `${taskName}.md`), "utf-8");
  cache.set(taskName, content);
  return content;
}
```

### 1.4 Prompt Composition (`packages/ai/src/prompts/compose.ts`)

```typescript
export function composePrompt(
  providerId: ProviderId,
  taskName: string,
  variables: TemplateVars
): string {
  const systemPrompt = getSystemPrompt(providerId);
  const taskPrompt = loadTaskPrompt(taskName);

  // Inject task prompt into system prompt's {{TASK_INSTRUCTIONS}} slot
  const withTask = fillTemplate(systemPrompt, {
    TASK_INSTRUCTIONS: taskPrompt,
    ...variables,
  });

  return withTask;
}
```

---

## Фаза 2: Обновление существующих промтов

### 2.1 Chat System Prompt

**Текущее**: `context.ts` → `CHAT_SYSTEM_PROMPT` (25 строк, общий для всех)

**Новое**:
- Системный промт = provider-specific (из `getSystemPrompt(providerId)`)
- Task instructions = `system_en_chat.md` (5 режимов работы)
- Контекст = результат `buildChatContext()`

**Изменения в коде:**
- `context.ts`: убрать `CHAT_SYSTEM_PROMPT`, `buildChatContext()` возвращает только contextBlocks
- `chat-stream.ts`: `streamChat()` принимает уже скомпозированный `systemPrompt`
- `route.ts`: вызывает `composePrompt(providerId, "chat", { PROJECT_CONTEXT, USER_LANGUAGE, ... })`

**Решено**: `{{SCREENPLAY_STRUCTURE}}` загружается из БД (Document tree) на стороне сервера при каждом запросе чата. Нужно:
- В `route.ts`: загружать структуру документов проекта из Prisma (список актов/сцен с заголовками)
- Форматировать как текстовый список и подставлять в `{{SCREENPLAY_STRUCTURE}}`

### 2.2 Rewrite Prompt

**Текущее**: `base.ts` → `SYSTEM_PROMPT` (65 строк, включает JSON формат + formatting rules)

**Новое**:
- Системный промт = provider-specific
- Task instructions = адаптированный `rewrite.md` + JSON format rules из текущего `base.ts`
- Сохраняем `buildRewritePrompt()` для формирования user message
- Сохраняем `NODE_TYPE_REMINDERS`

**Адаптация rewrite.md:**
Нужно добавить в `rewrite.md` секцию JSON Output Format:
```markdown
## Output Format
Return a JSON object:
{
  "operations": [{ "type": "replace", "from": 0, "to": <length>, "content": "...", "nodeType": "..." }],
  "explanation": "..."
}
```
При этом взять из нового промта:
- Content rules (preserve facts, follow instructions, no new elements)
- Context awareness через XML-теги (project_context, surrounding_context)

### 2.3 Format Prompt

**Текущее**: `base.ts` → `FORMAT_SYSTEM_PROMPT` (27 строк, базовый)

**Новое**: `task_format.md` — более детальный, с priority-ordered detection rules и few-shot примером.

**Изменения:**
- Заменить `FORMAT_SYSTEM_PROMPT` содержимым `task_format.md`
- Сохранить JSON output format `{blocks: [...], explanation: "..."}`
- `task_format.md` уже содержит правильный JSON формат — совпадает с текущим

---

## Фаза 3: Новые AI-фичи

### 3.1 Новые типы в AIProvider interface

Расширить `packages/ai/src/types.ts`:

```typescript
/** Task types for AI operations */
export type AITaskType =
  | "chat"
  | "rewrite"
  | "format"
  | "analysis"           // scene analysis
  | "character-analysis" // character extraction
  | "structure-analysis" // three-act structure
  | "logline"           // logline generation
  | "synopsis"          // full synopsis
  | "describe-character" // short character desc
  | "describe-location"  // short location desc
  | "knowledge-graph";   // entity/relationship extraction
```

### 3.2 Zod-схемы для ответов новых фич

Добавить в `packages/types/src/ai.ts`:

```typescript
// Scene Analysis Response
export const sceneAnalysisSchema = z.object({
  summary: z.string(),
  scene_function: z.string(),
  characters_present: z.array(z.string()),
  character_goals: z.array(z.object({ character: z.string(), goal: z.string() })),
  conflict: z.string(),
  stakes: z.string(),
  emotional_tone: z.string(),
  key_events: z.array(z.string()),
  visual_elements: z.array(z.string()),
  pacing: z.string(),
  problems: z.array(z.string()),
  suggestions: z.array(z.string()),
});

// Character Analysis Response
export const characterAnalysisSchema = z.object({
  characters: z.array(z.object({
    name: z.string(),
    description: z.string(),
    role_in_story: z.string(),
    goals: z.string(),
    motivations: z.string(),
    internal_conflict: z.string(),
    external_conflict: z.string(),
    traits: z.array(z.string()),
    relationships: z.array(z.object({
      character: z.string(),
      type: z.string(),
      description: z.string(),
    })),
  })),
});

// Structure Analysis Response
export const structureAnalysisSchema = z.object({
  act: z.string(),
  story_phase: z.string(),
  turning_points: z.array(z.string()),
  conflicts: z.array(z.string()),
  stakes: z.string(),
  tension_level: z.string(),
  narrative_function: z.string(),
  story_progress: z.string(),
  structure_problems: z.array(z.string()),
  suggestions: z.array(z.string()),
});

// Knowledge Graph Response
export const knowledgeGraphSchema = z.object({
  entities: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    description: z.string(),
  })),
  relationships: z.array(z.object({
    source: z.string(),
    target: z.string(),
    type: z.string(),
    description: z.string().optional(),
  })),
  events: z.array(z.object({
    id: z.string(),
    name: z.string(),
    participants: z.array(z.string()),
    location: z.string().optional(),
    importance: z.string(),
  })),
});
```

### 3.3 Новые tRPC endpoints

Добавить в `packages/api/src/routers/ai.ts`:

| Endpoint | Input | Task Prompt | Output |
|----------|-------|-------------|--------|
| `ai.analyzeScene` | sceneText | `analysis.md` | `SceneAnalysis` JSON |
| `ai.analyzeCharacters` | text | `character-analysis.md` | `CharacterAnalysis` JSON |
| `ai.analyzeStructure` | sceneText | `structure-analysis.md` | `StructureAnalysis` JSON |
| `ai.generateLogline` | projectContext | `logline.md` | `{ logline: string }` |
| `ai.generateSynopsis` | projectContext | `synopsis.md` | `{ synopsis: string }` |
| `ai.describeCharacter` | characterContext | `describe-character.md` | `{ description: string }` |
| `ai.describeLocation` | locationContext | `describe-location.md` | `{ description: string }` |
| `ai.extractKnowledgeGraph` | text | `knowledge-graph.md` | `KnowledgeGraph` JSON |

**Общий паттерн для каждого:**
```typescript
// 1. Resolve API key
// 2. Load task prompt via composePrompt(providerId, taskName, vars)
// 3. Call provider (non-streaming, JSON response)
// 4. Parse & validate with Zod
// 5. Log usage
// 6. Return typed result
```

### 3.4 UI-компоненты для новых фич

Это потребует отдельного планирования, но основные точки:
- Панель анализа сцены (боковая панель или вкладка)
- Секция анализа персонажей в настройках проекта
- Генератор логлайна/синопсиса в настройках проекта
- Визуализация графа знаний — **интерактивный граф** (d3-force / vis.js), отдельная страница проекта

---

## Фаза 4: Обновление провайдеров

### 4.1 Обновление моделей

Из API-референсов нужно обновить `GlobalModelConfig` (seed/миграция):

**OpenAI (новые):**
- GPT-5 (400K context)
- GPT-5-mini
- GPT-5-nano
- o3, o3-pro, o4-mini

**Gemini (новые):**
- `gemini-3.1-pro-preview` (1M context)
- `gemini-3-flash-preview` (1M)
- `gemini-3.1-flash-lite-preview` (1M)
- Deprecation: `gemini-2.0-flash` → June 2026

**Claude (обновления):**
- Проверить актуальность snapshot ID
- `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5`

**DeepSeek:**
- Модели не изменились (`deepseek-chat`, `deepseek-reasoner`)
- Важно: base model теперь DeepSeek-V3.2

**Yandex (новые):**
- YandexGPT Pro 5.1 RC
- Qwen3 235B (hosted, 262K context)
- gpt-oss-120b, gpt-oss-20b
- Gemma 3 27B

**Grok:**
- Проверить актуальность `grok-3`, `grok-3-mini`

### 4.2 Обновление pricing

Обновить `costInputPerMillion` / `costOutputPerMillion` в `GlobalModelConfig` по данным из API-референсов.

### 4.3 Provider-specific фиксы

**DeepSeek:**
- В `chat-stream.ts`: НЕ отправлять `reasoning_content` обратно в историю (сейчас не отправляем, но нужно убедиться)
- Для `deepseek-reasoner`: `temperature`, `top_p` игнорируются — убрать из запроса

**Gemini:**
- Для Gemini 3.x: нужна поддержка `thought_signatures` в multi-turn (если используем thinking)
- `response_mime_type: "application/json"` для JSON-ответов
- Роль `"model"` вместо `"assistant"` (проверить через OpenAI-compatible endpoint)

**Yandex:**
- `folder_id` из env variable (сейчас hardcoded `b1g00000000000000000`)
- Поддержка `reasoningOptions` для `yandexgpt/rc`
- Structured JSON через `json_schema` в API call

**Claude (приоритет — внедрять сразу):**
- **Prompt caching**: `cache_control: {"type": "ephemeral"}` на system prompt блоках в `streamChatAnthropic()`. Экономия до 90% на повторных запросах с тем же системным промтом. Минимальные изменения в коде — добавить `cache_control` к system message.
- **Extended thinking**: включить для аналитических задач (analysis, structure-analysis, character-analysis, knowledge-graph). Использовать `thinking: { type: "adaptive" }` для Opus 4.6, `thinking: { type: "enabled", budget_tokens: 8192 }` для Sonnet. Для chat/rewrite/format — НЕ включать (не нужно, дороже).

**Gemini thinking (внедрять сразу):**
- Gemini 2.5: `thinking_budget` (int, в токенах) — для аналитических задач ставить ~8192
- Gemini 3.x: `thinking_level` ("low" / "medium" / "high") — для аналитики "medium"
- Нужна функция `getThinkingConfig(providerId, taskType)` → возвращает нужные параметры thinking для конкретного провайдера и типа задачи

### 4.4 Перемещение API-референсов

```bash
mkdir -p docs/api-references
mv "AI Instruction/claude_api_reference.md" docs/api-references/claude.md
mv "AI Instruction/deepseek_api_reference.md" docs/api-references/deepseek.md
mv "AI Instruction/gemini_api_reference.md" docs/api-references/gemini.md
mv "AI Instruction/openai_api_engineering_bible.md" docs/api-references/openai.md
mv "AI Instruction/yandex_api_reference.md" docs/api-references/yandex.md
```

---

## Фаза 5: Адаптация промтов

### 5.1 Унификация placeholder-формата

Все промты должны использовать единый формат `{{VARIABLE_NAME}}`:
- `claude_system.md` сейчас использует XML-теги (`<project_context>{{PROJECT_CONTEXT}}</project_context>`) — **оставляем**, Claude лучше работает с XML
- Остальные используют `{USER_LANGUAGE}` (одинарные скобки) — **заменяем на `{{USER_LANGUAGE}}`**

Template engine должен обрабатывать оба формата.

### 5.2 Адаптация rewrite.md

Добавить JSON output format:
```markdown
## Output Format
You MUST return a JSON object:
{
  "operations": [
    {
      "type": "replace",
      "from": 0,
      "to": <length of selected text>,
      "content": "<rewritten text>",
      "nodeType": "<element type>"
    }
  ],
  "explanation": "<brief explanation>"
}

Return valid JSON only. No markdown code fences.
```

Сохранить из `rewrite.md`:
- Content rules (preserve facts, follow instructions)
- XML-tagged input structure
- Language matching

### 5.3 Адаптация system_en_chat.md

Проверить/добавить:
- `{{PROJECT_CONTEXT}}` — уже есть
- `{{SCREENPLAY_STRUCTURE}}` — **загружается из БД** (Document tree, сервер)
- `{{USER_MESSAGE}}` — уже есть

### 5.4 Адаптация logline_system_ru.md

**Решено**: Перевести промт на английский + добавить `{{USER_LANGUAGE}}` для вывода. Один универсальный файл `logline.md`.

### 5.5 Проверка всех task-промтов

Каждый task-промт проверить на:
- Совместимость с JSON output format (где нужен)
- Наличие правильных placeholder-ов
- Язык (en предпочтителен для промтов, вывод на `{{USER_LANGUAGE}}`)

---

## Фаза 6: Тестирование

### 6.1 Настройка тестового фреймворка

Проект сейчас **не имеет тестов**. Нужно добавить Vitest.

**Корневой уровень:**
- `vitest.workspace.ts` — workspace config для monorepo
- `pnpm add -Dw vitest` — в корень

**`packages/ai/`:**
- `vitest.config.ts` — конфигурация для AI-пакета
- `.env.test` — API-ключи для интеграционных тестов (gitignore!)

**Скрипты:**
```json
// package.json (root)
"test": "turbo test",
"test:ai": "pnpm --filter @script/ai test",
"test:ai:integration": "pnpm --filter @script/ai test:integration"

// packages/ai/package.json
"test": "vitest run",
"test:watch": "vitest",
"test:integration": "vitest run --config vitest.integration.config.ts"
```

### 6.2 Unit-тесты (`packages/ai/src/__tests__/unit/`)

Не требуют API-ключей, быстрые:

| Тест | Что проверяет |
|------|--------------|
| `template.test.ts` | `fillTemplate()` — замена `{{VAR}}`, пустые переменные, XML-теги |
| `loader.test.ts` | `loadTaskPrompt()` — загрузка .md файлов, кеширование |
| `compose.test.ts` | `composePrompt()` — сборка system + task + variables |
| `system-prompts.test.ts` | `getSystemPrompt()` — возвращает промт для каждого провайдера |
| `context.test.ts` | `buildChatContext()` — приоритеты слоёв, truncation, лимит 60K |

### 6.3 Integration-тесты (`packages/ai/src/__tests__/integration/`)

Реальные вызовы API с настоящими ключами. Каждый тест:
- Отправляет реальный запрос к провайдеру
- Валидирует ответ через Zod-схему
- Проверяет что ответ не пустой и содержит осмысленный текст
- Timeout: 60 секунд на тест

**Тестовые данные** — один общий набор:
```typescript
const TEST_SCENE = `INT. КАБИНЕТ СЛЕДОВАТЕЛЯ — НОЧЬ

ИВАН (40) сидит за столом, перебирая фотографии с места преступления.

ИВАН
(себе под нос)
Что-то здесь не складывается...

Дверь открывается. Входит МАРИЯ (35), его напарница.

МАРИЯ
Есть новости. Свидетель изменил показания.`;

const TEST_PROJECT_CONTEXT = `Жанр: детективный триллер. Главные герои: Иван — следователь, Мария — его напарница.`;
```

**Матрица тестов (provider × task):**

```
packages/ai/src/__tests__/integration/
├── providers/
│   ├── openai.test.ts         ← все task types для OpenAI
│   ├── anthropic.test.ts      ← все task types для Anthropic
│   ├── deepseek.test.ts       ← все task types для DeepSeek
│   ├── gemini.test.ts         ← все task types для Gemini
│   ├── yandex.test.ts         ← все task types для Yandex
│   └── grok.test.ts           ← все task types для Grok
└── tasks/
    ├── chat.test.ts           ← chat streaming для всех провайдеров
    ├── rewrite.test.ts        ← rewrite для всех провайдеров
    ├── format.test.ts         ← format для всех провайдеров
    ├── analysis.test.ts       ← scene analysis для всех провайдеров
    ├── character-analysis.test.ts
    ├── structure-analysis.test.ts
    ├── logline.test.ts
    ├── synopsis.test.ts
    ├── describe-character.test.ts
    ├── describe-location.test.ts
    └── knowledge-graph.test.ts
```

**Структура каждого провайдер-теста:**
```typescript
// packages/ai/src/__tests__/integration/providers/openai.test.ts
import { describe, it, expect } from "vitest";

describe("OpenAI Provider", () => {
  const config = { apiKey: process.env.OPENAI_API_KEY!, model: "gpt-4.1" };

  describe("chat", () => {
    it("should stream a response", async () => { /* ... */ }, 60_000);
  });

  describe("rewrite", () => {
    it("should return valid JSON with operations", async () => {
      const result = await provider.rewrite(TEST_REWRITE_INPUT, config);
      expect(() => aiRewriteResponseSchema.parse(result)).not.toThrow();
      expect(result.operations.length).toBeGreaterThan(0);
    }, 60_000);
  });

  describe("format", () => {
    it("should return valid screenplay blocks", async () => { /* ... */ }, 60_000);
  });

  describe("analysis", () => {
    it("should return valid scene analysis JSON", async () => { /* ... */ }, 60_000);
  });

  // ... остальные task types
});
```

### 6.4 Smoke-тест всех провайдеров

Быстрый тест "все провайдеры живы" — один запрос chat на каждый:

```typescript
// packages/ai/src/__tests__/integration/smoke.test.ts
describe.each([
  ["openai", "gpt-4.1"],
  ["anthropic", "claude-sonnet-4-6"],
  ["deepseek", "deepseek-chat"],
  ["gemini", "gemini-2.5-flash"],
  ["yandex", "yandexgpt/latest"],
  ["grok", "grok-3"],
])("Smoke: %s", (providerId, model) => {
  it("should respond to a simple chat message", async () => {
    // ...отправить "Привет", получить ответ, проверить что не пустой
  }, 60_000);
});
```

### 6.5 Env-переменные для тестов

```bash
# packages/ai/.env.test (gitignored!)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=AIza...
YANDEX_API_KEY=...
YANDEX_FOLDER_ID=...
GROK_API_KEY=...
AI_ENCRYPTION_SECRET=test-secret-32-chars-minimum-here
```

### 6.6 CI-интеграция (опционально, позже)

- GitHub Actions workflow с секретами для API-ключей
- Запуск `test:integration` по расписанию (daily) или при PR
- Smoke-тесты на каждый push

---

## Фаза 7: Очистка

- Удалить папку `promt/` (содержимое перенесено в `packages/ai/src/prompts/tasks/`)
- Удалить папку `AI Instruction/` (перенесено в `docs/api-references/`)
- Обновить `.gitignore` если нужно
- Обновить импорты в `packages/ai/src/index.ts`

---

## Порядок реализации (рекомендуемый)

> **⚠️ ПРОЕКТ В ПРОДАКШНЕ** (`script.yomimovie.art`, PM2, порт 3002).
> Каждый этап завершается обязательной цепочкой:
> ```
> Тесты → Type-check → Build → Dev-сервер (ручная проверка) → подтверждение → push/деплой
> ```
> **НИКОГДА не пушить без прохождения всех шагов!**

### Этап A — Инфраструктура + Тесты (Фазы 1 + 5.1-5.2 + 6.1-6.2)
1. Настроить Vitest (workspace + packages/ai конфиг)
2. Создать `packages/ai/src/prompts/` структуру
3. Реализовать template engine (fillTemplate)
4. Перенести и адаптировать все промты
5. Реализовать loader + compose
6. **Unit-тесты**: template, loader, compose, system-prompts, context
7. **Smoke-тест**: простой запрос к каждому провайдеру (все 6 API-ключей)
8. ✅ `pnpm test:ai` — все unit + smoke
9. ✅ `pnpm type-check && pnpm build` — проект собирается
10. ✅ `pnpm dev` → http://localhost:3001 → убедиться что приложение работает

### Этап B — Замена существующих промтов (Фаза 2)
11. Заменить chat system prompt → provider-specific + chat.md
12. Заменить rewrite prompt → provider-specific + rewrite.md (с JSON)
13. Заменить format prompt → provider-specific + format.md
14. Обновить route.ts и ai.ts для использования compose
15. **Integration-тесты**: chat, rewrite, format × все 6 провайдеров
16. ✅ `pnpm test:ai:integration`
17. ✅ `pnpm type-check && pnpm build`
18. ✅ `pnpm dev` → ручная проверка:
    - Chat: отправить сообщение → проверить ответ
    - Rewrite: выделить текст → переписать → проверить патч
    - Format: выделить текст → форматировать → проверить блоки
    - **Переключить провайдер** в настройках → повторить проверку

### Этап C — Обновление провайдеров (Фаза 4)
19. Обновить список моделей и цены
20. Провайдер-специфичные фиксы (Yandex folder_id, DeepSeek reasoning)
21. Claude prompt caching + extended thinking
22. Gemini thinking config
23. Перенести API-рефы в docs/
24. ✅ `pnpm test:ai:integration` — полный прогон с обновлёнными моделями
25. ✅ `pnpm type-check && pnpm build`
26. ✅ `pnpm dev` → ручная проверка каждого провайдера в UI

### Этап D — Новые фичи (Фаза 3)
27. Добавить Zod-схемы для новых ответов
28. Реализовать tRPC endpoints (по одному), **после каждого**:
    - Integration-тест × ALL 6 провайдеров → ✅ прогон
    - `ai.analyzeScene` → analysis × 6 → ✅
    - `ai.analyzeCharacters` → character-analysis × 6 → ✅
    - `ai.analyzeStructure` → structure-analysis × 6 → ✅
    - `ai.generateLogline` → logline × 6 → ✅
    - `ai.generateSynopsis` → synopsis × 6 → ✅
    - `ai.describeCharacter` → describe-character × 6 → ✅
    - `ai.describeLocation` → describe-location × 6 → ✅
    - `ai.extractKnowledgeGraph` → knowledge-graph × 6 → ✅
29. UI для анализа сцены
30. UI для анализа персонажей и структуры
31. UI для генерации логлайна и синопсиса
32. UI для описаний персонажей и локаций
33. Knowledge graph API + интерактивная визуализация графа (d3-force / vis.js)
34. ✅ `pnpm type-check && pnpm build`
35. ✅ `pnpm dev` → ручная проверка ВСЕХ новых UI-компонентов

### Этап E — Очистка + Деплой (Фаза 7)
36. Удалить исходные папки (`promt/`, `AI Instruction/`)
37. ✅ **Финальный полный прогон**: `pnpm test:ai && pnpm test:ai:integration`
38. ✅ `pnpm type-check && pnpm build`
39. ✅ `pnpm dev` → финальная ручная проверка всех функций
40. 🚀 **Деплой** (только после подтверждения пользователя):
    ```bash
    pnpm build && pm2 restart script-workspace && pm2 restart script-admin
    ```

---

## Принятые решения (все вопросы закрыты)

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | `{{SCREENPLAY_STRUCTURE}}` — откуда? | **Из БД** (Document tree), сервер загружает при каждом запросе чата |
| 2 | Logline prompt на русском | **Перевести на EN** + `{{USER_LANGUAGE}}` для вывода |
| 3 | Knowledge Graph UI | **API + интерактивный граф** (d3-force / vis.js) |
| 4 | Prompt caching (Claude) | **Да, сразу** — `cache_control: {"type": "ephemeral"}` |
| 5 | Extended thinking | **Да, сразу** — для аналитических задач (analysis, structure, characters, KG) |
| 6 | Gemini thinking | **Да** — `thinking_budget` для 2.5, `thinking_level` для 3.x |
| 7 | Rewrite format | **JSON** (patch operations), content-правила из нового rewrite.md |
| 8 | Provider prompts storage | **5 отдельных констант** (.ts файлы) |
| 9 | Prompt storage | **Гибрид** — system в коде, task в .md |
| 10 | API references | **Обновить код + перенести в docs/** |
| 11 | Тестирование | **Обязательно** — Vitest, unit + integration тесты для КАЖДОГО провайдера × КАЖДОГО task type |
| 12 | Тесты после каждого шага | **Да** — глобальная инструкция в CLAUDE.md |
| 13 | Деплой | **Тесты → type-check → build → dev → ручная проверка → только потом push/деплой** |
| 14 | Production safety | PM2, `pm2 restart` только после подтверждения пользователя |
