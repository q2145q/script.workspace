"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  PenTool,
  Sparkles,
  Wand2,
  MessageSquareText,
  History,
  Clapperboard,
  MessageCircle,
  FileDown,
  Film,
  Tv,
  Plus,
  Menu,
  X,
  Check,
  Zap,
  Quote,
  Users,
} from "lucide-react";

/* ================================================================
   DATA
   ================================================================ */

interface ScreenplayLine {
  type: "heading" | "action" | "character" | "dialogue" | "parenthetical";
  text: string;
  pause?: number;
}

const SCREENPLAY: ScreenplayLine[] = [
  { type: "heading", text: 'INT. КАФЕ "ЛУНА" — ДЕНЬ', pause: 500 },
  {
    type: "action",
    text: "Маленькое кафе в центре Москвы. Дождь за окном.",
    pause: 300,
  },
  {
    type: "action",
    text: "АННА (32) сидит за столиком, листает блокнот.",
    pause: 400,
  },
  { type: "character", text: "АННА", pause: 200 },
  {
    type: "dialogue",
    text: "Мне нужна розетка. Срочно. У меня дедлайн.",
    pause: 500,
  },
  { type: "character", text: "ОФИЦИАНТ", pause: 200 },
  { type: "parenthetical", text: "(указывает на стену)", pause: 200 },
  { type: "dialogue", text: "Вон там, у колонны.", pause: 0 },
];

const SIDEBAR_SCENES = [
  { num: 1, text: 'INT. КАФЕ "ЛУНА" — ДЕНЬ', active: true },
  { num: 2, text: "EXT. УЛИЦА — ВЕЧЕР" },
  { num: 3, text: "INT. КВАРТИРА АННЫ — НОЧЬ" },
  { num: 4, text: "INT. РЕДАКЦИЯ — УТРО" },
  { num: 5, text: "EXT. НАБЕРЕЖНАЯ — ДЕНЬ" },
];

const FEATURES = [
  {
    icon: PenTool,
    title: "Screenplay-форматирование",
    desc: "6 типов элементов: сцены, экшн, персонаж, диалог, ремарка, переход. Горячие клавиши и автоформатирование.",
  },
  {
    icon: Sparkles,
    title: "Умное автодополнение",
    desc: "Подсказки для INT./EXT., локаций и имён персонажей. Понимает русский и английский.",
  },
  {
    icon: Wand2,
    title: "AI-переписывание (Cmd+K)",
    desc: "Выделите текст, опишите что изменить — получите diff с превью. Работает через OpenAI и Claude.",
  },
  {
    icon: MessageSquareText,
    title: "AI-чат с контекстом",
    desc: "Чат знает ваш сценарий, библию проекта и закреплённые заметки. Потоковые ответы.",
  },
  {
    icon: History,
    title: "Версии и черновики",
    desc: "Сохраняйте снапшоты, просматривайте историю изменений, восстанавливайте любую версию.",
  },
  {
    icon: Clapperboard,
    title: "Сериалы и эпизоды",
    desc: "Поддержка TV-формата: несколько эпизодов в одном проекте, каждый со своим документом.",
  },
  {
    icon: MessageCircle,
    title: "Комментарии к тексту",
    desc: "Тредовые комментарии, привязанные к позиции в тексте. Resolve / unresolve.",
  },
  {
    icon: FileDown,
    title: "Экспорт PDF и DOCX",
    desc: "Настройка титульного листа, нумерации сцен, страниц, размера бумаги и водяного знака.",
  },
];

const PRICING = [
  {
    name: "FREE",
    price: "0 ₽",
    period: "",
    features: [
      "1 проект",
      "Screenplay-форматирование",
      "Экспорт PDF / DOCX",
      "Базовый редактор",
    ],
    cta: "Начать бесплатно",
    featured: false,
  },
  {
    name: "PRO",
    price: "1 999 ₽",
    period: "/ мес",
    features: [
      "До 5 проектов",
      "AI Rewrite и AI Chat (GPT-5)",
      "Лимиты на AI-запросы",
      "Комментарии и черновики",
      "Сериалы / эпизоды",
    ],
    cta: "Получить PRO",
    featured: true,
  },
  {
    name: "МАКС",
    price: "6 582 ₽",
    period: "/ мес",
    features: [
      "Безлимитные проекты",
      "Claude + GPT-5 + DeepSeek без лимитов",
      "Все функции без ограничений",
      "Приоритетная поддержка",
    ],
    cta: "Получить МАКС",
    featured: false,
  },
];

