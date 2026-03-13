# Demo Project & Interactive Tutorial — Implementation Plan

## Overview

Interactive onboarding tutorial for new users using the screenplay "Inception" (Начало, Christopher Nolan) as demo content. The tutorial teaches all app features through a guided, hands-on experience using `react-joyride`.

**Key principles:**
- All analysis results are pre-computed (no API costs for demo)
- Rewrite, Dialogue Pass, and Format use real API calls
- Demo project auto-created on first login
- Tutorial in Russian (first), English later
- "Skip tutorial" button always available
- Analysis results shown with typewriter animation

---

## 1. Screenplay Data

### 1.1 Source
- File: `AI Instruction/Начало.pdf` (146 pages, Russian translation)
- Original: "Inception" by Christopher Nolan

### 1.2 Characters (14 main)

| Character | Russian Name | Role |
|-----------|-------------|------|
| Cobb | Кобб (Дом) | Protagonist, extractor |
| Mal | Мол | Cobb's deceased wife, projection |
| Arthur | Артур | Point man |
| Ariadne | Ариадна | Architect |
| Eames | Имс | Forger |
| Saito | Сайто | Client, businessman |
| Yusuf | Юсуф | Chemist |
| Fischer | Фишер (Роберт) | Target, heir |
| Browning | Браунинг (Дядя Питер) | Fischer's godfather |
| Miles | Майлз | Cobb's father-in-law, professor |
| Nash | Нэш | Architect (opening only) |
| Fischer Sr. | Отец (Морис Фишер) | Fischer's dying father |
| James | Джеймс | Cobb's son |
| Philippa | Филиппа | Cobb's daughter |

### 1.3 Locations (grouped by dream level)

**Reality:**
- Японский замок (Сайто)
- Грязная ванная комната
- Вагон скоростного поезда (Япония)
- Квартира (Токио)
- Частный самолет (Сидней → Лос-Анджелес)
- Архитектурная школа (Париж)
- Парижское кафе
- Мастерская (Париж)
- Игорный дом (Момбаса)
- Аптека Юсуфа (Момбаса)
- Дом Кобба и Мол (Лос-Анджелес)
- Зал прибытия, аэропорт Лос-Анджелеса
- Салон первого класса — Боинг 747

**Dream Level 1 (Юсуф):**
- Дождливые улицы центра города
- Фургон / Мост
- Склад
- Река

**Dream Level 2 (Артур):**
- Лобби отеля — бар
- Коридор отеля
- Комната 528
- Номер 491
- Лифт отеля
- Лестничная клетка отеля
- Шахта лифта

**Dream Level 3 (Имс):**
- Заснеженные горы
- Больничный комплекс (укрепленная крепость)
- Вентиляционная система
- Верхняя комната — южная башня
- Передняя / Прихожая
- Хранилище / Сейф

**Limbo (Лимб):**
- Побережье (Лимб)
- Город — разрушающиеся здания
- Лобби небоскреба
- Лифт небоскреба
- Пентхаус (Лимб) — кухня, балкон
- Столовая — замок (пожилой Сайто)

### 1.4 Scene Count
~150+ scene headings (many with ПРОДОЛЖЕНИЕ — continuations). For demo, we'll include the full screenplay converted to TipTap JSON.

### 1.5 Act Structure (for pre-computed Beat Sheet)

**Act I (стр. 1–30): Exposition**
- Opening: Кобб на берегу, встреча с пожилым Сайто (рамочная история)
- Провал извлечения у Сайто в японском замке
- Сайто предлагает задание: внедрение (inception) для Фишера
- Кобб соглашается ради возвращения к детям

**Act II-A (стр. 30–75): Сборка команды & подготовка**
- Набор Ариадны (архитектор) — уроки проектирования снов
- Набор Имса (подделыватель) в Момбасе
- Набор Юсуфа (химик) — мощное снотворное
- Обучение Ариадны, раскрытие истории Мол
- Слежка за Фишером, подготовка плана

