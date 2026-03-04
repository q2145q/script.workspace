# ROADMAP — AI Screenwriting Workspace

## Обзор фаз

| Фаза | Что делаем | Статус |
|------|-----------|--------|
| **Phase 1** | Repo + Auth + Project CRUD + Basic TipTap | ✅ Done |
| **Phase 2** | Screenplay nodes + Scene navigator | ✅ Done |
| **Phase 3** | Comments system | ✅ Done |
| **Phase 4** | AI operations + Suggestion system | ✅ Done |
| **Phase 5** | Editor UX: Autocomplete + Scene Navigator fix | ✅ Done |
| **Phase 6** | Регистрация + Export (PDF/DOCX) + Project Settings | ✅ Done |
| **Phase 7** | AI Chat + Pins + Bible + RAG | ✅ Done |
| **Phase 8** | Драфты + Серии + Outline + Performance | ✅ Done |
| **Phase 9** | AI Enhancements (описания сцен, рецензия) | ⬜ |

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

---

## Phase 2 — Screenplay Editor ✅

### Что сделано
- 6 кастомных TipTap-нод (sceneHeading, action, character, dialogue, parenthetical, transition)
- Keyboard behavior (Enter/Tab/Shift+Tab циклы)
- Auto-conversion (INT., EXT., CUT TO:)
- Scene Navigator (боковая панель со списком сцен)
- Screenplay CSS (Courier Prime, отступы по стандарту)
- EditorToolbar с dropdown выбора типа блока

---

## Phase 3 — Comments System ✅

### Что сделано
- CommentThread + CommentMessage модели в Prisma
- TipTap comment marks с подсветкой
- Правая панель: список тредов, создание, ответы
- Resolve/Unresolve
- tRPC роутеры для комментариев

---

## Phase 4 — AI Operations + Suggestion System ✅

### Что сделано
- BYOK Provider System (OpenAI, Anthropic)
- Suggestion flow: выделение → ⌘K → инструкция → diff preview → Apply/Reject
- Suggestion decorations (green adds, red deletes)
- Undo для applied suggestions
- Project settings: AI provider configuration
- Theme toggle (light/dark mode)

---

## Phase 5 — Editor UX: Autocomplete + Scene Navigator ✅

### Что сделано
- Scene Navigator: клик по сцене → скроллит вверх видимой области (`block: 'start'`)
- Русские input rules для заголовков сцен (ИНТ., НАТ., ИНТ./НАТ., НАТ./ИНТ.)
- Autocomplete для заголовков сцен (4 фазы: тип → локация → подобъект → время суток)
- Autocomplete для имён персонажей (сбор из документа, фильтрация по вводу)
- ProseMirror plugin с handleKeyDown (ArrowUp/Down, Enter/Tab, Escape)
- AutocompleteDropdown React компонент с glass-panel стилями
- Поддержка русских и английских вариантов

### Цель
Добавить помощники при наборе сценария по аналогии с КИТ Сценарист. Сделать навигацию между сценами плавной и точной.

### Задачи

#### 5.1 Scene Navigator — Scroll Fix
- При клике на сцену в левой панели, сцена должна оказаться **перед глазами** пользователя (вверху видимой области), а не где-то ниже, требуя дополнительного скролла
- Использовать `scrollIntoView` с `block: 'start'` или аналогичный подход через ProseMirror

#### 5.2 Autocomplete для заголовков сцен (KIT-style)

Формат заголовка: `[ТИП] [ОБЪЕКТ]. [ПОДОБЪЕКТ] — [ВРЕМЯ СУТОК]`

**Тип сцены** — подсказки при начале ввода:
- `ИНТ.` (интерьер)
- `НАТ.` (натура)
- `ИНТ./НАТ.`
- `НАТ./ИНТ.`

> Также поддержать английские варианты: `INT.`, `EXT.`, `INT./EXT.`

**Объект (локация)** — выпадающий список:
- Собирается из всех ранее введённых объектов в текущем проекте
- Фильтрация по мере ввода (prefix match)
- Можно ввести новый (не из списка)

**Подобъект** — выпадающий список:
- Собирается из подобъектов, которые уже были у **данного объекта**
- Пример: если ранее было `ИНТ. ОФИС. КАБИНЕТ ДИРЕКТОРА`, то при вводе `ИНТ. ОФИС.` подсказать `КАБИНЕТ ДИРЕКТОРА`

**Время суток** — подсказки после `—`:
- `ДЕНЬ`
- `ВЕЧЕР`
- `УТРО`
- `НОЧЬ`

> Английские: `DAY`, `NIGHT`, `MORNING`, `EVENING`, `DUSK`, `DAWN`

#### 5.3 Autocomplete для имён персонажей