const FAQ = [
  {
    q: "Что такое Script Workspace?",
    a: "Script Workspace — это браузерный редактор сценариев с AI-ассистентом. Он заменяет Final Draft и Google Docs, поддерживая профессиональное форматирование screenplay, AI-переписывание, комментарии, версии и экспорт в PDF/DOCX.",
  },
  {
    q: "Чем отличается от Final Draft или Celtx?",
    a: "Script Workspace работает прямо в браузере — ничего устанавливать не нужно. Встроенный AI-ассистент помогает переписывать реплики, анализировать структуру и генерировать идеи. Вы подключаете свой API-ключ и платите провайдеру напрямую, без наценок.",
  },
  {
    q: "Как работает AI Rewrite?",
    a: "Выделите текст в сценарии, нажмите Cmd+K (или Ctrl+K) и опишите, что хотите изменить. AI сгенерирует вариант, и вы увидите diff с подсветкой изменений — зелёным добавления, красным удаления. Примените или отклоните одним кликом.",
  },
  {
    q: "Нужно ли покупать подписку на ChatGPT/Claude отдельно?",
    a: "Нет. Все AI-модели уже подключены и работают из коробки. В зависимости от тарифного плана вам доступны GPT-5, Claude, DeepSeek и YandexGPT. Никаких дополнительных подписок не требуется.",
  },
  {
    q: "Мои данные в безопасности?",
    a: "Да. API-ключи хранятся в зашифрованном виде (AES-256-GCM). Ваши сценарии хранятся на защищённых серверах. Мы не используем ваш контент для обучения моделей.",
  },
  {
    q: "Когда выйдет стабильная версия?",
    a: "Сейчас продукт в стадии бета-тестирования. Мы активно дорабатываем функциональность на основе обратной связи от пользователей. Присоединяйтесь к бете, чтобы повлиять на развитие продукта.",
  },
  {
    q: "Можно ли работать с командой?",
    a: "Да. Вы можете приглашать участников в проект с разными ролями: редактор, комментатор или наблюдатель. Комментарии привязаны к конкретным позициям в тексте и поддерживают треды.",
  },
];

const LANGUAGES = [
  { flag: "🇷🇺", name: "Русский" },
  { flag: "🇬🇧", name: "English" },
  { flag: "🇫🇷", name: "Français" },
  { flag: "🇩🇪", name: "Deutsch" },
  { flag: "🇪🇸", name: "Español" },
  { flag: "🇮🇹", name: "Italiano" },
  { flag: "🇵🇹", name: "Português" },
  { flag: "🇰🇷", name: "한국어" },
  { flag: "🇯🇵", name: "日本語" },
  { flag: "🇨🇳", name: "中文" },
];

/* ================================================================
   HOOKS
   ================================================================ */

function useInView(
  threshold = 0.15
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}

function useTypewriter(lines: ScreenplayLine[], speed = 30) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!started || done) return;
    if (lineIdx >= lines.length) {
      setDone(true);
      return;
    }

    const line = lines[lineIdx]!;
    if (charIdx < line.text.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), speed);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(
        () => {
          if (lineIdx + 1 >= lines.length) {
            setDone(true);
            return;
          }
          setLineIdx((l) => l + 1);
          setCharIdx(0);
        },
        line.pause ?? 300
      );
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx, started, done, lines, speed]);

  const visible = lines.slice(0, lineIdx + 1).map((line, i) => ({
    ...line,
    display: i < lineIdx ? line.text : line.text.slice(0, charIdx),
    cursor: i === lineIdx && !done,
  }));

  return { visible, start: () => setStarted(true), done };
}

/* ================================================================
   SECTION: Header
   ================================================================ */