**Act II-B (стр. 75–130): Миссия внедрения**
- Уровень 1: Похищение Фишера на дождливых улицах, погоня с фургоном
- Уровень 2: Отель — Кобб убеждает Фишера, что тот во сне, завоевание доверия
- Уровень 3: Снежная крепость — штурм больничного комплекса
- Лимб: Кобб и Ариадна ищут Фишера, противостояние с Мол
- Параллельный монтаж: все четыре уровня одновременно

**Act III (стр. 130–146): Развязка**
- Кобб прощается с Мол, принимает её нереальность
- Фишер открывает сейф — примирение с отцом
- Синхронный выброс через все уровни
- Кобб находит пожилого Сайто в Лимбе
- Возвращение домой, дети, вращающийся волчок — финал

---

## 2. Tutorial Flow

### Step-by-step scenario (17 steps):

```
Step 1:  Empty project — intro tooltip
Step 2:  Write scene heading (ИНТ/НАТ) — teach Enter/Tab behavior
Step 3:  Paste unformatted text block
Step 4:  Format — real API call → formatted screenplay blocks
Step 5:  Load Inception demo project (auto-switch)
Step 6:  Navigate editor — scroll, select text
Step 7:  Rewrite — select text → real API call
Step 8:  Dialogue Pass — select text → real API call
Step 9:  Comments — add/resolve a comment
Step 10: Left sidebar tour — 10 workspace modes
Step 11: Characters panel (right sidebar)
Step 12: Beat Sheet (pre-computed, typewriter animation)
Step 13: Structure Analysis (pre-computed)
Step 14: Pacing Analysis (pre-computed)
Step 15: Knowledge Graph (pre-computed, interactive viz)
Step 16: Chat with AI (explain feature, no actual call)
Step 17: Export → Dashboard → end
```

### Detailed step descriptions:

#### Step 1: Welcome & Empty Project
- **Tooltip:** "Добро пожаловать в Script! Это ваш первый проект. Давайте научимся писать сценарий."
- **Action:** User sees an empty editor
- **Target:** Editor area

#### Step 2: Scene Heading
- **Tooltip:** "Напишите заголовок сцены. Начните с ИНТ. или НАТ. — редактор автоматически определит тип блока."
- **Action:** User types `ИНТ. КВАРТИРА КОББА – ДЕНЬ`
- **Auto-detect:** Block type changes to `scene_heading`
- **Tooltip 2:** "Нажмите Enter — следующий блок станет «действием». Нажмите Tab — переключитесь на другой тип блока."

#### Step 3: Paste Unformatted Text
- **Tooltip:** "Часто нужно отформатировать уже написанный текст. Вставьте этот фрагмент:"
- **Action:** Auto-insert unformatted text block (3-4 lines of mixed scene heading, action, dialogue from Inception)
- **Pre-inserted text example:**
  ```
  ИНТ. ЯПОНСКИЙ ЗАМОК – НОЧЬ
  Кобб стоит у окна, глядя на штормовое море. За его спиной двое охранников.
  САЙТО
  Вы пришли убить меня?
  КОББ
  Нет. Я пришёл напомнить вам кое-что.
  ```

#### Step 4: Format (Real API)
- **Tooltip:** "Выделите весь текст и нажмите «Формат» — ИИ автоматически разобьёт текст на правильные блоки сценария."
- **Action:** User selects text → clicks Format → real API call
- **Result:** Text split into `scene_heading`, `action`, `character`, `dialogue` blocks
- **Tooltip after:** "Отлично! Текст отформатирован. Каждый блок имеет свой тип: заголовок сцены, действие, персонаж, реплика."

#### Step 5: Load Inception Demo
- **Tooltip:** "Теперь откроем полноценный сценарий — «Начало» Кристофера Нолана — чтобы изучить остальные функции."
- **Action:** Auto-navigate to the pre-loaded Inception project
- **Transition:** Smooth navigation to first document of demo project

