# TECHNICAL SPECIFICATION (ТЗ)  
# AI SCREENWRITING WORKSPACE  
## TipTap-based • Open-Source • BYOK • Prism-style UX

---

# 1. ВВЕДЕНИЕ

## 1.1 Цель проекта

Создание веб-платформы для профессиональной разработки сценариев (полный метр и сериалы), объединяющей:

- Профессиональный сценарный редактор (американский формат)
- Контекстный AI-ассистент
- Suggestion mode (правки как предложения)
- Комментарии и обсуждения
- Структурирование проекта (персонажи, локации, outline)
- Контекст проекта (Bible + Pins + RAG)
- Версионность

Проект реализуется как open-source продукт с поддержкой BYOK (Bring Your Own Key).

---

# 2. ПРОДУКТОВАЯ КОНЦЕПЦИЯ

## 2.1 Основные принципы

1. AI никогда не переписывает документ целиком.
2. AI возвращает только операции (patches).
3. Любое изменение проходит через suggestion layer.
4. Контекст проекта всегда учитывается.
5. UI минималистичный, структурный, Prism-style.
6. Архитектура расширяемая (plugins + провайдеры AI).

---

# 3. ИНФОРМАЦИОННАЯ АРХИТЕКТУРА

## 3.1 Структура проекта

Project
├── Script (Document)
├── Outline
├── Characters
├── Locations
├── Terms
├── Notes
├── Project Bible
├── Versions
└── Context Pins

---

# 4. WORKSPACE UX (ГЛАВНЫЙ ЭКРАН)

## 4.1 Layout

Left Sidebar  
- Script  
- Outline  
- Characters  
- Locations  
- Notes  
- Versions  

Center  
- TipTap Editor  

Right Panel (Tabs)  
- Comments  
- AI Chat  
- Context  

---

# 5. СЦЕНАРНЫЙ РЕДАКТОР

## 5.1 Узлы (Nodes)

- sceneHeading
- action
- character
- dialogue
- parenthetical
- transition

## 5.2 Поведение клавиш

Enter:
- После sceneHeading → action
- После character → dialogue
- После dialogue → character

Tab:
- Переключает тип следующего блока

Автоконвертация:
- INT./EXT. → sceneHeading
- CUT TO: → transition

---

# 6. FLOW: НАПИСАНИЕ СЦЕНЫ

### Сценарий:

1. Пользователь пишет:
   INT. OFFICE – DAY  
   Паша входит.  

2. Вводит имя персонажа → нажимает Enter → появляется dialogue блок.

3. После написания реплики может:
   - выделить текст
   - вызвать AI (⌘K или кнопка)

---

# 7. COMMENTS SYSTEM

## 7.1 Flow: Добавление комментария

1. Пользователь выделяет текст.
2. Нажимает “Add Comment”.
3. Создаётся CommentThread:
   - from
   - to
   - versionId
   - anchor blockId

4. Thread отображается в правой панели.
5. Можно:
   - Ответить
   - Resolve
   - Закрепить в Context Pins

---

# 8. AI SUGGESTION FLOW

## 8.1 Rewrite Selection Flow

1. Пользователь выделяет текст.
2. Вызывает “Rewrite selection”.
3. Frontend отправляет:
   - selection range
   - baseVersionId
   - instruction
   - contextPolicy

4. Backend:
   - собирает контекст
   - вызывает AI
   - валидирует операции
   - создаёт Suggestion

5. Frontend отображает diff preview.
6. Пользователь:
   - Apply → создаётся новая версия
   - Reject → статус rejected

---

# 9. FLOW: NOTES → SCENE

1. В AI Chat пользователь пишет:
   “Паша срывается, Никита его давит, появляется Контакт.”

2. Вызывает action: “Convert to scene”.

3. AI возвращает:
   - insertBlocks operations

4. UI предлагает:
   - Вставить после сцены N
   - Вставить в конец
   - Вставить в текущую позицию

5. После подтверждения создаётся новая версия.