function Header({ scrolled }: { scrolled: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className={`landing-header ${scrolled ? "scrolled" : ""}`}>
      <div className="landing-container flex items-center justify-between h-16">
        <Link
          href="/"
          className="flex items-center gap-2.5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/yomi-light.svg" alt="YOMI" className="h-7 w-auto" />
          <span className="text-xs tracking-widest uppercase" style={{ color: "var(--l-text-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.15em" }}>Script</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollTo("features")}
            className="landing-nav-link"
          >
            Возможности
          </button>
          <button
            onClick={() => scrollTo("pricing")}
            className="landing-nav-link"
          >
            Тарифы
          </button>
          <Link href="/sign-in" className="landing-nav-link">
            Войти
          </Link>
          <Link href="/sign-up" className="btn-primary text-sm">
            Бета-доступ
          </Link>
        </nav>

        <button
          className="md:hidden text-[var(--l-text)]"
          style={{ background: "none", border: "none", cursor: "pointer" }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Меню"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="landing-mobile-menu">
          <button onClick={() => scrollTo("features")}>Возможности</button>
          <button onClick={() => scrollTo("pricing")}>Тарифы</button>
          <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
            Войти
          </Link>
          <Link
            href="/sign-up"
            className="btn-primary text-center"
            onClick={() => setMobileOpen(false)}
          >
            Бета-доступ
          </Link>
        </div>
      )}
    </header>
  );
}

/* ================================================================
   SECTION: Hero
   ================================================================ */