#### Step 6: Navigate Editor
- **Tooltip:** "Перед вами профессиональный сценарий. Прокрутите текст, нажмите на любой блок для редактирования."
- **Action:** Highlight different block types with colored indicators
- **Tooltip 2:** "Каждый блок имеет тип: заголовок сцены (серый), действие, персонаж (по центру), реплика, ремарка, переход."

#### Step 7: Rewrite (Real API)
- **Tooltip:** "Выделите фрагмент текста и нажмите «Переписать» — ИИ предложит улучшенную версию."
- **Action:** Pre-select a paragraph of action text → Rewrite button
- **Target text:** An action block from the Inception screenplay
- **Result:** Real API call, rewritten text appears

#### Step 8: Dialogue Pass (Real API)
- **Tooltip:** "Выделите диалог и нажмите «Диалог» — ИИ улучшит реплики, сохраняя характер персонажа."
- **Action:** Pre-select a dialogue section → Dialogue Pass
- **Result:** Real API call, improved dialogue

#### Step 9: Comments
- **Tooltip:** "Выделите текст и добавьте комментарий — как в Google Docs. Комментарии помогают при совместной работе."
- **Action:** Demo adding a comment, then resolving it
- **Target:** Comment button in toolbar

#### Step 10: Left Sidebar — 10 Workspace Modes
- **Sequential tooltips for each mode:**
  1. **Сценарий** — "Основной режим — редактор сценария"
  2. **Документ** — "Библия проекта, заметки, референсы"
  3. **Персонажи** — "Список персонажей с описаниями"
  4. **Локации** — "Все локации вашего сценария"
  5. **Структура** — "Акты и сцены — навигация по структуре"
  6. **Заметки** — "Личные заметки к проекту"
  7. **Хронология** — "Таймлайн событий"
  8. **Версии** — "История изменений"
  9. **Экспорт** — "Экспорт в PDF, FDX, Fountain"
  10. **Настройки** — "Настройки проекта"

#### Step 11: Characters Panel (Right Sidebar)
- **Tooltip:** "В правой панели — анализ персонажей. Откройте профиль любого персонажа."
- **Pre-computed data:** Character list with stats (scene count, dialogue count, first/last appearance)
- **Show:** Кобб's character card with pre-computed description

#### Step 12: Beat Sheet (Pre-computed + Typewriter)
- **Tooltip:** "Beat Sheet — ключевые повороты сюжета. ИИ анализирует весь сценарий."
- **Action:** Show pre-computed beat sheet with typewriter animation
- **Data:** 15 beat points mapped to Blake Snyder's Save the Cat structure
- **Animation:** Each beat appears with typing effect (~50ms per char)

#### Step 13: Structure Analysis (Pre-computed + Typewriter)
- **Tooltip:** "Анализ структуры — акты, поворотные точки, арки персонажей."
- **Action:** Show pre-computed structure analysis
- **Animation:** Typewriter effect

#### Step 14: Pacing Analysis (Pre-computed + Typewriter)
- **Tooltip:** "Анализ ритма — графики динамики, соотношение действия и диалога."
- **Action:** Show pre-computed pacing charts + text analysis
- **Animation:** Charts animate in, text types out

#### Step 15: Knowledge Graph (Pre-computed + Interactive)
- **Tooltip:** "Граф знаний — интерактивная визуализация связей персонажей и локаций."
- **Action:** Show pre-computed knowledge graph (d3-force)
- **Interaction:** User can drag nodes, zoom, hover for details

#### Step 16: Chat with AI
- **Tooltip:** "Чат с ИИ — задавайте вопросы о вашем сценарии, просите совет, генерируйте идеи."
- **Action:** Show chat panel, explain feature (no actual API call in demo to save costs)
- **Optional:** One pre-scripted demo message/response pair

