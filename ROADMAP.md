# ROADMAP — AI Screenwriting Workspace

## Обзор фаз

| Фаза | Что делаем | Статус |
|------|-----------|--------|
| **Phase 1** | Repo + Auth + Project CRUD + Basic TipTap | ✅ Done |
| **Phase 2** | Screenplay nodes + Scene navigator | ✅ Done |
| **Phase 3** | Comments system | ⬜ Next |
| **Phase 4** | AI operations + Suggestion system | ⬜ |
| **Phase 5** | AI Chat + Pins + Bible | ⬜ |
| **Phase 6** | Outline + Versioning + Performance tuning | ⬜ |

---

## Phase 1 — Foundation ✅

### Что сделано
- Monorepo (pnpm + Turborepo)
- PostgreSQL на Neon
- Better Auth (email/password)
- tRPC v11 роутеры (project CRUD, document save)
- TipTap StarterKit + autosave (2s debounce)
- 3-panel workspace layout
- Dashboard с проектами

### Чеклист ручной проверки

- [ ] **Регистрация**: `/sign-up` → создаёт пользователя, редиректит на `/dashboard`
- [ ] **Вход**: `/sign-in` → логин работает, session cookie ставится
- [ ] **Logout**: кнопка "Sign out" → возвращает на `/sign-in`
- [ ] **Создание проекта**: "New Project" → появляется карточка в dashboard
- [ ] **Открытие проекта**: клик по карточке → workspace с 3 панелями
- [ ] **Редактор**: набрать текст → появляется "Saving..." → "Saved"
- [ ] **Persistence**: перезагрузить страницу → текст на месте
- [ ] **Удаление проекта**: кнопка "Delete" → проект исчезает
- [ ] **Защита роутов**: открыть `/dashboard` без авторизации → редирект на `/sign-in`
- [x] **Toolbar**: Bold, Italic, H1, H2, List, Quote — ⚠️ НЕ РАБОТАЕТ (известный баг, будет переделан в Phase 2)
- [ ] **Resizable panels**: перетащить границы между панелями

### Какие правки допустимы на этой фазе

**Можно:**
- Фиксить баги auth/CRUD/autosave
- Подкручивать стили (отступы, цвета, шрифты)
- Улучшать loading/error states
- Добавлять валидацию форм (min length пароля, etc.)
- Менять дизайн auth-страниц и dashboard-карточек

**Не стоит:**
- Добавлять screenplay-ноды (это Phase 2)
- Реализовывать комментарии (Phase 3)
- Подключать AI (Phase 4-5)
- Менять схему БД под будущие фичи — делаем миграции в своих фазах

---

## Phase 2 — Screenplay Editor

### Цель
Превратить базовый TipTap-редактор в профессиональный сценарный редактор американского формата.

### Задачи

#### 2.1 Screenplay Node Types
Создать кастомные TipTap-ноды в `packages/editor/src/extensions/nodes/`:

| Node | Пример | Стиль |
|------|--------|-------|
| `sceneHeading` | `INT. OFFICE – DAY` | CAPS, underline |
| `action` | `Паша входит в комнату.` | Обычный текст, полная ширина |
| `character` | `ПАША` | CAPS, центрирован |
| `dialogue` | `Привет, это я.` | Узкая колонка, центрирована |
| `parenthetical` | `(тихо)` | Курсив, в скобках, центр |
| `transition` | `CUT TO:` | CAPS, выравнивание по правому краю |

#### 2.2 Keyboard Behavior
- **Enter после sceneHeading** → `action`
- **Enter после character** → `dialogue`
- **Enter после dialogue** → `character`
- **Enter на пустом блоке** → `action` (сброс)
- **Tab** → цикл переключения типа блока
- **Double Enter** → выход в `action`

#### 2.3 Auto-conversion (Input Rules)
- Ввод `INT.` или `EXT.` в начале строки → автоконверт в `sceneHeading`
- Ввод `CUT TO:` → автоконверт в `transition`
- Ввод `FADE IN:` → автоконверт в `transition`

#### 2.4 Scene Navigator
- Боковая панель: список всех `sceneHeading` из документа
- Клик по заголовку → скролл к сцене
- Нумерация сцен (Scene 1, Scene 2, ...)
- Реалтайм обновление при редактировании