function HeroSection() {
  const [loaded, setLoaded] = useState(false);
  const tw = useTypewriter(SCREENPLAY, 28);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoaded(true);
      tw.start();
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center pt-20"
      style={{ background: "var(--l-bg)" }}
    >
      <div className="hero-bg-lines" />
      <div className="hero-glow" />

      <div className="landing-container w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: text */}
          <div
            className={`hero-stagger flex-1 max-w-xl ${loaded ? "loaded" : ""}`}
          >
            <div>
              <span className="beta-badge">BETA</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl leading-tight mt-6"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Пишите сценарии.
              <br />
              <span style={{ color: "var(--l-accent)" }}>С AI-соавтором.</span>
            </h1>

            <p
              className="mt-6 text-base lg:text-lg leading-relaxed"
              style={{ color: "var(--l-text-dim)", maxWidth: 480 }}
            >
              Профессиональный редактор сценариев с интеллектуальным
              автодополнением, AI-переписыванием и совместной работой. Для
              сценаристов, которые серьёзно относятся к своему ремеслу.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link href="/sign-up" className="btn-primary">
                <PenTool size={16} />
                Получить бета-доступ
              </Link>
              <Link href="/sign-in" className="btn-secondary">
                Войти
              </Link>
            </div>

            <p
              className="mt-6 text-xs"
              style={{ color: "var(--l-text-muted)" }}
            >
              Бесплатный тариф — без карты. Присоединяйтесь к бете.
            </p>
          </div>

          {/* Right: editor mockup */}
          <div className="flex-1 w-full max-w-2xl">
            <div className="editor-mockup">
              <div className="editor-mockup-titlebar">
                <div className="editor-dot" style={{ background: "#ff5f57" }} />
                <div className="editor-dot" style={{ background: "#febc2e" }} />
                <div className="editor-dot" style={{ background: "#28c840" }} />
                <span
                  className="ml-3 text-xs"
                  style={{ color: "#52525b", fontFamily: "var(--font-body)" }}
                >
                  Без названия — Script Workspace
                </span>
              </div>

              <div className="editor-mockup-body">
                {/* Mini sidebar */}
                <div className="editor-mockup-sidebar">
                  <div
                    className="px-3 pb-2 mb-1 text-[10px] uppercase tracking-wider"
                    style={{
                      color: "#52525b",
                      borderBottom: "1px solid #1e1e28",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Сцены
                  </div>
                  {SIDEBAR_SCENES.map((s) => (
                    <div
                      key={s.num}
                      className={`editor-mockup-sidebar-item ${s.active ? "active" : ""}`}
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <span style={{ opacity: 0.4, fontSize: 10 }}>
                        {s.num}
                      </span>
                      {s.text}
                    </div>
                  ))}
                </div>

                {/* Editor content with typewriter */}
                <div className="editor-mockup-content">
                  {tw.visible.map((line, i) => (
                    <div key={i} className={`mock-${line.type}`}>
                      {line.display}
                      {line.cursor && <span className="tw-cursor" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION: Editor Showcase
   ================================================================ */

function EditorShowcase() {
  const [tab, setTab] = useState(0);
  const [ref, visible] = useInView(0.1);

  const tabs = [
    { label: "Редактор", icon: "📄" },
    { label: "AI Rewrite", icon: "🤖" },
    { label: "AI Chat", icon: "💬" },
    { label: "Структура", icon: "🗂" },
  ];

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-4 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Редактор, который понимает{" "}
            <span style={{ color: "var(--l-accent)" }}>screenplay</span>
          </h2>
          <p
            className="text-center mb-10 max-w-2xl mx-auto"
            style={{ color: "var(--l-text-dim)", fontSize: "1rem" }}
          >
            Профессиональное форматирование, AI-инструменты и управление
            структурой — в одном рабочем пространстве.
          </p>
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          <div className="showcase-tabs justify-center mb-6 flex">
            {tabs.map((t, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={`showcase-tab ${tab === i ? "active" : ""}`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="showcase-panel">
            {tab === 0 && <ShowcaseEditor />}
            {tab === 1 && <ShowcaseRewrite />}
            {tab === 2 && <ShowcaseChat />}
            {tab === 3 && <ShowcaseStructure />}
          </div>
        </div>
      </div>
    </section>
  );
}

function ShowcaseEditor() {
  return (
    <div className="p-6 sm:p-8" style={{ fontFamily: "'Courier Prime', monospace" }}>
      <div
        className="mb-4 pb-3 flex items-center gap-3"
        style={{ borderBottom: "1px solid #1e1e28" }}
      >
        <span
          className="text-xs px-3 py-1 rounded"
          style={{ background: "#1a1a24", color: "#818cf8" }}
        >
          SCENE HEADING
        </span>
        <span className="text-xs" style={{ color: "#52525b" }}>
          ▾
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: "#1a1a24", color: "#71717a" }}
        >
          B
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded italic"
          style={{ background: "#1a1a24", color: "#71717a" }}
        >
          I
        </span>
      </div>

      <div className="mock-heading">INT. КВАРТИРА АННЫ — НОЧЬ</div>
      <div className="mock-action">
        Тесная однокомнатная квартира. Везде стопки книг и сценариев. Экран
        ноутбука — единственный источник света.
      </div>
      <div className="mock-action">
        АННА (32) сидит на полу, прислонившись к дивану. Перед ней — ноутбук с
        открытым Script Workspace. Пальцы замерли над клавиатурой.
      </div>
      <div className="mock-character">АННА</div>
      <div className="mock-parenthetical">(шёпотом, самой себе)</div>
      <div className="mock-dialogue">
        Ладно. Одна хорошая сцена. Только одна. И можно спать.
      </div>
      <div className="mock-action" style={{ marginTop: "0.75em" }}>
        Она делает глубокий вдох и начинает печатать. Буквы появляются на
        экране одна за другой.
      </div>
      <div className="mock-heading" style={{ marginTop: "1.5em" }}>
        INT. РЕДАКЦИЯ ЖУРНАЛА — ДЕНЬ (СЦЕНАРИЙ АННЫ)
      </div>
      <div className="mock-action">
        Шумный open-space. Десятки столов, бумаги, кофейные стаканы.
      </div>
    </div>
  );
}

function ShowcaseRewrite() {
  return (
    <div className="p-6 sm:p-8">
      <div
        className="mb-5 text-xs"
        style={{ color: "#71717a", fontFamily: "var(--font-body)" }}
      >
        Выделенный текст в редакторе:
      </div>

      <div
        className="p-4 rounded-lg mb-5"
        style={{
          background: "rgba(99, 102, 241, 0.08)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          fontFamily: "'Courier Prime', monospace",
          fontSize: 13,
          color: "#a1a1aa",
        }}
      >
        Ладно. Одна хорошая сцена. Только одна. И можно спать.
      </div>

      <div className="mock-cmd-bar mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Wand2
            size={14}
            style={{ color: "#818cf8" }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: "#818cf8", fontFamily: "var(--font-body)" }}
          >
            AI Rewrite
          </span>
        </div>
        <div
          className="text-sm"
          style={{ color: "#d4d4d8", fontFamily: "var(--font-body)" }}
        >
          Сделай реплику более отчаянной и уставшей
        </div>
      </div>

      <div
        className="text-xs mb-3"
        style={{ color: "#71717a", fontFamily: "var(--font-body)" }}
      >
        Результат:
      </div>
      <div
        className="rounded-lg overflow-hidden"
        style={{
          fontFamily: "'Courier Prime', monospace",
          fontSize: 13,
          border: "1px solid #1e1e28",
        }}
      >
        <div className="diff-remove">
          Ладно. Одна хорошая сцена. Только одна. И можно спать.
        </div>
        <div className="diff-add">
          Господи. Хоть одну сцену. Одну нормальную сцену за этот бесконечный
          день. Потом — спать. Обещаю.
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          className="text-xs px-4 py-2 rounded-lg"
          style={{
            background: "rgba(74, 222, 128, 0.15)",
            color: "#4ade80",
            border: "1px solid rgba(74, 222, 128, 0.3)",
            fontFamily: "var(--font-body)",
          }}
        >
          ✓ Apply
        </button>
        <button
          className="text-xs px-4 py-2 rounded-lg"
          style={{
            background: "rgba(248, 113, 113, 0.1)",
            color: "#f87171",
            border: "1px solid rgba(248, 113, 113, 0.2)",
            fontFamily: "var(--font-body)",
          }}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}

function ShowcaseChat() {
  return (
    <div
      className="p-6 sm:p-8 flex flex-col gap-4"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div
        className="text-xs pb-3 flex items-center gap-2"
        style={{ color: "#71717a", borderBottom: "1px solid #1e1e28" }}
      >
        <MessageSquareText size={14} style={{ color: "#818cf8" }} />
        AI Chat — контекст: Сцена 1, Библия проекта
      </div>

      <div className="mock-chat-user">
        Как можно усилить напряжение в сцене с Анной в кафе? Сейчас она
        выглядит слишком спокойной.
      </div>

      <div className="mock-chat-ai">
        <p className="mb-2">
          Вот несколько способов усилить напряжение в этой сцене:
        </p>
        <p className="mb-2">
          <strong style={{ color: "#e4e4e7" }}>1. Добавьте таймер.</strong>{" "}
          Пусть Анна постоянно смотрит на часы — у неё встреча через 20 минут, а
          она ещё не дописала.
        </p>
        <p className="mb-2">
          <strong style={{ color: "#e4e4e7" }}>2. Физическое напряжение.</strong>{" "}
          Опишите дрожащие пальцы, стиснутую челюсть, остывший кофе, к которому
          она не притронулась.
        </p>
        <p>
          <strong style={{ color: "#e4e4e7" }}>3. Внешний конфликт.</strong>{" "}
          Пусть официант начнёт намекать, что кафе скоро закрывается.
        </p>
      </div>

      <div className="mock-chat-user">Отлично, попробую вариант с таймером.</div>

      <div
        className="flex items-center gap-2 px-4 py-3 rounded-xl"
        style={{ background: "#111116", border: "1px solid #1e1e28" }}
      >
        <span className="text-sm" style={{ color: "#52525b" }}>
          Спросите AI о вашем сценарии...
        </span>
      </div>
    </div>
  );
}

function ShowcaseStructure() {
  const cards = [
    {
      num: 1,
      heading: 'INT. КАФЕ "ЛУНА" — ДЕНЬ',
      summary: "Анна за ноутбуком. Дедлайн. Диалог с официантом.",
      color: "#818cf8",
    },
    {
      num: 2,
      heading: "EXT. УЛИЦА — ВЕЧЕР",
      summary: "Анна выходит из кафе. Звонок от продюсера. Плохие новости.",
      color: "#e8c97a",
    },
    {
      num: 3,
      heading: "INT. КВАРТИРА АННЫ — НОЧЬ",
      summary: "Бессонница. Переписывает сцену в третий раз.",
      color: "#4ade80",
    },
    {
      num: 4,
      heading: "INT. РЕДАКЦИЯ — УТРО",
      summary: "Встреча с редактором. Сценарий принят с правками.",
      color: "#f87171",
    },
    {
      num: 5,
      heading: "EXT. НАБЕРЕЖНАЯ — ДЕНЬ",
      summary: "Анна читает финальную версию. Улыбается впервые за неделю.",
      color: "#818cf8",
    },
    {
      num: 6,
      heading: "INT. СТУДИЯ — ДЕНЬ",
      summary: "Первая читка с актёрами. Анна наблюдает из-за кулис.",
      color: "#e8c97a",
    },
  ];

  return (
    <div className="p-6 sm:p-8">
      <div
        className="text-xs pb-3 mb-5 flex items-center gap-2"
        style={{
          color: "#71717a",
          borderBottom: "1px solid #1e1e28",
          fontFamily: "var(--font-body)",
        }}
      >
        <span>🗂</span> Outline — Corkboard
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.num} className="mock-scene-card">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: c.color }}
              />
              <span
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: "#71717a", fontFamily: "var(--font-body)" }}
              >
                Сцена {c.num}
              </span>
            </div>
            <div
              className="text-xs font-bold mb-1"
              style={{
                fontFamily: "'Courier Prime', monospace",
                color: "#e4e4e7",
              }}
            >
              {c.heading}
            </div>
            <div
              className="text-xs"
              style={{ color: "#71717a", fontFamily: "var(--font-body)" }}
            >
              {c.summary}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   SECTION: Features
   ================================================================ */

function FeaturesSection() {
  const [ref, visible] = useInView(0.05);

  return (
    <section id="features" ref={ref} className="landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-4 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Всё для профессионального{" "}
            <span style={{ color: "var(--l-accent)" }}>сценариста</span>
          </h2>
          <p
            className="text-center mb-12 max-w-xl mx-auto"
            style={{ color: "var(--l-text-dim)" }}
          >
            Инструменты, которые ускоряют работу и не мешают творческому
            процессу.
          </p>
        </div>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger ${visible ? "visible" : ""}`}
        >
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card reveal">
              <div className="feature-icon">
                <f.icon size={20} />
              </div>
              <h3
                className="text-sm font-semibold mb-2"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--l-text)",
                }}
              >
                {f.title}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--l-text-dim)" }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION: AI (BYOK)
   ================================================================ */

function AISection() {
  const [ref, visible] = useInView();

  const providers = [
    { name: "OpenAI", sub: "GPT-5" },
    { name: "Anthropic", sub: "Claude" },
    { name: "DeepSeek", sub: "V3" },
    { name: "Алиса", sub: "YandexGPT" },
  ];

  return (
    <section ref={ref} className="landing-section">
      <div className="section-divider mb-16" />
      <div className="landing-container">
        <div
          className={`reveal ${visible ? "visible" : ""} max-w-3xl mx-auto text-center`}
        >
          <h2
            className="text-3xl sm:text-4xl mb-6"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Лучшие AI-модели.{" "}
            <span style={{ color: "var(--l-accent)" }}>Уже подключены.</span>
          </h2>
          <p
            className="text-base mb-10 leading-relaxed"
            style={{ color: "var(--l-text-dim)" }}
          >
            Мы даём вам доступ к самым мощным языковым моделям — для
            переписывания реплик, анализа структуры и генерации идей. Всё
            работает из коробки, ничего настраивать не нужно.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {providers.map((p, i) => (
              <div key={i} className="provider-logo flex-col gap-1">
                <span className="text-sm font-semibold" style={{ color: "var(--l-text)" }}>{p.name}</span>
                <span className="text-[10px]" style={{ color: "var(--l-text-muted)" }}>{p.sub}</span>
              </div>
            ))}
          </div>

          <p
            className="mt-8 text-xs"
            style={{ color: "var(--l-text-muted)" }}
          >
            Данные в безопасности · Шифрование AES-256 · Серверы в ЕС
          </p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION: Audience
   ================================================================ */

function AudienceSection() {
  const [ref, visible] = useInView();

  const items = [
    {
      icon: PenTool,
      title: "Сценаристы",
      desc: "Профессиональный инструмент вместо Final Draft. Форматирование, AI-помощник и фокус на тексте.",
    },
    {
      icon: Film,
      title: "Продюсеры",
      desc: "Просматривайте и комментируйте материал команды. Отслеживайте версии и статус работы.",
    },
    {
      icon: Tv,
      title: "Шоураннеры",
      desc: "Управляйте эпизодами сериала в едином пространстве. Библия проекта и контекст для AI.",
    },
  ];

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-12 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Для кого{" "}
            <span style={{ color: "var(--l-accent)" }}>Script Workspace</span>
          </h2>
        </div>

        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 stagger ${visible ? "visible" : ""}`}
        >
          {items.map((item, i) => (
            <div key={i} className="audience-card reveal">
              <div className="audience-icon">
                <item.icon size={24} />
              </div>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--l-text-dim)" }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION: Social Proof
   ================================================================ */

const TESTIMONIALS = [
  {
    quote:
      "Наконец-то редактор, который понимает screenplay-формат и не мешает писать. AI Rewrite экономит часы на полировке диалогов.",
    name: "Алексей К.",
    role: "Сценарист, кинокомпания «Нон-стоп»",
  },
  {
    quote:
      "Перешла с Final Draft — не пожалела. Всё в браузере, ничего устанавливать не нужно. А AI-чат помогает выбраться из тупика.",
    name: "Мария С.",
    role: "Фрилансер-сценарист",
  },
  {
    quote:
      "Управляю сериалом на 10 эпизодов — библия, структура, заметки в одном месте. Команде тоже удобно комментировать.",
    name: "Дмитрий Л.",
    role: "Шоураннер",
  },
];

const STATS = [
  { value: "120+", label: "Сценаристов в бете" },
  { value: "800+", label: "Проектов создано" },
  { value: "50K+", label: "AI-запросов обработано" },
];

function SocialProofSection() {
  const [ref, visible] = useInView(0.1);

  return (
    <section ref={ref} className="landing-section">
      <div className="section-divider mb-16" />
      <div className="landing-container">
        {/* Stats bar */}
        <div
          className={`reveal ${visible ? "visible" : ""} flex flex-wrap justify-center gap-8 sm:gap-16 mb-16`}
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div
                className="text-3xl sm:text-4xl font-bold mb-1"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--l-accent)",
                }}
              >
                {stat.value}
              </div>
              <div
                className="text-xs sm:text-sm"
                style={{ color: "var(--l-text-muted)" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-10 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Что говорят{" "}
            <span style={{ color: "var(--l-accent)" }}>сценаристы</span>
          </h2>
        </div>

        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 stagger ${visible ? "visible" : ""}`}
        >
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="testimonial-card reveal">
              <Quote
                size={20}
                style={{ color: "var(--l-accent)", opacity: 0.5, marginBottom: "0.75rem" }}
              />
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: "var(--l-text-dim)" }}
              >
                {t.quote}
              </p>
              <div className="flex items-center gap-3 mt-auto">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: "var(--l-accent-dim)",
                    color: "var(--l-accent)",
                  }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--l-text)" }}
                  >
                    {t.name}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--l-text-muted)" }}
                  >
                    {t.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION: Pricing
   ================================================================ */

function PricingSection() {
  const [ref, visible] = useInView(0.1);

  return (
    <section id="pricing" ref={ref} className="landing-section">
      <div className="section-divider mb-16" />
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-4 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Тарифные планы
          </h2>
          <p
            className="text-center mb-12"
            style={{ color: "var(--l-text-dim)" }}
          >
            Начните бесплатно. Подключите AI, когда будете готовы.
          </p>
        </div>

        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto stagger ${visible ? "visible" : ""}`}
        >
          {PRICING.map((plan, i) => (
            <div
              key={i}
              className={`pricing-card reveal ${plan.featured ? "featured" : ""}`}
            >
              {plan.featured && (
                <div className="pricing-badge">Популярный</div>
              )}

              <h3
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{
                  color: plan.featured
                    ? "var(--l-accent)"
                    : "var(--l-text-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {plan.name}
              </h3>

              <div className="mb-6">
                <span
                  className="text-3xl font-bold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span
                    className="text-sm ml-1"
                    style={{ color: "var(--l-text-muted)" }}
                  >
                    {plan.period}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((f, j) => (
                  <div key={j} className="pricing-feature">
                    <div className="pricing-check">
                      <Check size={10} />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/sign-up"
                className={plan.featured ? "btn-primary w-full justify-center" : "btn-secondary w-full justify-center"}
                style={{ fontFamily: "var(--font-body)" }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION: Languages
   ================================================================ */

function LanguagesSection() {
  const [ref, visible] = useInView();

  return (
    <section ref={ref} style={{ padding: "3rem 0 2rem" }}>
      <div className="landing-container text-center">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-2xl sm:text-3xl mb-3"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Пишите на{" "}
            <span style={{ color: "var(--l-accent)" }}>любом языке</span>
          </h2>
          <p className="mb-6 text-sm" style={{ color: "var(--l-text-dim)" }}>
            Интерфейс, подсказки редактора и AI-ответы адаптируются под язык
            проекта.
          </p>
        </div>

        <div
          className={`flex flex-wrap justify-center gap-2.5 reveal ${visible ? "visible" : ""}`}
        >
          {LANGUAGES.map((lang) => (
            <div key={lang.name} className="lang-chip">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION: FAQ
   ================================================================ */

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="landing-section">
      <div className="section-divider mb-16" />
      <div className="landing-container max-w-3xl mx-auto">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-10 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Частые вопросы
          </h2>
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          {FAQ.map((item, i) => (
            <div
              key={i}
              className={`faq-item ${openIdx === i ? "open" : ""}`}
            >
              <button
                className="faq-question"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{ fontFamily: "var(--font-body)" }}
              >
                <span>{item.q}</span>
                <Plus size={18} className="faq-toggle-icon" />
              </button>
              <div className="faq-answer">
                <p
                  className="pb-5 text-sm leading-relaxed"
                  style={{
                    color: "var(--l-text-dim)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION: Final CTA
   ================================================================ */

function FinalCTA() {
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="cta-section py-24 sm:py-32">
      <div
        className={`landing-container text-center relative z-10 reveal ${visible ? "visible" : ""}`}
      >
        <h2
          className="text-3xl sm:text-4xl lg:text-5xl mb-6"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          Ваш следующий сценарий
          <br />
          <span style={{ color: "var(--l-accent)" }}>начинается здесь.</span>
        </h2>
        <p
          className="text-base mb-8 max-w-md mx-auto"
          style={{ color: "var(--l-text-dim)" }}
        >
          Получите ранний доступ — пока идёт бета.
        </p>
        <Link href="/sign-up" className="btn-primary text-base">
          <PenTool size={18} />
          Получить бета-доступ
        </Link>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION: Footer
   ================================================================ */

function LandingFooter() {
  return (
    <footer
      className="py-10"
      style={{ borderTop: "1px solid var(--l-border)" }}
    >
      <div className="landing-container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/yomi-light.svg" alt="YOMI" className="h-5 w-auto" />
            <span className="text-xs tracking-widest uppercase" style={{ color: "var(--l-text-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.12em" }}>Script</span>
          </Link>

          <div
            className="flex items-center gap-6 text-xs"
            style={{ color: "var(--l-text-muted)" }}
          >
            <button
              onClick={() =>
                document
                  .getElementById("pricing")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="hover:text-[var(--l-text-dim)] transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              Тарифы
            </button>
            <Link
              href="/sign-in"
              className="hover:text-[var(--l-text-dim)] transition-colors"
            >
              Войти
            </Link>
            <Link
              href="/sign-up"
              className="hover:text-[var(--l-text-dim)] transition-colors"
            >
              Регистрация
            </Link>
          </div>

          <span
            className="text-xs"
            style={{ color: "var(--l-text-muted)" }}
          >
            &copy; 2026 YOMI Film. Все права защищены.
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing">
      <Header scrolled={scrolled} />
      <main>
        <HeroSection />
        <EditorShowcase />
        <FeaturesSection />
        <AISection />
        <AudienceSection />
        <SocialProofSection />
        <PricingSection />
        <LanguagesSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