#### Step 17: Export & Finish
- **Tooltip:** "Экспортируйте сценарий в PDF, FDX или Fountain. Ваш демо-проект всегда доступен."
- **Action:** Show export panel
- **Final tooltip:** "Туториал завершён! Вы можете вернуться к нему в любой момент через Настройки → Туториал."
- **Button:** "Начать работу" → redirect to Dashboard

---

## 3. Pre-computed Analysis Data

All analysis results stored as JSON in seed data (no API calls needed).

### 3.1 Beat Sheet (Save the Cat / Blake Snyder)

```json
{
  "beats": [
    {
      "name": "Opening Image",
      "nameRu": "Открывающий образ",
      "page": 1,
      "scene": "НАТ. РАССВЕТ – ШУМ ВОЛН",
      "description": "Постаревший Кобб выброшен на берег у японского замка. Волчок крутится на столе перед пожилым Сайто. Визуальная метафора: герой потерян между реальностью и сном."
    },
    {
      "name": "Theme Stated",
      "nameRu": "Тема озвучена",
      "page": 8,
      "scene": "ИНТ. КВАРТИРА – ТОКИО",
      "description": "«Какой самый живучий паразит? Идея.» — Кобб формулирует центральную тему: идея может изменить человека навсегда. Тема подкрепляется его собственной историей с Мол."
    },
    {
      "name": "Setup",
      "nameRu": "Установка",
      "page": "1-18",
      "scene": "Японский замок → Поезд → Токио",
      "description": "Мир извлечения снов. Кобб — лучший в своём деле, но в бегах. Его тотем — волчок. Провал задания для Сайто. Предательство Нэша. Кобб тоскует по детям, которых не может увидеть."
    },
    {
      "name": "Catalyst",
      "nameRu": "Катализатор",
      "page": 18,
      "scene": "ИНТ. ВЕРТОЛЁТ",
      "description": "Сайто предлагает сделку: выполни внедрение для Фишера — и я верну тебя домой. Кобб впервые может получить то, что хочет больше всего."
    },
    {
      "name": "Debate",
      "nameRu": "Сомнения",
      "page": "18-30",
      "scene": "Архитектурная школа, Париж",
      "description": "Кобб сомневается — внедрение считается невозможным. Артур скептичен. Но Кобб уже делал это однажды — с Мол, и знает цену. Начинает собирать команду."
    },
    {
      "name": "Break into Two",
      "nameRu": "Переход во второй акт",
      "page": 30,
      "scene": "Набор Ариадны",
      "description": "Кобб решает собрать команду и выполнить внедрение. Точка невозврата: он обучает Ариадну строить сны, раскрывая свои секреты."
    },
    {
      "name": "B Story",
      "nameRu": "Побочная линия",
      "page": "30-40",
      "scene": "Сны с Ариадной",
      "description": "Линия Кобб–Мол: Ариадна узнаёт о Мол, проникает в тайны Кобба. Мол — не просто проекция, а воплощение вины Кобба за внедрение идеи жене."
    },
    {
      "name": "Fun and Games",
      "nameRu": "Развлечения и игры",
      "page": "40-70",
      "scene": "Момбаса → Подготовка → Самолёт",
      "description": "Набор Имса и Юсуфа. Парижское кафе складывается на глазах. Обучение Ариадны — парадоксальная архитектура. Тренировочные сны. Разработка трёхуровневого плана."
    },
    {
      "name": "Midpoint",
      "nameRu": "Середина",
      "page": 75,
      "scene": "Боинг 747 — начало миссии",
      "description": "Команда усыпляет Фишера в самолёте. Ставки повышаются: из-за мощного снотворного смерть во сне = Лимб, а не пробуждение. Ложное поражение: правила изменились."
    },
    {
      "name": "Bad Guys Close In",
      "nameRu": "Враги наступают",
      "page": "75-110",
      "scene": "Три уровня сна",
      "description": "Подсознание Фишера атакует на всех уровнях. Дождливая погоня. Отель теряет гравитацию. Сайто ранен и умирает. Мол саботирует план. Кобб теряет контроль."
    },
    {
      "name": "All Is Lost",
      "nameRu": "Всё потеряно",
      "page": 125,
      "scene": "ИНТ. ПРИХОЖАЯ – БОЛЬНИЧНЫЙ КОРИДОР",
      "description": "Мол убивает Фишера. Сайто мёртв. Миссия провалена. Кобб не сможет вернуться домой. Имс: «Значит, всё? Мы проиграли.»"
    },
    {
      "name": "Dark Night of the Soul",
      "nameRu": "Тёмная ночь души",
      "page": "125-127",
      "scene": "Прихожая больничного комплекса",
      "description": "Кобб стоит над телами Фишера и Мол. Команда в отчаянии. Но Ариадна предлагает план: спуститься в Лимб за Фишером."
    },
    {
      "name": "Break into Three",
      "nameRu": "Переход в третий акт",
      "page": 127,
      "scene": "НАТ. ПОБЕРЕЖЬЕ (ЛИМБ)",
      "description": "Кобб и Ариадна погружаются в Лимб. Кобб должен не только спасти Фишера, но и наконец отпустить Мол — принять правду о том, что он сделал."
    },
    {
      "name": "Finale",
      "nameRu": "Финал",
      "page": "127-145",
      "scene": "Лимб → Все уровни → Реальность",
      "description": "В Лимбе Кобб признаётся Мол: он внедрил ей идею, что мир нереален. Прощается с ней. Ариадна сбрасывает Фишера с балкона (импровизированный выброс). Фишер открывает сейф — примирение с отцом. Синхронный выброс через все уровни. Кобб находит пожилого Сайто — «Пойдём, и мы снова станем молодыми»."
    },
    {
      "name": "Final Image",
      "nameRu": "Финальный образ",
      "page": 145,
      "scene": "ИНТ. КУХНЯ – ДОМ КОББА И МОЛ",
      "description": "Кобб дома. Дети поворачиваются — он наконец видит их лица. Волчок на столе ВСЁ ЕЩЁ ВРАЩАЕТСЯ. Зеркальный образ к началу: тот же волчок, но теперь Кобб не смотрит на него — он выбрал реальность."
    }
  ]
}
```