#### 2.5 Screenplay CSS
- Courier Prime 12pt для всех блоков
- Правильные отступы по стандарту (action — 1.5", dialogue — 2.5", character — 3.7")
- Межстрочный интервал
- Размер страницы US Letter (для print preview)

### Файлы для создания/изменения

```
packages/editor/src/extensions/nodes/
  scene-heading.ts        # Нода sceneHeading
  action.ts               # Нода action
  character.ts            # Нода character
  dialogue.ts             # Нода dialogue
  parenthetical.ts        # Нода parenthetical
  transition.ts           # Нода transition

packages/editor/src/extensions/
  screenplay-kit.ts       # Бандл всех screenplay-нод
  input-rules.ts          # Автоконверсии (INT., CUT TO:)
  keyboard-shortcuts.ts   # Enter/Tab поведение

packages/editor/src/components/
  Editor.tsx              # Обновить: подключить screenplay extensions
  EditorToolbar.tsx       # Обновить: dropdown с типами блоков

apps/web/components/workspace/
  scene-navigator.tsx     # Новый: панель навигации по сценам
  workspace-sidebar.tsx   # Обновить: встроить scene navigator
```

### Миграции БД
Не требуются. Document.content хранит JSON — новые типы нод сохраняются автоматически.

### Чеклист ручной проверки

- [ ] Напечатать `INT. OFFICE – DAY` → автоконверт в sceneHeading (всё caps)
- [ ] Enter после sceneHeading → курсор в action-блоке
- [ ] Набрать имя CAPS, Enter → появляется dialogue-блок
- [ ] Enter после dialogue → новый character-блок
- [ ] Tab переключает тип текущего блока
- [ ] `CUT TO:` → автоконверт в transition (правый край)
- [ ] Scene Navigator: отображает все сцены с номерами
- [ ] Клик по сцене в навигаторе → скролл к ней
- [ ] Добавить новую сцену → она появляется в навигаторе
- [ ] Удалить сцену → исчезает из навигатора
- [ ] Стиль: Courier Prime, правильные отступы по стандарту
- [ ] Сохранение: screenplay-ноды сохраняются и загружаются корректно
- [ ] Toolbar: dropdown с выбором типа блока работает
- [ ] Пустой Enter дважды → сброс в action

### Какие правки допустимы на этой фазе

**Можно:**
- Тюнить отступы и шрифты под стандарт
- Менять keyboard shortcuts
- Добавлять новые input rules (FADE OUT:, SMASH CUT TO:, etc.)
- Улучшать scene navigator (поиск, фильтрация)
- Добавлять print preview / export в PDF

**Не стоит:**
- Добавлять comments-систему (Phase 3)
- Подключать AI (Phase 4)
- Реализовывать drag & drop сцен (Phase 6 — Outline)

---

## Phase 3 — Comments System

### Цель
Система комментариев, привязанных к тексту сценария.

### Задачи

#### 3.1 Prisma Schema Updates
```prisma
model CommentThread {
  id          String   @id @default(cuid())
  documentId  String
  anchorFrom  Int          // ProseMirror position start
  anchorTo    Int          // ProseMirror position end
  anchorBlockId String?    // Stable block reference
  resolved    Boolean  @default(false)
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  document  Document  @relation(...)
  createdBy User      @relation(...)
  messages  CommentMessage[]
}

model CommentMessage {
  id        String   @id @default(cuid())
  threadId  String
  authorId  String
  content   String
  createdAt DateTime @default(now())

  thread CommentThread @relation(...)
  author User          @relation(...)
}
```

#### 3.2 TipTap Comment Marks
- Mark `comment` — подсветка текста с привязкой к threadId
- Highlight цвет для активного комментария
- Клик по подсвеченному тексту → фокус на тред в правой панели

#### 3.3 Right Panel: Comments Tab
- Список тредов, отсортированных по позиции в документе
- Создание нового треда (выделить текст → "Add Comment")
- Ответы в треде
- Resolve/Unresolve
- Фильтр: All / Open / Resolved

#### 3.4 tRPC Роутеры
```
commentThread.create      — создать тред (с anchor positions)
commentThread.list        — все треды документа
commentThread.resolve     — пометить как resolved
commentMessage.create     — добавить сообщение в тред
```

### Файлы для создания/изменения

```
packages/db/prisma/schema.prisma        # Добавить CommentThread, CommentMessage
packages/api/src/routers/comment.ts     # Новый роутер
packages/api/src/root.ts                # Подключить comment роутер

packages/editor/src/extensions/
  comment-mark.ts                       # TipTap mark для комментариев

apps/web/components/workspace/
  right-panel.tsx                       # Обновить: реальная Comments tab
  comment-thread.tsx                    # Новый: компонент треда
  comment-form.tsx                      # Новый: форма создания
```

### Чеклист ручной проверки

- [ ] Выделить текст → кнопка "Add Comment" появляется
- [ ] Создать комментарий → текст подсвечивается, тред в правой панели
- [ ] Ответить в тред → сообщение появляется
- [ ] Resolve тред → подсветка меняется / исчезает
- [ ] Клик по подсвеченному тексту → фокус на тред в панели
- [ ] Несколько тредов → правильный порядок (по позиции)
- [ ] Удалить текст с комментарием → тред помечается как orphaned
- [ ] Другой пользователь (другая роль) → может видеть / не может комментировать
- [ ] Фильтр Open/Resolved работает
- [ ] Комментарии сохраняются после перезагрузки

### Какие правки допустимы на этой фазе

**Можно:**
- Менять дизайн тредов
- Добавлять mentions (@user)
- Добавлять emoji-реакции
- Тюнить anchor-логику (устойчивость к редактированию)

**Не стоит:**
- Интегрировать AI в комментарии (Phase 4-5)
- Добавлять context pins (Phase 5)

---

## Phase 4 — AI Operations + Suggestion System

### Цель
Подключить AI для генерации правок, которые пользователь принимает или отклоняет через suggestion layer.

### Ключевой принцип
> AI никогда не переписывает документ целиком. AI возвращает только операции (patches). Любое изменение проходит через suggestion layer.

### Задачи

#### 4.1 BYOK — Provider System
```
packages/ai/
  src/
    providers/
      openai.ts          # OpenAI adapter
      anthropic.ts       # Claude adapter
      base.ts            # Общий интерфейс
    index.ts
```

Пользователь вводит свой API key в настройках проекта. Key шифруется в БД.

#### 4.2 Prisma Schema Updates
```prisma
model AIProvider {
  id          String @id @default(cuid())
  projectId   String
  provider    String     // "openai" | "anthropic"
  apiKey      String     // encrypted
  model       String     // "gpt-4" | "claude-sonnet"
  ...
}

model Suggestion {
  id           String @id @default(cuid())
  documentId   String
  createdById  String
  instruction  String
  status       SuggestionStatus  // PENDING | APPLIED | REJECTED
  operations   Json               // Array of patch operations
  baseVersionId String?
  ...
}

enum SuggestionStatus {
  PENDING
  APPLIED
  REJECTED
}
```

#### 4.3 Suggestion Flow (Rewrite Selection)
1. Пользователь выделяет текст, вызывает "Rewrite" (⌘K или кнопка)
2. Frontend отправляет: `{ selection, instruction, contextPolicy }`
3. Backend: собирает контекст → вызывает AI → валидирует операции
4. Frontend показывает diff preview (inline, с зелёным/красным)
5. Пользователь: **Apply** (применяет) или **Reject** (отклоняет)

#### 4.4 TipTap Suggestion Extension
- Декорации для отображения diff (deletions + insertions)
- Accept/Reject UI (inline кнопки или панель)
- Подсветка pending suggestions

#### 4.5 Validation
Backend проверяет:
- Позиции валидны
- Операции в пределах selection
- Допустимые типы блоков
- Размер изменений ограничен

### Файлы для создания

```
packages/ai/                            # Новый пакет
  src/providers/base.ts
  src/providers/openai.ts
  src/providers/anthropic.ts
  src/index.ts

packages/db/prisma/schema.prisma        # AIProvider, Suggestion

packages/api/src/routers/
  ai.ts                                 # AI-операции
  suggestion.ts                         # CRUD suggestions

packages/editor/src/extensions/
  suggestion-decoration.ts              # Diff preview декорации

apps/web/components/workspace/
  ai-toolbar.tsx                        # ⌘K меню
  suggestion-preview.tsx                # Inline diff
  provider-settings.tsx                 # Настройка API keys
```

### Чеклист ручной проверки

- [ ] Настроить API key в project settings → ключ сохраняется (зашифрованный)
- [ ] Выделить текст → ⌘K → ввести инструкцию → AI генерирует suggestion
- [ ] Diff preview: видно что удалено (красным) и что добавлено (зелёным)
- [ ] Apply → текст обновляется, suggestion.status = APPLIED
- [ ] Reject → текст не меняется, suggestion.status = REJECTED
- [ ] Невалидная операция (за пределами selection) → 422 ошибка
- [ ] AI timeout → graceful error, не ломает документ
- [ ] Без API key → понятное сообщение "Configure AI provider first"
- [ ] Несколько suggestions подряд → каждый отображается корректно

### Какие правки допустимы на этой фазе

**Можно:**
- Добавлять новых AI-провайдеров
- Тюнить промпты
- Улучшать diff preview (word-level vs line-level)
- Добавлять "Undo" для applied suggestions
- Настраивать rate limiting

**Не стоит:**
- Делать AI Chat (Phase 5)
- Добавлять RAG (Phase 5)
- Реализовывать Bible/Pins (Phase 5)

---

## Phase 5 — AI Chat + Pins + Bible

### Цель
Полноценный AI-ассистент с контекстом проекта.

### Задачи

#### 5.1 AI Chat (Right Panel)
- Чат с AI в правой панели
- Стриминг ответов
- Поддержка actions:
  - "Convert to scene" → генерирует insertBlocks операции
  - "Update character" → генерирует updateEntity операции
- История чата привязана к проекту

#### 5.2 Project Bible
- Отдельный документ-справочник проекта
- Редактируется вручную или через AI patches
- Всегда включается в AI-контекст

#### 5.3 Context Pins
- Пользователь выделяет текст/комментарий → "Pin to context"
- Pins автоматически включаются в каждый AI-запрос
- Управление списком (добавить, удалить, приоритет)

#### 5.4 AI Context Architecture
Слои контекста (по приоритету):
1. Project Bible (всегда)
2. Context Pins (всегда)
3. Selection + local window (текущая сцена)
4. Retrieved chunks (RAG — semantic search)

#### 5.5 RAG Flow
- Индексация: сцены, notes, bible, entities
- Semantic search при AI-запросе
- TopK chunks включаются в prompt

### Prisma Schema Additions
```prisma
model ChatMessage { ... }
model ProjectBible { ... }
model ContextPin { ... }
model RAGChunk { ... }    // embeddings + content
```

### Чеклист ручной проверки

- [ ] AI Chat: написать сообщение → получить стриминг-ответ
- [ ] "Convert to scene" → preview вставки → Apply → сцена в документе
- [ ] "Update character" → preview изменений → Apply → entity обновлён
- [ ] Bible: создать/редактировать → отображается в контексте
- [ ] Pin текст → появляется в Context tab → включён в AI запросы
- [ ] Удалить pin → исчезает из контекста
- [ ] RAG: AI находит релевантные куски из других сцен
- [ ] Chat history сохраняется между сессиями
- [ ] Без API key → chat disabled с сообщением

### Какие правки допустимы на этой фазе

**Можно:**
- Тюнить контекстное окно (сколько текста включать)
- Менять embedding-модель
- Добавлять shortcuts для частых AI-команд
- Улучшать стриминг UI

**Не стоит:**
- Реализовывать real-time collaboration (Post-MVP)
- Добавлять outline/drag-drop (Phase 6)

---

## Phase 6 — Outline + Versioning + Performance

### Цель
Завершить MVP: outline для визуального управления структурой, версионность, оптимизация производительности.

### Задачи

#### 6.1 Outline / Corkboard
- Сцены отображаются как карточки
- Drag & drop для изменения порядка
- При перетаскивании обновляется нумерация
- Создаётся новая версия

#### 6.2 Versioning
- Автоматическое создание версий:
  - Apply suggestion
  - Массовое редактирование
  - Manual save (⌘S)
  - Reorder scenes
- Restore flow: выбрать версию → Restore → новая версия-копия
- Diff между версиями

#### 6.3 Entities CRUD
- Characters: карточка с описанием, traits
- Locations: описание, linked scenes
- Terms: глоссарий проекта

#### 6.4 Performance
- До 300 страниц без деградации
- <200ms editor latency
- Виртуализация больших документов
- Lazy loading versions
- Оптимизация запросов (joins, indexes)

### Prisma Schema Additions
```prisma
model Version { ... }
model Character { ... }
model Location { ... }
model Term { ... }
```

### Чеклист ручной проверки

- [ ] Outline: все сцены видны как карточки
- [ ] Drag & drop → порядок меняется → нумерация обновлена
- [ ] Создать персонажа → появляется в Characters sidebar
- [ ] Manual save (⌘S) → новая версия в списке
- [ ] Versions tab: список всех версий с timestamps
- [ ] Restore версию → новая копия → документ откатился
- [ ] Diff между версиями: видно что изменилось
- [ ] 300-страничный документ → editor не лагает (<200ms)
- [ ] Lazy loading: версии подгружаются по запросу

### Какие правки допустимы на этой фазе

**Можно:**
- Всё что входит в MVP scope
- Performance-оптимизации
- UX-улучшения

**После Phase 6 → MVP готов.**

---

## Post-MVP (будущее)

- Real-time collaboration (Yjs)
- Full track changes
- Production breakdown
- FDX export
- Writers room mode
- AI continuity checker
- Multi-episode arc tracking

---

## Общие правила по фазам

1. **Не забегать вперёд** — каждая фаза должна быть стабильна перед переходом к следующей
2. **Миграции БД** — только в своей фазе, не добавлять таблицы "на будущее"
3. **Тесты** — после каждой фазы ручная проверка по чеклисту
4. **Коммиты** — атомарные коммиты по задачам, не один гигантский коммит на фазу
5. **Правки** — если нашёл баг в предыдущей фазе, чини сразу, не копи