- Когда пользователь начинает вводить имя в блоке `character`, показывать выпадающий список из всех имён, которые уже встречались в документе
- Фильтрация по мере ввода
- Можно ввести новое имя

#### 5.4 Реализация

**Подход:** Использовать TipTap Suggestion extension или кастомный плагин ProseMirror для inline-подсказок.

**Источник данных:**
- Парсить текущий документ для сбора уникальных локаций, подобъектов и имён персонажей
- Хранить в реактивном состоянии (обновлять при изменении документа)
- Не требует отдельных таблиц в БД — данные извлекаются из контента документа

### Файлы для создания/изменения

```
packages/editor/src/extensions/
  scene-heading-autocomplete.ts    # Autocomplete для заголовков сцен
  character-autocomplete.ts        # Autocomplete для имён персонажей
  autocomplete-utils.ts            # Парсинг документа: сбор локаций, имён

packages/editor/src/components/
  AutocompleteDropdown.tsx          # UI компонент выпадающего списка

apps/web/components/workspace/
  scene-navigator.tsx               # Фикс скролла
```

### Чеклист ручной проверки

- [ ] Клик по сцене в навигаторе → сцена появляется **вверху** видимой области
- [ ] Набрать `ИНТ` → подсказка `ИНТ.` / `ИНТ./НАТ.`
- [ ] После `ИНТ. ` → выпадающий список локаций из документа
- [ ] Выбрать локацию → курсор за ней, можно ввести подобъект
- [ ] После точки подобъекта → выпадающий список подобъектов данной локации
- [ ] После `—` → подсказки времени суток (ДЕНЬ, НОЧЬ, УТРО, ВЕЧЕР)
- [ ] В блоке character → выпадающий список имён из документа
- [ ] Выбрать имя → заполняется, Enter → переход в dialogue
- [ ] Ввести новое имя (не из списка) → принимается без проблем
- [ ] Autocomplete обновляется при добавлении новых сцен/персонажей
- [ ] Autocomplete работает и с русскими, и с английскими вариантами

---

## Phase 6 — Регистрация + Export + Project Settings ✅

### Что сделано
- UserProfile модель (1:1 с User) — lastName, position, company, defaultLanguage
- Расширенная форма регистрации (имя, фамилия, должность, компания, язык)
- Страница профиля (/profile) с редактированием
- ProjectStatus enum (DRAFT, IN_PROGRESS, UNDER_REVIEW, FINAL, ARCHIVED)
- Статус в настройках проекта + бейдж на карточке в dashboard
- Export PDF через pdfkit (титульный лист, нумерация сцен/страниц, watermark)
- Export DOCX через docx (те же опции форматирования)
- Export dialog с настройками (формат, титульный лист, нумерация, бумага, watermark)
- Courier Prime шрифты встроены для PDF

### Цель
Полноценная регистрация с профилем, экспорт сценария в PDF/DOCX, расширенные настройки проекта.

### Задачи

#### 6.1 Полноценная регистрация

Расширить форму регистрации и профиль пользователя:

| Поле | Обязательно | Примечание |
|------|-------------|-----------|
| Email | ✅ | Уже есть |
| Пароль | ✅ | Уже есть |
| Имя | ✅ | Новое |
| Фамилия | ✅ | Новое |
| Должность | ✅ | Сценарист, Режиссёр, Продюсер и т.д. |
| Компания | ❌ | Опционально |
| Язык по умолчанию | ✅ | Русский / English — влияет на подсказки и UI |

**Миграция:** добавить поля в модель User (или создать UserProfile).

#### 6.2 Настройки проекта — Статус

Добавить в Project Settings возможность выставлять статус проекта:
- `ЧЕРНОВИК` / Draft
- `В РАБОТЕ` / In Progress
- `НА РЕЦЕНЗИИ` / Under Review
- `ФИНАЛ` / Final
- `АРХИВ` / Archived

Статус отображается на карточке проекта в dashboard.

#### 6.3 Экспорт в PDF и DOCX

Экспорт текущего документа с настройками:

**Настройки экспорта:**
| Опция | По умолчанию | Описание |
|-------|-------------|----------|
| Титульный лист | ✅ Вкл | Название, автор, контактная информация |
| Нумерация сцен | ❌ Выкл | Добавить номера сцен (слева) |
| Нумерация страниц | ✅ Вкл | Номер страницы в правом верхнем углу |
| Шрифт | Courier Prime | Стандартный для сценариев |
| Формат бумаги | US Letter | A4 / US Letter |
| Watermark | ❌ Выкл | Текстовый водяной знак по диагонали |

**Форматы:**
- **PDF** — готов к печати, стандартный сценарный формат
- **DOCX** — для редактирования в Word

### Файлы для создания/изменения

