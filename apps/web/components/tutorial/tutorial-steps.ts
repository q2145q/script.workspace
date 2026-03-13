import type { Step } from "react-joyride";

/**
 * Tutorial steps configuration.
 *
 * IMPORTANT: All targets must be elements that are ALWAYS mounted in the DOM.
 * - Selection toolbar buttons (format, rewrite, dialogue, comments) are NOT
 *   always mounted — they only appear when text is selected.
 * - Analysis/chat panels are only mounted when their tab is active in right-panel.
 * - Sidebar items and right-panel tab buttons are always mounted.
 */

export const ALL_TUTORIAL_STEPS: Step[] = [
  // ── Step 1: Welcome ──────────────────────────────────────
  {
    target: '[data-tutorial="editor"]',
    title: "Добро пожаловать в Script!",
    content:
      "Это редактор сценария. Перед вами загружен полный сценарий фильма «Начало» Кристофера Нолана. Прокрутите текст, нажмите на любой блок — каждый имеет свой тип: заголовок сцены, действие, персонаж, реплика.",
    disableBeacon: true,
    placement: "center",
  },

  // ── Step 2: Editor basics ────────────────────────────────
  {
    target: '[data-tutorial="editor"]',
    title: "Работа с текстом",
    content:
      "Начните писать ИНТ. или НАТ. — редактор автоматически определит заголовок сцены. Enter — новый блок «действие». Tab — переключение типа блока (персонаж, ремарка, переход).",
    disableBeacon: true,
    placement: "bottom",
  },

  // ── Step 3: Selection toolbar hint ───────────────────────
  {
    target: '[data-tutorial="editor"]',
    title: "Панель инструментов",
    content:
      "Выделите любой фрагмент текста — появится панель с кнопками: Формат (разбивает текст на блоки сценария), Переписать (ИИ улучшает текст), Диалог (улучшает реплики), Комментарий (как в Google Docs).",
    disableBeacon: true,
    placement: "bottom",
  },

  // ── Step 4: Sidebar overview ─────────────────────────────
  {
    target: '[data-tutorial="sidebar"]',
    title: "Боковая панель",
    content:
      "Слева — навигация по разделам проекта. Каждая иконка открывает свой режим работы.",
    disableBeacon: true,
    placement: "right",
  },

  // ── Step 5: Sidebar — script ─────────────────────────────
  {
    target: '[data-tutorial="sidebar-script"]',
    title: "Сценарий",
    content:
      "Основной режим — редактор сценария со списком сцен для быстрой навигации.",
    disableBeacon: true,
    placement: "right",
  },

  // ── Step 6: Sidebar — bible ──────────────────────────────
  {
    target: '[data-tutorial="sidebar-bible"]',
    title: "Библия проекта",
    content:
      "Центральный документ проекта — мир, правила, справочная информация. Всё в одном месте.",
    disableBeacon: true,
    placement: "right",
  },

  // ── Step 7: Sidebar — characters ─────────────────────────
  {
    target: '[data-tutorial="sidebar-chars"]',
    title: "Персонажи",
    content:
      "Список всех персонажей с описаниями и статистикой появлений. В демо-проекте уже загружены 14 персонажей «Начала».",
    disableBeacon: true,
    placement: "right",
  },

  // ── Step 8: Sidebar — locations ──────────────────────────
  {
    target: '[data-tutorial="sidebar-locs"]',
    title: "Локации",
    content:
      "Все места действия вашего сценария. В демо загружены 26 локаций, сгруппированных по уровням сна.",
    disableBeacon: true,
    placement: "right",
  },

  // ── Step 9: Right panel overview ─────────────────────────
  {
    target: '[data-tutorial="right-panel"]',
    title: "Правая панель",
    content:
      "Справа — аналитика, чат с ИИ, комментарии и контекст. Переключайтесь между вкладками.",
    disableBeacon: true,
    placement: "left",
  },

  // ── Step 10: Right panel — analysis tab ──────────────────
  {
    target: '[data-tutorial="right-panel-analysis"]',
    title: "Анализ",
    content:
      "ИИ анализирует ваш сценарий: Beat Sheet (ключевые повороты), структура, ритм, консистентность, граф знаний. В демо-проекте все анализы уже предрассчитаны.",
    disableBeacon: true,
    placement: "left",
  },

  // ── Step 11: Right panel — chat tab ──────────────────────
  {
    target: '[data-tutorial="right-panel-chat"]',
    title: "Чат с ИИ",
    content:
      "Задавайте вопросы о сценарии, просите совет, генерируйте идеи. ИИ знает контекст всего проекта.",
    disableBeacon: true,
    placement: "left",
  },

  // ── Step 12: Right panel — comments tab ──────────────────
  {
    target: '[data-tutorial="right-panel-comments"]',
    title: "Комментарии",
    content:
      "Все комментарии к сценарию в одном месте — как в Google Docs. Удобно для совместной работы.",
    disableBeacon: true,
    placement: "left",
  },

  // ── Step 13: Settings ────────────────────────────────────
  {
    target: '[data-tutorial="sidebar-settings"]',
    title: "Настройки и экспорт",
    content:
      "В настройках — экспорт в PDF, FDX или Fountain, выбор ИИ-провайдера и параметры проекта.",
    disableBeacon: true,
    placement: "right",
  },

  // ── Step 14: Finish ──────────────────────────────────────
  {
    target: '[data-tutorial="editor"]',
    title: "Туториал завершён! 🎬",
    content:
      "Вы познакомились со всеми основными функциями Script. Демо-проект «Начало» останется в вашем аккаунте — экспериментируйте! Повторить туториал можно в Настройках.",
    disableBeacon: true,
    placement: "center",
  },
];

export const TOTAL_STEPS = ALL_TUTORIAL_STEPS.length;

/**
 * Map logical tutorial step (1-based, from DB) to joyride step index (0-based).
 * Step 0 = not started, step >= TOTAL_STEPS = completed.
 */
export function logicalStepToJoyrideIndex(logicalStep: number): number {
  return Math.max(0, Math.min(logicalStep - 1, ALL_TUTORIAL_STEPS.length - 1));
}