### 3.2 Structure Analysis (pre-computed summary)

To be generated via AI during implementation phase — a detailed 3-act breakdown with:
- Act boundaries with page numbers
- Turning points (inciting incident, plot points, climax)
- Character arcs for Кобб, Мол, Фишер, Ариадна
- Thematic threads (reality vs. dream, guilt, letting go)

### 3.3 Character Analysis (pre-computed)

For each of the 14 characters:
- Description (2-3 sentences)
- Motivation
- Arc summary
- Key scenes (with page references)
- Dialogue count / scene count
- Relationships to other characters

### 3.4 Pacing Analysis (pre-computed)

- Scene length distribution (histogram)
- Action vs. dialogue ratio per act
- Tension curve (scene-by-scene intensity 1-10)
- Parallel editing frequency (acts 2B and 3)

### 3.5 Consistency Check (pre-computed)

- Character name consistency (Кобб/Дом, Фишер/Роберт)
- Location naming variations (ИНТ./НАТ. formatting)
- Timeline logic across dream levels
- Time dilation accuracy (×20 per level)

### 3.6 Knowledge Graph (pre-computed)

Nodes and edges for d3-force visualization:

**Nodes (characters + locations + concepts):**
- 14 characters
- ~20 key locations
- 5 concepts: Волчок (тотем), Внедрение, Извлечение, Выброс, Лимб

**Edges (relationships):**
- Кобб ↔ Мол (муж/жена, вина)
- Кобб ↔ Артур (партнёры)
- Кобб ↔ Ариадна (наставник/ученик)
- Кобб ↔ Сайто (заказчик/исполнитель)
- Кобб ↔ Фишер (цель внедрения)
- Фишер ↔ Браунинг (крёстный отец)
- Фишер ↔ Отец (конфликт/примирение)
- Кобб ↔ Майлз (тесть)
- Кобб ↔ Дети (мотивация)
- Мол ↔ Внедрение (жертва)
- Characters ↔ Dream levels (who is in which level)