```
packages/db/prisma/schema.prisma        # Расширить User, добавить ProjectStatus

packages/api/src/routers/
  user.ts                               # Обновить: profile endpoints
  project.ts                            # Обновить: статус проекта
  export.ts                             # Новый: генерация PDF/DOCX

packages/export/                        # Новый пакет
  src/
    pdf-generator.ts                    # Генерация PDF (puppeteer или @react-pdf)
    docx-generator.ts                   # Генерация DOCX (docx npm package)
    templates/
      title-page.ts                     # Шаблон титульного листа
      screenplay-layout.ts             # Сценарный формат страницы

apps/web/components/
  auth/
    sign-up-form.tsx                    # Обновить: новые поля
  settings/
    profile-settings.tsx                # Новый: редактирование профиля
  workspace/
    export-dialog.tsx                   # Новый: диалог настроек экспорта
  dashboard/
    project-card.tsx                    # Обновить: отображение статуса
```

### Чеклист ручной проверки

- [ ] Регистрация: все новые поля присутствуют и валидируются
- [ ] Профиль: можно редактировать имя, фамилию, должность, компанию, язык
- [ ] Язык по умолчанию влияет на подсказки в редакторе
- [ ] Статус проекта: можно выставить в настройках
- [ ] Статус отображается на карточке в dashboard
- [ ] Export PDF: скачивается файл, формат соответствует стандарту
- [ ] Export DOCX: скачивается файл, открывается в Word
- [ ] Титульный лист: название, автор → отображается (если включён)
- [ ] Нумерация сцен: номера появляются слева (если включена)
- [ ] Watermark: текст по диагонали (если включён)
- [ ] Экспорт без API key работает (не зависит от AI)

---

## Phase 7 — AI Chat + Pins + Bible + RAG ✅

### Что сделано
- AI Chat в правой панели (таб "Chat") со стримингом ответов
- SSE-стриминг через Next.js API route `/api/chat/stream` (OpenAI + Anthropic)
- Контекст чата: Bible + Pins + текущая сцена + соседние сцены + документ
- Project Bible — редактор в левой панели (переключение Script/Bible)
- Context Pins — закрепление текста для AI контекста (таб "Context")
- Pin из выделенного текста в редакторе (кнопка Pin)
- Drag-and-drop для переупорядочивания пинов
- Кастомные пины (ручной ввод)
- История чата привязана к проекту (ChatMessage модель)
- Очистка истории чата
- RAGChunk модель (подготовка к будущему vector search)
- Без API key → сообщение с ссылкой на настройки

### Цель
Полноценный AI-ассистент с контекстом проекта.

### Задачи

#### 7.1 AI Chat (Right Panel)
- Чат с AI в правой панели
- Стриминг ответов
- Поддержка actions:
  - "Convert to scene" → генерирует insertBlocks операции
  - "Update character" → генерирует updateEntity операции
- История чата привязана к проекту

#### 7.2 Project Bible
- Отдельный документ-справочник проекта
- Редактируется вручную или через AI patches
- Всегда включается в AI-контекст

#### 7.3 Context Pins
- Пользователь выделяет текст/комментарий → "Pin to context"
- Pins автоматически включаются в каждый AI-запрос
- Управление списком (добавить, удалить, приоритет)

#### 7.4 AI Context Architecture
Слои контекста (по приоритету):
1. Project Bible (всегда)
2. Context Pins (всегда)
3. Selection + local window (текущая сцена)
4. Retrieved chunks (RAG — semantic search)

#### 7.5 RAG Flow
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

---

## Phase 8 — Драфты + Серии + Outline + Performance ✅

### Что сделано
- Draft модель: snapshot содержимого документа, нумерация, создание/просмотр/восстановление
- Episode модель: поддержка сериалов (TV_SERIES), каждый эпизод = отдельный Document
- Character модель: имя, описание, traits (массив строк)
- Location модель: имя, описание
- Term модель: глоссарий проекта (термин + определение)
- Versions Panel: список драфтов, создание snapshot, preview содержимого, восстановление
- Episode Navigator: список эпизодов в sidebar для TV_SERIES, создание/rename/удаление
- Outline Panel: сцены как карточки, drag-and-drop для реордера, авто-snapshot перед изменением порядка
- Entities Panel: Characters/Locations/Terms с sub-tabs, CRUD, inline expand, traits input
- Save Draft кнопка в editor header bar
- Все 4 disabled nav item теперь активны (Outline, Characters, Locations, Versions)
- Lazy loading панелей через React.lazy + Suspense
- Performance indexes на всех новых таблицах
- 3 новых tRPC роутера (draft, episode, entity) с permission checks

### Цель
Версионность, поддержка сериалов, визуальное управление структурой, оптимизация.

