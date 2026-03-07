# Полная ревизия проекта Script Workspace

**Дата:** 2026-03-06
**Аудитор:** Claude Code (Opus 4.6)
**Версия проекта:** commit `c50306e` (master)

---

## Оглавление

1. [Общая оценка](#1-общая-оценка)
2. [Безопасность](#2-безопасность)
3. [Качество кода](#3-качество-кода)
4. [Бизнес-логика и целостность данных](#4-бизнес-логика-и-целостность-данных)
5. [UX/UI и фронтенд](#5-uxui-и-фронтенд)
6. [Производительность](#6-производительность)
7. [Приоритизированный план действий](#7-приоритизированный-план-действий)

---

## 1. Общая оценка

| Направление | Оценка | Комментарий |
|-------------|--------|-------------|
| Безопасность | 4/10 | Критические уязвимости: секреты в git, слабая admin-авторизация |
| Качество кода | 7/10 | Хорошая структура, но silent failures и `as any` кастинги |
| Бизнес-логика | 6/10 | Неполная реализация soft delete, race conditions |
| UX/UI | 6/10 | Хороший editor UX, но нет мобильной версии и accessibility |
| Производительность | 6/10 | N+1 запросы, in-memory поиск, нет dynamic imports |

**Общий вердикт:** Проект функционален и имеет хорошую архитектуру, но содержит **критические проблемы безопасности**, которые требуют немедленного исправления. Бизнес-логика требует доработки для consistency.

---

## 2. Безопасность

### 🔴 CRITICAL

#### 2.1 Секреты в репозитории
**Файлы:** `.env`, `apps/web/.env`

Продакшн-секреты (DATABASE_URL, BETTER_AUTH_SECRET, AI_ENCRYPTION_SECRET, ADMIN_LOGIN/PASSWORD) находятся в `.env` файлах, которые могут быть в git-истории.

**Риск:** Полная компрометация БД, admin-панели, AI-ключей.

**Решение:**
- Немедленно ротировать ВСЕ секреты
- Очистить git-историю: `git filter-branch --tree-filter 'rm -f .env apps/web/.env' -- --all`
- Использовать secret management (GitHub Secrets, Vault)

---

#### 2.2 Слабая admin-авторизация
**Файл:** `apps/admin/lib/auth.ts`

- Пароль сравнивается в plaintext (без bcrypt) — timing attack
- Fallback на хардкоженный секрет `"admin-fallback-secret"`
- Нет rate limiting на логин
- Нет механизма инвалидации сессий
- Сессия живёт 7 дней (слишком долго для admin)

**Решение:**
```typescript
// Использовать bcrypt для хеширования
import bcrypt from 'bcryptjs';
export async function validateCredentials(login: string, password: string) {
  if (login !== process.env.ADMIN_LOGIN) return false;
  return bcrypt.compare(password, HASHED_PASSWORD);
}
// Сократить TTL до 2 часов, sameSite: "strict"
```

---

#### 2.3 Утечка информации в ошибках
**Файл:** `apps/web/app/api/chat/stream/route.ts:226`

Regex-санитизация (`sk-|Api-Key|Bearer`) ненадёжна. Ошибки БД, стектрейсы, структура таблиц могут утечь клиенту.

**Решение:** Логировать ошибки server-side, клиенту отдавать только generic сообщения.

---

### 🟠 HIGH

#### 2.4 Нет CSRF-защиты на admin API
**Файлы:** `apps/admin/app/api/admin/keys/route.ts`, `models/route.ts`, `users/route.ts`

POST/DELETE эндпоинты проверяют только сессию, но не CSRF-токен. Атакующий может заставить авторизованного админа выполнить нежелательные действия.

**Решение:** Добавить CSRF-токен в заголовок `x-csrf-token`.

---

#### 2.5 Недостаточная валидация TipTap контента
**Файлы:** `packages/api/src/routers/document.ts:197`, `note.ts:121`

Контент сохраняется как `as unknown as Prisma.InputJsonValue` — обход Zod-валидации. Потенциальный stored XSS через crafted JSON.

**Решение:** Строгая whitelist-валидация типов нод и marks в `tipTapContentSchema`.

---

#### 2.6 WebSocket авторизация
**Файлы:** `apps/collab/src/auth.ts`, `permissions.ts`

- Сессия проверяется один раз при подключении, далее — никогда
- Нет отключения при отзыве прав
- Нет rate limiting на WS-сообщения
- Нет таймаута idle-соединений

**Решение:** Периодическая ре-валидация (каждые 5 мин), rate limiting WS-сообщений.

---

#### 2.7 In-memory rate limiter
**Файл:** `apps/web/app/api/chat/stream/route.ts:20-31`

Rate limiter на Map — сбрасывается при рестарте, не работает между PM2 инстансами. 10 req/min — хорошо, но не защищает от burst.

**Решение:** Redis-based distributed rate limiter.

---

### 🟡 MEDIUM

#### 2.8 CORS с HTTP и IP-адресами
**Файл:** `packages/api/src/auth.ts`

`defaultOrigins` содержит `http://164.90.224.171:3001/3002` — HTTP в проде, IP вместо домена.

**Решение:** В проде использовать только HTTPS + домен.

---

#### 2.9 Нет audit logging на sensitive операции
Нет логирования: invite/remove member, change role, delete project, permanent delete document.

**Решение:** Добавить AuditLog для всех мутаций, меняющих доступ.

---

#### 2.10 Нет CSP headers
Нет Content-Security-Policy, X-Frame-Options, X-Content-Type-Options.

**Решение:** Добавить в Next.js middleware.

---

## 3. Качество кода

### 🟠 HIGH

#### 3.1 Silent failures в логировании API usage
**Файл:** `packages/api/src/routers/ai.ts` — 16+ мест

```typescript
logApiUsage({...}).catch(() => {});
```

Все ошибки записи usage в БД проглатываются. Биллинг/мониторинг могут быть неточными.

**Решение:** `.catch((err) => console.error('Usage log failed:', err))`

---

#### 3.2 Потеря контекста ошибок
**Файл:** `packages/api/src/routers/ai.ts`

Все AI-ошибки оборачиваются в generic `INTERNAL_SERVER_ERROR`, теряя оригинальный стектрейс.

**Решение:** Логировать оригинальную ошибку перед re-throw.

---

### 🟡 MEDIUM

#### 3.3 Избыточные `as any` / `as unknown`
**Места:**
- `ai.ts:222` — `operations: result.blocks as any`
- `ai.ts:675` — `data: { knowledgeGraph: result as any }`
- `bible.ts:93` — `content: input.content as unknown as Prisma.InputJsonValue`
- `export.ts:53` — `as Record<string, unknown>`

**Решение:** Создать типизированные интерфейсы для JSON-структур, валидировать через Zod.

---

#### 3.4 Повторяющийся паттерн проверки доступа
В ~10 роутерах дублируется логика:
```typescript
OR: [
  { ownerId: userId },
  { members: { some: { userId } } },
]
```

**Решение:** Вынести в `assertProjectAccess(projectId, userId)` helper.

---

#### 3.5 Поиск фильтрует контент в памяти
**Файл:** `packages/api/src/routers/search.ts:78-92`

Загружает полный JSON-контент всех документов, парсит в JS, фильтрует `includes()`. Получает 3x больше записей, чем нужно.

**Решение:** PostgreSQL full-text search (`to_tsvector`/`to_tsquery`).

---

#### 3.6 Batch-операция проглатывает ошибки
**Файл:** `packages/api/src/routers/ai.ts:760`

```typescript
} catch { results[scene.heading] = ""; }
```

В `generateAllSceneSynopses` ошибки генерации синопсисов для отдельных сцен молча игнорируются.

**Решение:** Возвращать `{ result: string; error?: string }` для каждой сцены.

---

## 4. Бизнес-логика и целостность данных

### 🔴 CRITICAL

#### 4.1 Soft-deleted документы доступны через AI
**Файл:** `packages/api/src/routers/ai.ts:244`

`rewrite()` и `format()` не проверяют `deletedAt: null`. Можно выполнять AI-операции на удалённых документах.

**Решение:** Добавить `deletedAt: null` во все запросы документов в ai.ts.

---

### 🟠 HIGH

#### 4.2 Episode — hard delete вместо soft delete
**Файл:** `packages/api/src/routers/episode.ts:129-135`

Эпизоды удаляются через `prisma.episode.delete()` + `prisma.document.delete()` — полное удаление. Нарушает стратегию soft delete проекта.

**Решение:** Использовать `deletedAt: new Date()` для эпизодов и связанных документов.

---

#### 4.3 Можно восстановить draft в удалённый документ
**Файл:** `packages/api/src/routers/draft.ts:122-177`

`restore()` не проверяет `document.deletedAt`. Можно записать контент в soft-deleted документ.

**Решение:** Добавить проверку `deletedAt: null` на документ.

---

#### 4.4 COMMENTER может удалять треды комментариев
**Файл:** `packages/api/src/routers/comment.ts:138-178`

Создатель треда может его удалить, даже с ролью COMMENTER. По логике бизнеса COMMENTER должен только комментировать и resolve, но не delete.

**Решение:** Разрешить delete только OWNER/EDITOR.

---

### 🟡 MEDIUM

#### 4.5 Race condition при создании sortOrder
**Файлы:** `document.ts`, `pin.ts`, `bible.ts`

При одновременном создании двумя пользователями:
```
User A: findFirst(orderBy: desc) → sortOrder = 5
User B: findFirst(orderBy: desc) → sortOrder = 5
Both create with sortOrder = 6 → COLLISION
```

**Решение:** Использовать `MAX(sortOrder) + 1` в транзакции или DB sequence.

---

#### 4.6 Нет unique constraint на Draft.number
**Файл:** `packages/db/prisma/schema.prisma`

`Draft.number` не уникален в рамках документа. Race condition может создать два черновика с одинаковым номером.

**Решение:** Добавить `@@unique([documentId, number])`.

---

#### 4.7 Missing onDelete: Cascade на CommentMessage.author
**Файл:** `packages/db/prisma/schema.prisma:239`

Удаление пользователя оставляет orphaned CommentMessage записи.

**Решение:** Добавить `onDelete: Cascade` или `SetNull`.

---

#### 4.8 Оценка токенов неточная
**Файл:** `packages/api/src/usage-logger.ts`

```typescript
tokensIn: Math.ceil((input.selectedText.length + input.instruction.length) / 4)
```

Грубая оценка `/4` вместо реального подсчёта от API. Для биллинга ненадёжно.

**Решение:** Использовать token count из ответа провайдера, когда доступен.

---

## 5. UX/UI и фронтенд

### 🔴 CRITICAL

#### 5.1 Accessibility (a11y) практически отсутствует
- Только 2 aria-label во всём проекте (theme-toggle и landing-page)
- Icon-only кнопки без accessible names
- Нет фокус-менеджмента в модалках и поповерах
- Нет skip-links (кроме root layout)
- Нет keyboard trap в попапах

**Решение:** Систематически добавить aria-labels, focus management, keyboard navigation.

---

### 🟠 HIGH

#### 5.2 Нет мобильной версии
**Файл:** `apps/web/components/workspace/workspace-shell.tsx`

ResizablePanelGroup с фиксированными процентами (15% + 60% + 25%). Нет мобильных breakpoints. На экранах < 1024px интерфейс непригоден.

**Решение:** Коллапсируемый sidebar + tabs для панелей на мобильных.

---

#### 5.3 Нет not-found.tsx и loading.tsx
Отсутствуют файлы:
- `(workspace)/not-found.tsx` — при невалидном projectId/documentId показывается error boundary вместо 404
- `(workspace)/loading.tsx` — нет skeleton/spinner при навигации между роутами
- `(workspace)/project/[projectId]/loading.tsx`

**Решение:** Добавить not-found.tsx с friendly 404 и loading.tsx с skeleton.

---

### 🟡 MEDIUM

#### 5.4 Oversized компоненты
- `chat-panel.tsx` — 818 строк (ModelSelector, InsertButton, ChatBubble — выделить)
- `selection-toolbar.tsx` — 628 строк (мутации в custom hooks)

**Решение:** Разбить на отдельные файлы, вынести логику в hooks.

---

#### 5.5 Custom window events вместо Context
```typescript
window.dispatchEvent("suggestion-created")  // selection-toolbar.tsx:146
window.dispatchEvent("chat-model-override")  // chat-panel.tsx:483
```

Анти-паттерн: сложно отслеживать и тестировать.

**Решение:** Использовать React Context или callback props.

---

#### 5.6 Формы без client-side валидации
- Sign-in: нет field-level ошибок, нет валидации email формата
- Create project: `required` на title, но нет min-length
- Нет визуальной индикации обязательных полей (звёздочки)

**Решение:** Добавить Zod-валидацию на клиенте с field-level ошибками.

---

#### 5.7 Хардкоженные строки (i18n)
Есть `next-intl` с `ru.json`, но множество строк захардкожены:
- Landing page: "Профессиональная платформа..."
- Beta gate: "Вы в очереди на подключение..."
- Scene fallback: `Scene ${sceneIndex + 1}`
- Ошибки авторизации

**Решение:** Перенести все строки в messages JSON.

---

#### 5.8 Empty states не везде
Отсутствуют в: outline panel, versions panel, entities panel.

---

## 6. Производительность

### 🟠 HIGH

#### 6.1 Поиск загружает весь контент документов
**Файл:** `packages/api/src/routers/search.ts:78-92`

Загружает `content: true` (полный TipTap JSON) для всех документов, парсит рекурсивно в JS, фильтрует `includes()`.

**Решение:** PostgreSQL full-text search:
```sql
CREATE INDEX idx_document_fts ON "Document"
  USING gin(to_tsvector('russian', content_text));
```

---

#### 6.2 Dual storage sync на каждый keystroke
**Файл:** `apps/collab/src/persistence.ts:93-132`

Каждое обновление конвертирует `Y.Doc → JSON` и записывает оба поля. Конвертация дорогая, нет batching.

**Решение:** Debounce записи (каждые 5-10 секунд), конвертировать JSON асинхронно.

---

#### 6.3 Нет dynamic imports для тяжёлых библиотек
D3 (d3-drag, d3-force, d3-selection, d3-transition, d3-zoom) и Framer Motion загружаются глобально, хотя нужны только для Knowledge Graph и анимаций.

**Решение:**
```typescript
const KnowledgeGraph = dynamic(() => import('./KnowledgeGraph'), { ssr: false });
```

---

### 🟡 MEDIUM

#### 6.4 Нет таймаутов на AI-вызовы
**Файл:** `packages/ai/src/chat-stream.ts`

AbortSignal передаётся (хорошо), но нет timeout wrapper. AI-вызов может висеть бесконечно.

**Решение:** `AbortSignal.timeout(30_000)` или комбинация с user signal.

---

#### 6.5 Недостающие индексы БД
- `User.createdAt`
- `ChatMessage.userId`
- `CommentMessage.authorId`
- `ActivityLog.userId`
- `DocumentRevision.createdBy`

---

#### 6.6 N+1 в access checks
Паттерн: загружаем `project` через include, потом отдельным запросом проверяем `ProjectMember`.

**Решение:** Включить `members` в основной include с фильтром по userId.

---

#### 6.7 Collab server — single-threaded
Один Node.js процесс. Нет Redis для awareness. Нет горизонтального масштабирования.

**Решение на будущее:** Redis adapter для Hocuspocus, PM2 cluster mode.

---

#### 6.8 Изображение не оптимизировано
`apps/web/public/yomi.png` — 709 KB. Не используется `next/image`.

**Решение:** Конвертировать в WebP, использовать `<Image>` из `next/image`.

---

## 7. Приоритизированный план действий

### 🚨 НЕМЕДЛЕННО (сегодня)

| # | Задача | Файлы | Сложность |
|---|--------|-------|-----------|
| 1 | Ротировать ВСЕ секреты, очистить git-историю | `.env`, `apps/web/.env` | Low |
| 2 | Добавить `deletedAt: null` в AI-роутер | `packages/api/src/routers/ai.ts` | Low |
| 3 | Заменить plaintext admin auth на bcrypt | `apps/admin/lib/auth.ts` | Medium |

### ⚠️ ЭТА НЕДЕЛЯ

| # | Задача | Файлы | Сложность |
|---|--------|-------|-----------|
| 4 | CSRF-защита admin API | `apps/admin/app/api/admin/*/route.ts` | Medium |
| 5 | Санитизация ошибок (убрать стектрейсы из клиента) | `apps/web/app/api/chat/stream/route.ts` | Low |
| 6 | Episode: soft delete вместо hard | `packages/api/src/routers/episode.ts` | Low |
| 7 | Добавить `deletedAt: null` в draft операции | `packages/api/src/routers/draft.ts` | Low |
| 8 | Логирование вместо `.catch(() => {})` | `packages/api/src/routers/ai.ts` | Low |
| 9 | CORS: убрать HTTP и IP origins | `packages/api/src/auth.ts` | Low |

### 📋 ЭТОТ МЕСЯЦ

| # | Задача | Файлы | Сложность |
|---|--------|-------|-----------|
| 10 | Accessibility: aria-labels, focus management | `apps/web/components/` | High |
| 11 | PostgreSQL FTS вместо in-memory поиска | `packages/api/src/routers/search.ts`, Prisma schema | High |
| 12 | Dynamic imports (D3, heavy libs) | `apps/web/` | Medium |
| 13 | Мобильная адаптация workspace | `apps/web/components/workspace/` | High |
| 14 | not-found.tsx + loading.tsx | `apps/web/app/` | Low |
| 15 | Выделить access check helper | `packages/api/src/` | Medium |
| 16 | Unique constraints (Draft.number, Episode.number) | `prisma/schema.prisma` | Low |
| 17 | WS re-validation + rate limiting | `apps/collab/` | Medium |
| 18 | Audit logging для sensitive операций | `packages/api/src/routers/` | Medium |
| 19 | CSP и security headers | `apps/web/middleware.ts` | Medium |
| 20 | Timeout на AI-вызовы | `packages/ai/` | Low |

### 🔮 БЭКЛОГ

| # | Задача | Сложность |
|---|--------|-----------|
| 21 | Redis rate limiter (вместо in-memory) | High |
| 22 | Debounce Yjs persistence (batch writes) | Medium |
| 23 | Оптимизация изображений (next/image, WebP) | Low |
| 24 | Добавить недостающие DB-индексы | Low |
| 25 | Разбить крупные компоненты (ChatPanel, SelectionToolbar) | Medium |
| 26 | Client-side form validation с Zod | Medium |
| 27 | Заменить window events на Context | Medium |
| 28 | i18n: перенести хардкоженные строки в ru.json | Medium |
| 29 | Hocuspocus Redis adapter для масштабирования | High |
| 30 | APM мониторинг (production) | Medium |

---

## Статистика аудита

| Категория | Critical | High | Medium | Low | Total |
|-----------|----------|------|--------|-----|-------|
| Безопасность | 3 | 4 | 3 | 1 | 11 |
| Качество кода | 0 | 2 | 4 | 0 | 6 |
| Бизнес-логика | 1 | 3 | 4 | 0 | 8 |
| UX/UI | 1 | 2 | 4 | 0 | 7 |
| Производительность | 0 | 3 | 5 | 0 | 8 |
| **Итого** | **5** | **14** | **20** | **1** | **40** |

---

*Отчёт подготовлен на основе полного анализа кодовой базы (500+ файлов). Рекомендации учитывают продакшн-статус проекта и приоритизированы по влиянию на безопасность и пользовательский опыт.*