### 3.7 One-Pager / Synopsis (pre-computed)

Logline + short synopsis (1 page) in Russian.

---

## 4. Technical Architecture

### 4.1 Database Changes

```prisma
// In UserProfile model:
model UserProfile {
  // ... existing fields
  tutorialStep      Int       @default(0)    // Current step (0 = not started, 1-17 = in progress, 18 = completed)
  tutorialCompleted  Boolean   @default(false)
  demoProjectId     String?   // Reference to auto-created demo project
}
```

### 4.2 Seed Data Structure

```
packages/db/prisma/seed/
  demo/
    inception-content.json     // Full screenplay in TipTap JSON (~150 scenes)
    inception-characters.json  // Pre-computed character data
    inception-locations.json   // Pre-computed location data
    inception-beat-sheet.json  // Pre-computed beat sheet
    inception-structure.json   // Pre-computed structure analysis
    inception-pacing.json      // Pre-computed pacing analysis
    inception-consistency.json // Pre-computed consistency check
    inception-knowledge-graph.json // Pre-computed graph nodes/edges
    inception-synopsis.json    // Pre-computed synopsis/logline
```

### 4.3 Demo Project Creation

**When:** After user registration + betaApproved (or immediately for demo access)

**tRPC mutation:** `tutorial.createDemoProject`

```typescript
// Pseudo-code
async function createDemoProject(userId: string) {
  // 1. Create project "Начало (демо)"
  const project = await db.project.create({
    data: {
      title: "Начало — Кристофер Нолан (демо)",
      userId,
      isDemo: true, // New field
    }
  });

  // 2. Create document with full screenplay content
  const doc = await db.document.create({
    data: {
      projectId: project.id,
      title: "Начало",
      content: inceptionContent, // From seed JSON
    }
  });

  // 3. Populate characters, locations from seed data
  // 4. Store pre-computed analysis results
  // 5. Update UserProfile.demoProjectId

  return project;
}
```

### 4.4 Pre-computed Results Storage

Analysis results stored in a new model or as JSON in existing analysis tables:

```prisma
model DemoAnalysis {
  id          String   @id @default(cuid())
  projectId   String
  type        String   // "beat_sheet", "structure", "pacing", "consistency", "knowledge_graph", "synopsis"
  result      Json     // Pre-computed JSON result
  project     Project  @relation(fields: [projectId], references: [id])

  @@unique([projectId, type])
}
```

### 4.5 Tutorial State API

```typescript
// packages/api/src/routers/tutorial.ts

export const tutorialRouter = router({
  // Get current tutorial state
  getState: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.userProfile.findUnique({
      where: { userId: ctx.user.id },
      select: { tutorialStep: true, tutorialCompleted: true, demoProjectId: true }
    });
    return profile;
  }),

  // Advance to next step
  advanceStep: protectedProcedure
    .input(z.object({ step: z.number().min(0).max(18) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.userProfile.update({
        where: { userId: ctx.user.id },
        data: { tutorialStep: input.step }
      });
    }),

  // Skip tutorial
  skipTutorial: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.userProfile.update({
      where: { userId: ctx.user.id },
      data: { tutorialCompleted: true, tutorialStep: 18 }
    });
  }),

  // Create demo project (called on first login)
  createDemoProject: protectedProcedure.mutation(async ({ ctx }) => {
    // ... see 4.3
  }),

  // Restart tutorial
  restartTutorial: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.userProfile.update({
      where: { userId: ctx.user.id },
      data: { tutorialStep: 1, tutorialCompleted: false }
    });
  }),
});
```

### 4.6 Frontend: react-joyride Integration