---

# 10. FLOW: UPDATE CHARACTER

1. Пользователь пишет в чате:
   “Контакт слепой, взрослый, ходит медленно.”

2. AI возвращает:
   updateEntity(character, patch)

3. UI показывает preview изменений карточки.

4. После Apply:
   - Character обновлён
   - Версия создана

---

# 11. PROJECT BIBLE

Отдельный документ.

## 11.1 Flow: Обновление Bible

1. Пользователь редактирует вручную
или
2. Через AI предлагает patch
3. Применение создаёт новую версию Bible

Bible всегда входит в AI-контекст.

---

# 12. CONTEXT PINS

## 12.1 Flow: Закрепление

1. Пользователь выделяет текст / комментарий.
2. Нажимает “Pin to context”.
3. Pin добавляется в список.
4. Pins автоматически включаются в каждый AI-запрос.

---

# 13. OUTLINE / CORKBOARD FLOW

1. Сцены отображаются как карточки.
2. Drag & drop меняет порядок.
3. Обновляется numbering.
4. Создаётся новая версия.

---

# 14. VERSIONING FLOW

## 14.1 Когда создаётся версия

- Apply suggestion
- Массовое редактирование
- Manual save
- Reorder scenes

## 14.2 Restore Flow

1. Пользователь выбирает версию.
2. Нажимает Restore.
3. Создаётся новая версия-копия.

---

# 15. AI КОНТЕКСТНАЯ АРХИТЕКТУРА

## 15.1 Контекстные слои

1. Project Bible
2. Context Pins
3. Selection + local window
4. Retrieved chunks (RAG)

---

# 16. VALIDATION RULES

Backend обязан проверять:

- baseVersionId совпадает
- позиции валидны
- операции в пределах selection
- размер изменений ограничен
- допустимые типы блоков

При нарушении → 422 error.

---

# 17. RAG FLOW

1. Индексация:
   - сцены
   - notes
   - bible
   - entities

2. При AI-запросе:
   - semantic search
   - topK chunks
   - включение в prompt

---

# 18. ROLE-BASED ACCESS

Owner:
- управление проектом
- управление AI провайдерами

Editor:
- редактирование
- применение suggestion

Commenter:
- комментарии

Viewer:
- просмотр

---

# 19. PERFORMANCE REQUIREMENTS

- До 300 страниц
- <200ms editor latency
- Асинхронный autosave
- Lazy loading versions
- Виртуализация больших документов (если нужно)

---

# 20. SECURITY

- API-ключи шифруются
- Не логируются
- Возможность локального хранения
- Приватные проекты по умолчанию

---

# 21. MONOREPO STRUCTURE

apps/
- web
- api

packages/
- editor
- ai
- types
- context-engine
- providers

---

# 22. DEVELOPMENT PHASES

### Phase 1
- Repo
- Auth
- Project CRUD
- Basic TipTap editor

### Phase 2
- Screenplay nodes
- Scene navigator

### Phase 3
- Comments

### Phase 4
- AI operations
- Suggestion system

### Phase 5
- AI chat
- Pins
- Bible

### Phase 6
- Outline
- Versioning
- Performance tuning

---

# 23. TESTING STRATEGY

## Unit

- Operation validation
- Node transformations

## Integration

- Comment anchoring
- Suggestion apply

## E2E

- Write → Rewrite → Apply
- Notes → Scene
- Update entity
- Restore version

---

# 24. MVP DELIVERABLE

Готовая open-source платформа:

- Профессиональный сценарный редактор
- AI-патчи
- Suggestion mode
- Комментарии
- Версионность
- Outline
- Context system
- BYOK

---

# 25. ДАЛЬНЕЙШЕЕ РАЗВИТИЕ (POST-MVP)

- Real-time collaboration (Yjs)
- Full track changes
- Production breakdown
- FDX export
- Writers room mode
- AI continuity checker
- Multi-episode arc tracking

---

# КОНЕЦ ДОКУМЕНТА