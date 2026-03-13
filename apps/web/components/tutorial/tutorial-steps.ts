import type { Step } from "react-joyride";

/**
 * Tutorial steps configuration.
 *
 * Steps reference DOM elements via `data-tutorial="<key>"` attributes
 * that must be added to the corresponding workspace components.
 *
 * Phase 4 will add these attributes and implement the interactive logic.
 */

// ── Step groups ───────────────────────────────────────────────

export const editorSteps: Step[] = [
  {
    target: '[data-tutorial="editor"]',
    title: "Редактор сценария",
    content:
      "Добро пожаловать в Script! Это ваш первый проект. Давайте научимся писать сценарий. Начните с заголовка сцены: напишите ИНТ. или НАТ. — редактор автоматически определит тип блока.",
    disableBeacon: true,
    placement: "center",
  },
  {
    target: '[data-tutorial="editor"]',
    title: "Заголовок сцены",
    content:
      "Нажмите Enter — следующий блок станет «действием». Нажмите Tab — переключитесь на другой тип блока (персонаж, ремарка, переход).",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="editor"]',
    title: "Неформатированный текст",
    content:
      "Часто нужно отформатировать уже написанный текст. Мы вставили фрагмент из сценария «Начало» — выделите его и нажмите «Формат».",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="format-button"]',
    title: "Форматирование",
    content:
      "Нажмите «Формат» — ИИ автоматически разобьёт текст на правильные блоки сценария: заголовок сцены, действие, персонаж, реплика.",
    disableBeacon: true,
    spotlightClicks: true,
  },
];

export const inceptionSteps: Step[] = [
  {
    target: '[data-tutorial="editor"]',
    title: "Сценарий «Начало»",
    content:
      "Перед вами полный сценарий фильма «Начало» Кристофера Нолана. Прокрутите текст, нажмите на любой блок для редактирования. Каждый блок имеет тип: заголовок сцены, действие, персонаж, реплика, ремарка, переход.",
    disableBeacon: true,
    placement: "center",
  },
  {
    target: '[data-tutorial="rewrite-button"]',
    title: "Переписать",
    content:
      "Выделите фрагмент текста и нажмите «Переписать» — ИИ предложит улучшенную версию, сохраняя стиль и тон.",
    disableBeacon: true,
    spotlightClicks: true,
  },
  {
    target: '[data-tutorial="dialogue-button"]',
    title: "Диалог",
    content:
      "Выделите диалог и нажмите «Диалог» — ИИ улучшит реплики, сохраняя характер персонажа и динамику сцены.",
    disableBeacon: true,
    spotlightClicks: true,
  },
  {
    target: '[data-tutorial="comments-button"]',
    title: "Комментарии",
    content:
      "Выделите текст и добавьте комментарий — как в Google Docs. Комментарии помогают при совместной работе над сценарием.",
    disableBeacon: true,
    spotlightClicks: true,
  },
];

export const sidebarSteps: Step[] = [
  {
    target: '[data-tutorial="sidebar"]',
    title: "Боковая панель",
    content:
      "Слева — 10 режимов работы. Каждый открывает свой раздел: сценарий, документы, персонажи, локации, структура и другие.",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="sidebar-script"]',
    title: "Сценарий",
    content: "Основной режим — редактор сценария с инструментами форматирования.",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="sidebar-bible"]',
    title: "Библия проекта",
    content:
      "Библия проекта — центральный документ с миром, правилами и справочной информацией.",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="sidebar-chars"]',
    title: "Персонажи и локации",
    content:
      "Список всех персонажей и локаций вашего сценария с описаниями и статистикой.",
    disableBeacon: true,
  },
];

export const analysisPanelSteps: Step[] = [
  {
    target: '[data-tutorial="right-panel"]',
    title: "Панель анализа",
    content:
      "Справа — аналитические инструменты. ИИ анализирует ваш сценарий и предоставляет структурный разбор, ритм, консистентность и другие метрики.",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="analysis-beatSheet"]',
    title: "Beat Sheet",
    content:
      "Ключевые повороты сюжета по методу Save the Cat. ИИ находит все структурные точки: открывающий образ, катализатор, мидпоинт, кульминация.",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="analysis-structure"]',
    title: "Анализ структуры",
    content:
      "Трёхактная структура, поворотные точки, арки персонажей и тематические линии.",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="analysis-pacing"]',
    title: "Анализ ритма",
    content:
      "Графики динамики, соотношение действия и диалога, кривая напряжения по сценам.",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="analysis-consistency"]',
    title: "Проверка консистентности",
    content:
      "ИИ проверяет сценарий на ошибки: имена персонажей, локации, временные несоответствия и другие неточности.",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="chat-panel"]',
    title: "Чат с ИИ",
    content:
      "Задавайте вопросы о вашем сценарии, просите совет, генерируйте идеи. ИИ знает контекст всего проекта.",
    disableBeacon: true,
  },
];

export const finishSteps: Step[] = [
  {
    target: '[data-tutorial="sidebar-settings"]',
    title: "Настройки и экспорт",
    content:
      "В настройках проекта — экспорт в PDF, FDX или Fountain, а также параметры проекта. Ваш демо-проект «Начало» всегда доступен в списке проектов.",
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="editor"]',
    title: "Туториал завершён!",
    content:
      "Вы познакомились со всеми основными функциями Script. Демо-проект останется в вашем аккаунте. Вы можете вернуться к туториалу через Настройки → Туториал. Удачного творчества!",
    disableBeacon: true,
    placement: "center",
  },
];

// ── Combined steps ────────────────────────────────────────────

export const ALL_TUTORIAL_STEPS: Step[] = [
  ...editorSteps, // Steps 1-4
  ...inceptionSteps, // Steps 5-8
  ...sidebarSteps, // Steps 9-12
  ...analysisPanelSteps, // Steps 13-18
  ...finishSteps, // Steps 19-20 (but we mapped to 17 logical steps)
];

export const TOTAL_STEPS = ALL_TUTORIAL_STEPS.length;

/**
 * Map logical tutorial step (1-18 from DB) to joyride step index (0-based).
 * Step 0 = not started, step 18 = completed.
 */
export function logicalStepToJoyrideIndex(logicalStep: number): number {
  // Logical steps 1-18 map to joyride indices 0-17
  // (clamped to available steps)
  return Math.max(0, Math.min(logicalStep - 1, ALL_TUTORIAL_STEPS.length - 1));
}