```
apps/web/
  components/
    tutorial/
      TutorialProvider.tsx       // Context + react-joyride wrapper
      TutorialTooltip.tsx        // Custom tooltip component (styled)
      TutorialOverlay.tsx        // Skip button, progress indicator
      steps/
        index.ts                 // All steps config
        editor-steps.ts          // Steps 1-4 (empty project, format)
        inception-steps.ts       // Steps 5-9 (demo project features)
        sidebar-steps.ts         // Step 10 (workspace modes)
        analysis-steps.ts        // Steps 11-16 (right panel)
        finish-steps.ts          // Step 17 (export, finish)
      hooks/
        useTutorial.ts           // Hook for tutorial state
        useTypewriter.ts         // Typewriter animation hook
      animations/
        TypewriterText.tsx       // Typewriter animation component
```

#### TutorialProvider (top-level)

```tsx
// Wraps the entire app, renders react-joyride
export function TutorialProvider({ children }) {
  const { step, isActive } = useTutorial();

  return (
    <>
      {children}
      {isActive && (
        <Joyride
          steps={getStepsForCurrentPhase(step)}
          continuous
          showSkipButton
          tooltipComponent={TutorialTooltip}
          callback={handleJoyrideCallback}
          // ...
        />
      )}
    </>
  );
}
```

### 4.7 Typewriter Animation

For pre-computed analysis results, simulate "generation":

```tsx
function TypewriterText({ text, speed = 30, onComplete }) {
  const [displayed, setDisplayed] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayed(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      onComplete?.();
    }
  }, [index, text, speed]);

  return <div>{displayed}<span className="cursor blink">|</span></div>;
}
```

---

## 5. Implementation Phases

### Phase 1: Data Preparation (2-3 days)
1. Parse Inception PDF → TipTap JSON format
   - Convert all 146 pages to proper node types
   - scene_heading, action, character, dialogue, parenthetical, transition
   - Preserve ПРОДОЛЖЕНИЕ markers
2. Extract character list with scene/dialogue counts
3. Extract location list
4. Generate pre-computed analysis results via AI:
   - Beat sheet (from section 3.1, expand with AI)
   - Structure analysis
   - Character analysis (all 14 characters)
   - Pacing analysis
   - Consistency check
   - Knowledge graph nodes/edges
   - Synopsis + logline
5. Save all as JSON seed files

### Phase 2: Database & API (1-2 days)
1. Add fields to UserProfile: `tutorialStep`, `tutorialCompleted`, `demoProjectId`
2. Add `isDemo` field to Project model
3. Create `DemoAnalysis` model (or reuse existing analysis storage)
4. Run migration: `pnpm db:generate && pnpm db:push`
5. Create `tutorial` tRPC router with all mutations
6. Create demo project seed endpoint
7. Wire demo creation into registration flow (after betaApproved)

### Phase 3: Tutorial Infrastructure (2-3 days)
1. Install `react-joyride`: `pnpm --filter web add react-joyride`
2. Create `TutorialProvider` component
3. Create custom `TutorialTooltip` with app styling
4. Create `useTutorial` hook (reads/writes tutorial state via tRPC)
5. Create `useTypewriter` hook
6. Create `TypewriterText` component
7. Add skip button with confirmation dialog
8. Add progress indicator (step X of 17)

### Phase 4: Tutorial Steps Implementation (3-5 days)
1. **Steps 1-4:** Empty project + format
   - Auto-create empty project for tutorial
   - Insert unformatted text programmatically
   - Trigger format via existing API
2. **Steps 5-6:** Load & navigate Inception
   - Auto-navigate to demo project
   - Highlight block types
3. **Steps 7-8:** Rewrite & Dialogue (real API)
   - Pre-select text programmatically
   - Trigger rewrite/dialogue via existing API
4. **Step 9:** Comments
   - Demo comment creation flow
5. **Step 10:** Sidebar tour
   - 10 sequential tooltips for each mode
6. **Steps 11-16:** Right panel analyses
   - Load pre-computed data
   - Apply typewriter animation
   - Knowledge graph interactive viz
