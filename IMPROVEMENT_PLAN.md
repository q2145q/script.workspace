# Script Workspace — Master Plan: Audit Fixes + New Features

> **Составлен:** 2026-03-07
> **Статус:** Утверждён
> **Основан на:** Audit Report (2026-03-06) + пользовательские баги + новые фичи
> **Итого:** 15 фаз, 47 задач (40 из аудита + 5 багов + 2 фичи)

---

## Содержание

**PART A: Критические баги**
1. [Phase 1: Notes Not Saving](#phase-1-notes-not-saving)
2. [Phase 2: Export Fixes](#phase-2-export-fixes)
3. [Phase 3: Synopsis Validation](#phase-3-synopsis-validation-fix)

**PART B: Новые фичи**
4. [Phase 4: Map-Reduce для длинного контекста AI](#phase-4-map-reduce-for-large-ai-context)
5. [Phase 5: Format All](#phase-5-format-all)
6. [Phase 6: Scene Board Fixes](#phase-6-scene-board-fixes)

**PART C: Безопасность (Аудит)**
7. [Phase 7: Critical Security](#phase-7-critical-security-fixes)
8. [Phase 8: High-Priority Security](#phase-8-high-priority-security)
9. [Phase 9: Medium Security](#phase-9-medium-security)

**PART D: Бизнес-логика (Аудит)**
10. [Phase 10: Critical Business Logic](#phase-10-critical-business-logic)
11. [Phase 11: Medium Business Logic](#phase-11-medium-business-logic)

**PART E: Качество кода (Аудит)**
12. [Phase 12: Code Quality](#phase-12-code-quality-fixes)

**PART F: UX/UI (Аудит + Пользовательские)**
13. [Phase 13: UX/UI Fixes](#phase-13-uxui-fixes)
14. [Phase 14: Medium UX/UI](#phase-14-medium-uxui)

**PART G: Производительность (Аудит)**
15. [Phase 15: Performance Fixes](#phase-15-performance-fixes)

---

## Обязательный pipeline после КАЖДОЙ фазы

```bash
pnpm test:ai          # unit тесты AI
pnpm type-check       # проверка типов
pnpm build            # сборка
# dev server → ручная проверка по чеклисту
cd apps/web && npx next dev --turbopack --hostname 0.0.0.0 --port 3001
```

---

# PART A: КРИТИЧЕСКИЕ БАГИ

---

## Phase 1: Notes Not Saving

**Причина:** В продакшене активен Yjs/Hocuspocus. Заметки сохраняются ТОЛЬКО через WebSocket → collab server → DB. Если collab server не может сохранить — изменения молча теряются без уведомления.

### Файлы:
- `apps/collab/src/persistence.ts` — retry с экспоненциальной задержкой в `storeDocument()`
- `apps/collab/src/index.ts` — error handling в Database extension store hook
- `packages/editor/src/components/Editor.tsx` — `onStatus`/`onDisconnect` callbacks в HocuspocusProvider
- `apps/web/components/workspace/notes-panel.tsx` — fallback на прямое API сохранение при потере соединения >10с
- `apps/web/components/workspace/collab-status.tsx` — показ причины ошибки

### Шаги:
1. `persistence.ts`: обернуть DB update в retry (3 попытки, 1с/2с/4с), логировать все ошибки
2. `Editor.tsx`: добавить `onStatus` callback, передавать состояние соединения родителю
3. `notes-panel.tsx`: если отключено >10с → включить `handleAutosave()` (прямое API); при переподключении → вернуть Yjs
4. `collab-status.tsx`: "Переподключение...", "Ошибка сохранения"

### Тесты:
- `pnpm type-check`
- `pnpm build`

### Ручной чеклист:
- [ ] Открыть заметку в dev, редактировать → проверить автосохранение (запрос в БД)
- [ ] Остановить collab server (`pm2 stop script-collab`) → редактировать → toast о fallback, контент сохраняется через API
- [ ] Перезапустить collab server → индикатор зелёный
- [ ] Редактировать снова → Yjs синк возобновляется
- [ ] Закрыть и открыть заметку → контент на месте

---

## Phase 2: Export Fixes

### 2a: Контент не экспортируется (только титульная + пустая)

**Файлы:**
- `packages/api/src/export/content-parser.ts` — маппинг типов нод: `paragraph`→`action`; все screenplay типы
- `packages/api/src/routers/export.ts` — фильтр `deletedAt: null`; логирование кол-ва блоков

**Шаги:**
1. Прочитать реальный JSON документа из БД для понимания структуры
2. В `content-parser.ts`: маппинг всех типов (`sceneHeading`, `action`, `paragraph`→`action`, `character`, `dialogue`, `parenthetical`, `transition`, `shot`)
3. Обработка вложенной структуры: `doc.content[].content[].text`
4. Добавить `console.log('Export: parsed ${blocks.length} blocks')`
5. В export router: `deletedAt: null` в запросе документа

### 2b: Все авторы на титульной странице

**Файлы:**
- `packages/types/src/export.ts` — `author: string` → `authors: string[]`
- `packages/api/src/routers/export.ts` — загрузка `project.members`
- `packages/api/src/export/pdf-generator.ts` — рендер массива авторов
- `packages/api/src/export/docx-generator.ts` — то же
- `packages/api/src/export/fdx-generator.ts` — то же

**Шаги:**
1. Обновить `ScreenplayMetadata`: `authors: string[]`
2. В export router: include `members: { include: { user: true } }`
3. Собрать: `[owner.name, ...editors.map(m => m.user.name)]`
4. PDF/DOCX/FDX: рендер каждого автора на отдельной строке под "Written by"

### 2c: Редактор титульной страницы

**Файлы:**
- `packages/db/prisma/schema.prisma` — `titlePage Json?` на `Project`
- `packages/api/src/routers/project.ts` — мутация `updateTitlePage`
- `apps/web/components/workspace/title-page-editor.tsx` — **новый**: форма (title, subtitle, authors[], contact, company, draftDate, notes)
- `apps/web/components/workspace/editor-area.tsx` — кнопка "Титульная страница"
- `packages/api/src/routers/export.ts` — использовать `project.titlePage` если есть

**Шаги:**
1. Добавить `titlePage Json?` в модель Project; `pnpm db:generate`
2. Zod-схема для титульной страницы
3. Мутация `updateTitlePage`
4. UI: Dialog с формой, автозаполнение из данных проекта + участников
5. Кнопка в header toolbar
6. Экспорт: приоритет `project.titlePage`, fallback на auto-generated

### Тесты:
- `pnpm db:generate` (после изменения схемы)
- `pnpm type-check`
- `pnpm build`

### Ручной чеклист:
- [ ] Экспорт PDF проекта с контентом → все страницы рендерятся
- [ ] Экспорт проекта с 3 участниками → все имена на титульной
- [ ] Открыть редактор титульной → изменить → экспорт → кастомные данные
- [ ] Экспорт PDF, DOCX, FDX → все три формата корректны
- [ ] Экспорт пустого документа → без краша
- [ ] Секция "Written by" показывает всех авторов/редакторов

---

## Phase 3: Synopsis Validation Fix

**Причина:** Ошибка "необходимы материалы проекта" генерируется самой AI-моделью, а не кодом. Модель получает пустой контекст.

**Файлы:**
- `packages/api/src/routers/ai.ts` — валидация перед вызовом AI в `generateSynopsis` и `generateLogline`

**Шаги:**
1. Перед `completeAI()`: `if (!projectContext || projectContext.trim().length < 200)`
2. Throw `TRPCError({ code: "PRECONDITION_FAILED", message: "Для генерации синопсиса необходим текст сценария..." })`
3. То же для `generateLogline`

### Тесты:
- `pnpm test:ai`
- `pnpm type-check`

### Ручной чеклист:
- [ ] Пустой проект → синопсис → понятная ошибка на русском (не AI-галлюцинация)
- [ ] Проект с текстом → синопсис генерируется нормально
- [ ] Пустой проект → логлайн → понятная ошибка

---

# PART B: НОВЫЕ ФИЧИ

---

## Phase 4: Map-Reduce for Large AI Context

**Цель:** Все AI-задачи, требующие полного контекста проекта, автоматически используют Map-Reduce при превышении контекстного окна провайдера. 8 задач: synopsis, logline, beatSheet, pacing, consistency, structure, characters, knowledgeGraph.

### Контекстные окна провайдеров:
| Провайдер | Модель | Контекст (токены) |
|-----------|--------|-------------------|
| Gemini | 2.5 Pro | 2,000,000 |
| GPT | 4.1 | 400,000 |
| Anthropic | Claude Sonnet 4.6 | 200,000 |
| DeepSeek | chat | 128,000 |
| Grok | 3 | 128,000 |
| Yandex | GPT | 32,000 |

### Новые файлы:
- `packages/ai/src/context-limits.ts` — реестр контекстных окон
- `packages/ai/src/chunker.ts` — нарезка текста по сценам
- `packages/ai/src/map-reduce.ts` — Map-Reduce движок
- `packages/ai/src/prompts/tasks/*-map.md` — MAP-промпты (8 файлов)
- `packages/ai/src/prompts/tasks/*-reduce.md` — REDUCE-промпты (7 файлов, knowledgeGraph мержится на сервере)

### Изменяемые файлы:
- `packages/api/src/routers/ai.ts` — обёртка 8 мутаций: проверка размера → direct или map-reduce
- `packages/types/src/ai.ts` — типы для прогресса

### Шаги:

**4.1: Реестр лимитов (`context-limits.ts`)**
- Маппинг modelId → maxTokens для всех моделей
- `getEffectiveLimit(modelId)` — возвращает 80% от лимита (запас на системный промпт + output)

**4.2: Чанкер (`chunker.ts`)**
- Разбивка по заголовкам сцен: `/^(INT\.|EXT\.|ИНТ\.|ЭКСТ\.|НАТ\.)/mi`
- Группировка маленьких сцен (до ~15K символов на группу)
- Если сцена > 15K — разбивка по абзацам
- Возврат `Chunk[]` с `{ text, index, sceneRange }`

**4.3: Map-Reduce движок (`map-reduce.ts`)**
- MAP: обработка чанков параллельно (concurrency=3)
- Если объединённые MAP-результаты > окна → рекурсивный reduce
- REDUCE: один финальный вызов со всеми MAP-саммари

**4.4: Map/Reduce промпты (15 новых .md файлов)**
| Задача | MAP | REDUCE |
|--------|-----|--------|
| synopsis | "Перескажи этот фрагмент" | "Напиши синопсис из пересказов" |
| logline | "Выдели героя, конфликт, ставки" | "Составь логлайн" |
| beatSheet | "Найди beats в фрагменте" | "Объедини в полную структуру" |
| pacing | "Оцени темп, action/dialogue" | "Общая оценка ритма" |
| consistency | "Извлеки факты, имена, хронологию" | "Найди противоречия" |
| structure | "Определи акт, повороты, конфликты" | "Полный анализ структуры" |
| characters | "Извлеки персонажей" | "Дедуплицируй, объедини" |
| knowledgeGraph | "Извлеки сущности и связи" | Merge на сервере (без AI) |

**4.5: Интеграция с мутациями**
В каждой из 8 мутаций: `estimateTokens(fullText)` vs `getEffectiveLimit(model)` → direct или mapReduce

**4.6: Поддержка сериалов**
Двухуровневый map-reduce: по-эпизодно → эпизод-саммари → финальный результат

**4.7: Предупреждение о провайдере**
"Текст превышает лимит для Yandex GPT (32K). Map-Reduce: ~N запросов. Рекомендуем Gemini 2.5 Pro."

**4.8: Прогресс**
In-memory Map по taskId. Query `ai.taskProgress`. Клиент поллит каждые 2с. "Анализирую часть 3 из 12..."

### Тесты:
- **Unit** (`packages/ai/src/__tests__/chunker.test.ts`): `chunkByScenes()`, edge cases
- **Unit** (`packages/ai/src/__tests__/map-reduce.test.ts`): mock provider, concurrency, recursive reduce
- **Integration**: `generateSynopsis` с большим проектом по всем провайдерам
- `pnpm test:ai && pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Короткий проект (<30 стр) → synopsis → прямой вызов (без map-reduce)
- [ ] Большой проект (>120 стр) → synopsis с OpenAI → map-reduce работает
- [ ] То же с Yandex → предупреждение о маленьком контексте
- [ ] То же с Gemini → прямой вызов (2M окно)
- [ ] Сериал с 4+ эпизодами → synopsis → двухуровневый map-reduce
- [ ] Прогресс "Анализирую часть N из M" отображается
- [ ] Все 8 задач работают с map-reduce
- [ ] Отмена в процессе → без краша

---

## Phase 5: Format All

**Цель:** Кнопка в тулбаре документа для автоматического форматирования всего сценария через AI по чанкам. Клиентский чанкинг, переиспользование существующего `ai.format`.

### Новые файлы:
- `apps/web/components/workspace/format-all-dialog.tsx` — логика + прогресс-модалка

### Изменяемые файлы:
- `apps/web/components/workspace/editor-area.tsx` — кнопка "Format All" в header
- `apps/web/messages/ru.json` — i18n строки

### Шаги:

**5.1: Клиентский чанкинг** — извлечение сегментов из `editor.state.doc`, группировка по ~5K символов

**5.2: Последовательная обработка (ОБРАТНЫЙ порядок)** — снизу вверх, чтобы не сбивать позиции

**5.3: Применение блоков** — переиспользование логики из `selection-toolbar.tsx` (`tr.replaceWith`)

**5.4: UI**
- Кнопка `Wand2` иконка в header toolbar
- Подтверждение: "Найдено N блоков. Отформатировать? ~X мин"
- Прогресс: модалка с progress bar + "Отмена"
- Текст: "Форматирование... Блок 5 из 12"
- Завершение: toast "Отформатировано: N блоков"
- Ctrl+Z отменяет все изменения

### Тесты:
- `pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Вставить текст из Word (Cmd+V) → Format All → правильные типы блоков
- [ ] Scene headings → `sceneHeading`, диалоги → `dialogue`
- [ ] 5-страничный документ → корректный чанкинг и завершение
- [ ] 30-страничный документ → прогресс-бар и завершение
- [ ] "Отмена" в процессе → частичное форматирование сохраняется
- [ ] Ctrl+Z → ВСЁ форматирование отменено
- [ ] Format All на уже отформатированном → без поломок
- [ ] Кнопка корректно выглядит в header toolbar

---

## Phase 6: Scene Board Fixes

### 6a: Drag & Drop Fix
**Файл:** `apps/web/components/workspace/scene-board.tsx`
1. Заменить `closestCorners` на `pointerWithin` для лучшего определения колонок
2. Увеличить droppable зоны колонок (полная высота)
3. Визуальные индикаторы drop-зон
4. Реордеринг ВНУТРИ актов (`arrayMove`)
5. Обработка `sortOrder` в мутации `sceneMetadata.update`

### 6b: Модалка сцены (двойной клик)
**Новый файл:** `apps/web/components/workspace/scene-detail-modal.tsx`
1. Dialog: заголовок, полный текст, синопсис, метадата (длительность, персонажи, цветовой тег)
2. `onDoubleClick` на карточках → открытие модалки
3. Извлечение контента сцены из редактора

### 6c: AI разбивка по актам
**Новые файлы:** `packages/ai/src/prompts/tasks/act-assignment.md`
1. Промпт: "Распредели сцены по 3-актной структуре"
2. Мутация `assignActs` в ai.ts
3. Кнопка "Auto-assign" (sparkle icon) в header scene board
4. Лёгкий вход (только headings + synopses) — map-reduce не нужен

### Тесты:
- `pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Перетащить из "Без акта" → Акт 1 → перемещается
- [ ] Перетащить из Акт 1 → Акт 3 → перемещается
- [ ] Перетащить из Акт 2 → Акт 1 → перемещается (было сломано)
- [ ] Реордеринг внутри Акт 1 → порядок меняется
- [ ] Drop на пустую область колонки → сцена в этом акте
- [ ] Визуальные индикаторы при drag-over
- [ ] Двойной клик на карточку → модалка с полной сценой
- [ ] Модалка: заголовок, текст, синопсис, персонажи, цвет
- [ ] "Auto-assign acts" → AI распределяет по 3 актам
- [ ] Распределение драматургически осмысленное

---

# PART C: БЕЗОПАСНОСТЬ (АУДИТ)

---

## Phase 7: Critical Security Fixes

### 7.1: Секреты в репозитории (Audit 2.1)
- [ ] Проверить `.gitignore` для `.env` файлов
- [ ] Ротировать ВСЕ секреты: DATABASE_URL, BETTER_AUTH_SECRET, AI_ENCRYPTION_SECRET, ADMIN_*
- [ ] Ротировать все AI API-ключи
- [ ] Очистить git-историю: `git filter-branch` или `git-filter-repo`

### 7.2: Admin auth на bcrypt (Audit 2.2)
**Файл:** `apps/admin/lib/auth.ts`
- [ ] Установить `bcryptjs`
- [ ] Hash пароля в env `ADMIN_PASSWORD_HASH`
- [ ] Убрать `"admin-fallback-secret"`
- [ ] TTL сессии: 7 дней → 2 часа
- [ ] `sameSite: "strict"` на cookie
- [ ] Rate limiting: 5 попыток / 15 мин / IP

### 7.3: Утечка информации в ошибках (Audit 2.3)
**Файл:** `apps/web/app/api/chat/stream/route.ts`
- [ ] Логировать полные ошибки server-side
- [ ] Клиенту — только generic сообщение
- [ ] Никогда не отдавать стектрейсы, структуру БД, API-ключи

### Тесты:
- `pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Логин админки работает с новым bcrypt-паролем
- [ ] Старый пароль НЕ работает
- [ ] 6-я попытка → rate limit
- [ ] Ошибка AI чата → нет стектрейса в ответе
- [ ] `git ls-files .env` → пусто
- [ ] Сессия админки истекает через 2 часа

---

## Phase 8: High-Priority Security

### 8.1: CSRF защита admin API (Audit 2.4)
**Файлы:** `apps/admin/app/api/admin/*/route.ts`
- [ ] CSRF-токен в сессии, валидация через `x-csrf-token` header

### 8.2: Валидация TipTap контента (Audit 2.5)
**Файлы:** `packages/api/src/routers/document.ts`, `note.ts`
- [ ] Строгий `tipTapContentSchema` с whitelist нод и marks
- [ ] Убрать `as unknown as Prisma.InputJsonValue`

### 8.3: WebSocket auth (Audit 2.6)
**Файлы:** `apps/collab/src/auth.ts`, `index.ts`
- [ ] Ре-валидация сессии каждые 5 минут
- [ ] Отключение при отзыве прав
- [ ] Rate limiting WS-сообщений

### 8.4: CORS cleanup (Audit 2.8)
**Файл:** `packages/api/src/auth.ts`
- [ ] Убрать HTTP и IP origins
- [ ] Оставить только `https://script.yomimovie.art` + `http://localhost:3001` в dev

### Тесты:
- `pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] POST admin API без CSRF → 403
- [ ] POST с валидным CSRF → 200
- [ ] Документ с malicious node type → отфильтрован
- [ ] WS после отзыва сессии → отключение в течение 5 мин
- [ ] CORS: запрос с неизвестного origin → blocked

---

## Phase 9: Medium Security

### 9.1: CSP и security headers (Audit 2.10)
**Файл:** `apps/web/middleware.ts`
- [ ] `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`

### 9.2: Audit logging (Audit 2.9)
**Файлы:** `packages/api/src/routers/` (member, project, document)
- [ ] Использовать `ActivityLog` модель
- [ ] Логировать: invite/remove member, change role, delete project

### Тесты:
- `pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Заголовки CSP, X-Frame-Options, X-Content-Type-Options в ответе
- [ ] Invite member → запись в ActivityLog
- [ ] Remove member → запись в ActivityLog
- [ ] Delete project → запись в ActivityLog

---

# PART D: БИЗНЕС-ЛОГИКА (АУДИТ)

---

## Phase 10: Critical Business Logic

### 10.1: Soft-deleted документы доступны через AI (Audit 4.1)
**Файл:** `packages/api/src/routers/ai.ts`
- [ ] `deletedAt: null` во ВСЕХ запросах документов

### 10.2: Episode hard delete → soft delete (Audit 4.2)
**Файл:** `packages/api/src/routers/episode.ts`
- [ ] `deletedAt DateTime?` на Episode
- [ ] `prisma.episode.delete()` → `update({ deletedAt: new Date() })`
- [ ] Фильтр `deletedAt: null` в list

### 10.3: Draft restore в удалённый документ (Audit 4.3)
**Файл:** `packages/api/src/routers/draft.ts`
- [ ] Проверка `document.deletedAt === null` в `restore()`

### 10.4: COMMENTER удаляет треды (Audit 4.4)
**Файл:** `packages/api/src/routers/comment.ts`
- [ ] Delete thread только для OWNER/EDITOR

### Тесты:
- `pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Soft-delete документ → AI rewrite → 404/ошибка
- [ ] Удалить эпизод → soft-deleted (не hard)
- [ ] Восстановить эпизод → возвращается
- [ ] Soft-delete документ → draft restore → rejected
- [ ] COMMENTER → delete thread → 403
- [ ] EDITOR → delete thread → работает

---

## Phase 11: Medium Business Logic

### 11.1: Race condition sortOrder (Audit 4.5)
- [ ] Транзакция + `MAX(sortOrder) + 1`

### 11.2: Unique constraint Draft.number (Audit 4.6)
- [ ] `@@unique([documentId, number])` + миграция

### 11.3: CommentMessage.author onDelete (Audit 4.7)
- [ ] `onDelete: SetNull`, nullable `authorId`

### 11.4: Оценка токенов из API (Audit 4.8)
- [ ] Использовать token count из ответа провайдера вместо `/4`

### Тесты:
- `pnpm db:generate && pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Создание двух документов одновременно → нет коллизии sortOrder
- [ ] Создание двух draft одновременно → unique constraint
- [ ] API usage logs → токены из ответа API (не `/4`)

---

# PART E: КАЧЕСТВО КОДА (АУДИТ)

---

## Phase 12: Code Quality Fixes

### 12.1: Silent failures в logApiUsage (Audit 3.1)
- [ ] `.catch(() => {})` → `.catch((err) => console.error('Usage log failed:', err))` (~16 мест)

### 12.2: Потеря контекста ошибок (Audit 3.2)
- [ ] Логировать оригинальную ошибку перед re-throw

### 12.3: Убрать `as any` / `as unknown` (Audit 3.3)
- [ ] Типизированные интерфейсы, Zod `.parse()`

### 12.4: Выделить access check helper (Audit 3.4)
- [ ] `assertProjectAccess(projectId, userId)` — заменить ~10 дублей

### 12.5: Batch operation error handling (Audit 3.6)
- [ ] `generateAllSceneSynopses`: `{ result: string; error?: string }` вместо пустой строки

### Тесты:
- `pnpm test:ai && pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Неудачная AI-операция → ошибка залогирована server-side с stack trace
- [ ] Нет `as any` предупреждений
- [ ] Batch synopses с плохой сценой → error returned (не пустая строка)

---

# PART F: UX/UI (АУДИТ + ПОЛЬЗОВАТЕЛЬСКИЕ)

---

## Phase 13: UX/UI Fixes

### 13.1: Safari баги + светлая тема (Пользовательское)
- [ ] Аудит CSS для Safari (-webkit, flexbox gaps)
- [ ] Фикс light theme CSS переменных (контрастность)
- [ ] Кнопка печати: контраст в светлой теме

### 13.2: Accessibility (Audit 5.1)
- [ ] `aria-label` на все icon-only кнопки
- [ ] Focus management в модалках (focus trap)
- [ ] Keyboard navigation для меню

### 13.3: Мобильная адаптация (Audit 5.2)
- [ ] Мобильные breakpoints (<1024px)
- [ ] Коллапсируемый sidebar
- [ ] Tab-based switching на мобильных

### 13.4: not-found.tsx + loading.tsx (Audit 5.3)
- [ ] Friendly 404 + skeleton loaders

### 13.5: Empty states (Audit 5.8)
- [ ] Пустые состояния для outline, versions, entities панелей

### Тесты:
- `pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Safari → нет багов layout
- [ ] Светлая тема → все элементы видны с хорошим контрастом
- [ ] Print preview в светлой теме → нет серого на белом
- [ ] Tab через все элементы → focus виден
- [ ] Мобильный (<768px) → юзабельный layout
- [ ] Невалидный URL → friendly 404
- [ ] Навигация → skeleton loader
- [ ] Пустые панели → empty state

---

## Phase 14: Medium UX/UI

### 14.1: Разбить крупные компоненты (Audit 5.4)
- [ ] `chat-panel.tsx` (818 строк): вынести ModelSelector, InsertButton, ChatBubble
- [ ] `selection-toolbar.tsx` (628 строк): вынести мутации в hooks

### 14.2: Window events → Context (Audit 5.5)
- [ ] `SuggestionContext`, `ChatModelContext` вместо `window.dispatchEvent()`

### 14.3: Client-side form validation (Audit 5.6)
- [ ] Zod-валидация + field-level ошибки

### 14.4: i18n hardcoded строки (Audit 5.7)
- [ ] Перенести в `ru.json`, заменить на `t()`

### Тесты:
- `pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Chat panel работает после рефакторинга
- [ ] Selection toolbar format/rewrite работает
- [ ] Events корректно передаются через Context
- [ ] Sign-in с невалидным email → field-level ошибка
- [ ] Весь текст UI из переводов

---

# PART G: ПРОИЗВОДИТЕЛЬНОСТЬ (АУДИТ)

---

## Phase 15: Performance Fixes

### 15.1: PostgreSQL FTS (Audit 6.1 / 3.5)
- [ ] `contentText String?` на Document + GIN индекс
- [ ] `to_tsvector`/`to_tsquery` вместо in-memory фильтрации

### 15.2: Dynamic imports (Audit 6.3)
- [ ] D3 компоненты через `dynamic(() => import(...), { ssr: false })`

### 15.3: AI call timeouts (Audit 6.4)
- [ ] `AbortSignal.timeout(60_000)` + `AbortSignal.any()`

### 15.4: Debounce Yjs persistence (Audit 6.2)
- [ ] Debounce 5-10с, force write при disconnect

### 15.5: Недостающие индексы (Audit 6.5)
- [ ] `User.createdAt`, `ChatMessage.userId`, `CommentMessage.authorId`, `ActivityLog.userId`, `DocumentRevision.createdBy`

### 15.6: N+1 в access checks (Audit 6.6)
- [ ] Include `members` в основной project query

### 15.7: Оптимизация изображений (Audit 6.8)
- [ ] `yomi.png` (709KB) → WebP + `next/image`

### Тесты:
- `pnpm db:generate && pnpm type-check && pnpm build`

### Ручной чеклист:
- [ ] Поиск по документам → результаты (FTS работает)
- [ ] Поиск < 500мс
- [ ] Knowledge Graph → D3 загружается динамически
- [ ] AI вызов с недоступным провайдером → timeout 60с (не бесконечный)
- [ ] Быстрое редактирование → DB writes пакетные (не на каждый keystroke)
- [ ] Размер бандла: до/после dynamic imports

---

# PART H: БЭКЛОГ (Будущее)

| # | Задача | Audit Ref | Заметки |
|---|--------|-----------|---------|
| 1 | Redis rate limiter | 2.7 | Заменить in-memory Map |
| 2 | Hocuspocus Redis adapter | 6.7 | Горизонтальное масштабирование |
| 3 | APM мониторинг | — | Production observability |

---

# Порядок реализации

| # | Фаза | Описание | Приоритет |
|---|------|----------|-----------|
| 1 | Phase 1 | Заметки не сохраняются | CRITICAL BUG |
| 2 | Phase 3 | Валидация синопсиса | CRITICAL BUG |
| 3 | Phase 7 | Критическая безопасность | CRITICAL SECURITY |
| 4 | Phase 10 | Критическая бизнес-логика | CRITICAL LOGIC |
| 5 | Phase 2 | Фиксы экспорта | HIGH BUG |
| 6 | Phase 12 | Качество кода | HIGH QUALITY |
| 7 | Phase 8 | High-priority безопасность | HIGH SECURITY |
| 8 | Phase 4 | Map-Reduce для AI | HIGH FEATURE |
| 9 | Phase 5 | Format All | HIGH FEATURE |
| 10 | Phase 6 | Scene board фиксы | MEDIUM FEATURE |
| 11 | Phase 11 | Medium бизнес-логика | MEDIUM LOGIC |
| 12 | Phase 9 | Medium безопасность | MEDIUM SECURITY |
| 13 | Phase 15 | Производительность | MEDIUM PERF |
| 14 | Phase 13 | Safari, светлая тема, a11y, мобайл | MEDIUM UX |
| 15 | Phase 14 | Рефакторинг, i18n, валидация форм | LOW UX |

---

> **Следующий шаг:** Phase 1 (Notes Not Saving)
> **Pipeline после каждой фазы:** `pnpm test:ai && pnpm type-check && pnpm build` + ручная проверка