### Задачи

#### 8.1 Драфты (версии документа)

**Концепция:** Проект — это папка, в которой может быть несколько версий (драфтов). По умолчанию открывается самая последняя.

- Создание нового драфта (копия текущего или пустой)
- Список драфтов с датами и названиями
- Переключение между драфтами
- Сравнение (diff) между драфтами
- Автоматическое создание драфта при:
  - Apply suggestion
  - Массовое редактирование
  - Manual save (⌘S)
  - Reorder scenes

#### 8.2 Серии / Эпизоды

**Концепция:** Если проект — сериал или многосерийный фильм, пользователь может добавлять эпизоды.

- Тип проекта: `FILM` (один документ) / `SERIES` (несколько эпизодов)
- Каждый эпизод = отдельный Document со своим набором драфтов
- Навигация между эпизодами (вкладки или боковая панель)
- Общий Project Bible для всех эпизодов серии
- Сквозная нумерация сцен (опционально)

#### 8.3 Outline / Corkboard
- Сцены отображаются как карточки
- Drag & drop для изменения порядка
- При перетаскивании обновляется нумерация
- Создаётся новый драфт при изменении порядка

#### 8.4 Entities CRUD
- Characters: карточка с описанием, traits
- Locations: описание, linked scenes
- Terms: глоссарий проекта

#### 8.5 Performance
- До 300 страниц без деградации
- <200ms editor latency
- Виртуализация больших документов
- Lazy loading versions
- Оптимизация запросов (joins, indexes)

### Prisma Schema Additions
```prisma
model Draft {
  id          String   @id @default(cuid())
  documentId  String
  name        String?        // "Draft 1", "v2 after review", etc.
  content     Json           // TipTap JSON
  number      Int            // Sequential draft number
  createdAt   DateTime @default(now())

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
}

model Episode {
  id          String   @id @default(cuid())
  projectId   String
  title       String
  number      Int            // Episode number
  documentId  String  @unique

  project  Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  document Document @relation(fields: [documentId], references: [id])
}

model Character { ... }
model Location { ... }
model Term { ... }
```

### Чеклист ручной проверки

- [ ] Создать новый драфт → копия текущего документа
- [ ] Список драфтов → отображаются с номерами и датами
- [ ] Переключиться на старый драфт → документ показывает его содержимое
- [ ] Diff между драфтами → видно что изменилось
- [ ] Тип проекта «Сериал» → появляется UI для эпизодов
- [ ] Добавить эпизод → новый Document создаётся
- [ ] Переключение между эпизодами → загружается соответствующий документ
- [ ] Outline: все сцены видны как карточки
- [ ] Drag & drop → порядок меняется → нумерация обновлена
- [ ] Создать персонажа → появляется в Characters sidebar
- [ ] 300-страничный документ → editor не лагает (<200ms)

---

## Phase 9 — AI Enhancements

### Цель
Расширенные AI-функции для работы со сценарием.

### Задачи

#### 9.1 AI-описания для карточек сцен
- Когда пользователь работает с карточками сцен (Outline/Corkboard), AI автоматически формирует краткое описание каждой сцены
- Описание обновляется при изменении содержимого сцены
- Пользователь может редактировать описание вручную

#### 9.2 AI-рецензия сценария
- Пользователь может запросить полноценную рецензию от AI
- Анализ:
  - Структура (три акта, арки персонажей)
  - Диалоги (натуральность, различимость голосов)
  - Темп повествования
  - Логические несоответствия
  - Сильные и слабые стороны
- Результат: структурированный отчёт с конкретными рекомендациями

### Чеклист ручной проверки

- [ ] Карточка сцены → AI-описание генерируется автоматически
- [ ] Изменить содержимое сцены → описание обновляется
- [ ] Ручное редактирование описания → сохраняется
- [ ] Запросить рецензию → AI анализирует весь сценарий
- [ ] Рецензия содержит конкретные рекомендации с привязкой к сценам

---

## Post-MVP (будущее)

- Real-time collaboration (Yjs)
- Full track changes
- Production breakdown
- FDX export
- Writers room mode
- AI continuity checker
- Multi-episode arc tracking
- Импорт из FDX / Fountain / PDF
- Интеграция с облачными хранилищами

---

## Общие правила по фазам

1. **Не забегать вперёд** — каждая фаза должна быть стабильна перед переходом к следующей
2. **Миграции БД** — только в своей фазе, не добавлять таблицы "на будущее"
3. **Тесты** — после каждой фазы ручная проверка по чеклисту
4. **Коммиты** — атомарные коммиты по задачам, не один гигантский коммит на фазу
5. **Правки** — если нашёл баг в предыдущей фазе, чини сразу, не копи