7. **Step 17:** Export & finish
   - Show export panel
   - Mark tutorial as completed
   - Redirect to dashboard

### Phase 5: Polish & Testing (2-3 days)
1. Responsive design (mobile consideration)
2. Edge cases: browser back, refresh mid-tutorial, network errors
3. "Restart tutorial" button in Settings
4. Smooth transitions between steps
5. Test full flow end-to-end
6. Test with new user account
7. Performance: lazy-load analysis data
8. Accessibility: keyboard navigation in joyride

---

## 6. Text Fragments for Tutorial

### 6.1 Unformatted Text for Step 3 (Format Demo)

```
ИНТ. ЯПОНСКИЙ ЗАМОК – НОЧЬ
Кобб стоит у окна, глядя на штормовое море. За его спиной двое охранников ведут пожилого человека к длинному обеденному столу.
САЙТО
Вы знаете, что значит стать стариком, полным сожалений, ожидающим смерти в одиночестве?
КОББ
Я пришёл напомнить вам кое-что. Что-то, что вы когда-то знали.
Кобб указывает на волчок, вращающийся на столе. Сайто следит за ним взглядом.
КОББ (ПРОД.)
Что этот мир нереален.
```

### 6.2 Text for Rewrite Demo (Step 7)

Select this action block for rewrite:
```
Кобб оглядывается по сторонам, посетители начинают СМОТРЕТЬ на Кобба с подозрением – Кобб снова поворачивается к Фишеру.
```

### 6.3 Text for Dialogue Pass Demo (Step 8)

Select this dialogue for improvement:
```
КОББ
Самый простой способ проверить себя — это попытаться вспомнить, как вы попали в этот отель... ясно?

ФИШЕР
Думаю, да. Но я не понимаю.

КОББ
Они собирались погрузить вас в сон.

ФИШЕР
Я итак во сне.

КОББ
Ещё глубже.
```

---

## 7. Demo Access Model

### Option A: Demo without registration
- `/demo` route — standalone demo experience
- No account needed
- Limited: can't save changes, export is disabled
- CTA: "Зарегистрируйтесь, чтобы сохранить прогресс"

### Option B: Demo after registration (recommended)
- Demo project auto-created after betaApproved
- Full functionality (save, export, etc.)
- Tutorial starts on first visit to dashboard
- Demo project always available, marked with badge

**Decision: Option B** — integrates naturally into existing auth flow.

### Free demo access flow:
```
Registration → Verify Telegram → Beta Approved →
  → First Dashboard Visit →
    → Auto-create demo project "Начало (демо)" →
      → Tutorial starts (Step 1) →
        → User can skip at any time →
          → Demo project remains available
```

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF parsing quality | Incorrect TipTap JSON | Manual review of parsed output, test with 10 random scenes |
| react-joyride z-index conflicts | Tooltips hidden behind panels | Custom z-index management, test each step |
| Real API calls in tutorial cost money | Budget overrun | Rate-limit demo API calls, cache results per session |
| User refreshes mid-tutorial | Lost progress | State persisted in DB, resume from last step |
| Large JSON seed data | Slow initial load | Lazy-load analysis data per panel, compress JSON |
| Screenplay copyright | Legal issues | Demo project marked as educational, non-downloadable in full |
| Tutorial too long | User drops off | Skip button prominent, progress indicator, ~10 min target |

---

## 9. Success Metrics

- **Completion rate:** % of users who finish all 17 steps
- **Drop-off points:** Which step has highest abandonment
- **Time to complete:** Target < 10 minutes
- **Feature adoption:** Do tutorial completers use more features?
- **Skip rate:** % who skip vs. complete

---

## 10. Future Enhancements

- [ ] English tutorial version
- [ ] Multiple demo screenplays (different genres)
- [ ] Video tooltips instead of text
- [ ] Achievement badges for completing tutorial sections
- [ ] Contextual tooltips (appear when user first encounters a feature)
- [ ] A/B testing different tutorial flows
