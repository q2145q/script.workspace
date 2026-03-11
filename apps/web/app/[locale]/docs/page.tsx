import type { Metadata } from "next";
import Link from "next/link";
import "../landing.css";
import "../docs.css";
import { DocsHeader } from "@/components/docs/docs-header";
import { DocsFooter } from "@/components/docs/docs-footer";
import { DocsNav } from "@/components/docs/docs-nav";
import { MockupEditor } from "@/components/docs/mockup-editor";
import { MockupRewrite } from "@/components/docs/mockup-rewrite";
import { MockupChat } from "@/components/docs/mockup-chat";
import { MockupWorkspace } from "@/components/docs/mockup-workspace";
import { MockupSceneBoard } from "@/components/docs/mockup-scene-board";
import { MockupSelectionToolbar } from "@/components/docs/mockup-selection-toolbar";
import { Kbd } from "@/components/docs/kbd";

export const metadata: Metadata = {
  title: "Документация — YOMI Script",
  description:
    "Полная документация YOMI Script — редактор сценариев, AI-инструменты, совместная работа, горячие клавиши и экспорт.",
};

export default function DocsPage() {
  return (
    <div className="landing">
      <DocsHeader />

      <div className="docs-container">
        <div className="docs-hero">
          <div className="beta-badge" style={{ marginBottom: "1rem" }}>
            Документация
          </div>
          <h1>YOMI Script</h1>
          <p>
            Полное руководство по всем возможностям редактора сценариев.{" "}
            <Link href="/tutorial" style={{ color: "var(--l-accent)" }}>
              Начните с руководства →
            </Link>
          </p>
        </div>

        <div className="docs-main">
          <DocsNav />

          <div className="docs-content docs-prose">
            {/* ==================== EDITOR ==================== */}
            <h2 id="editor" className="section-anchor">
              Редактор сценариев
            </h2>
            <p>
              Редактор YOMI Script создан для профессионального написания
              сценариев. Он автоматически форматирует текст по стандартам
              киноиндустрии (US Letter, Courier 12pt) и поддерживает все типы
              сценарных блоков.
            </p>
            <MockupEditor />
            <p>
              Боковая панель слева отображает список сцен документа.
              Кликните на сцену для быстрой навигации. Активная сцена
              подсвечивается акцентным цветом.
            </p>
            <div className="docs-tip">
              <strong>Совет:</strong> Редактор поддерживает автозаполнение имён
              персонажей и локаций — начните вводить имя, и появится
              подсказка.
            </div>

            {/* ==================== BLOCK TYPES ==================== */}
            <h2 id="block-types" className="section-anchor">
              Типы блоков
            </h2>
            <p>
              Каждый абзац в сценарии имеет определённый тип. Переключайте тип
              с помощью <Kbd>Tab</Kbd> (вперёд) и <Kbd>Shift</Kbd> +{" "}
              <Kbd>Tab</Kbd> (назад).
            </p>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Тип</th>
                  <th>Описание</th>
                  <th>Форматирование</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Scene Heading</strong></td>
                  <td>Заголовок сцены — место и время действия</td>
                  <td>Заглавные буквы, начинается с INT. или EXT.</td>
                </tr>
                <tr>
                  <td><strong>Action</strong></td>
                  <td>Описание действия, обстановки, появления персонажей</td>
                  <td>Обычный текст, от левого поля</td>
                </tr>
                <tr>
                  <td><strong>Character</strong></td>
                  <td>Имя говорящего персонажа</td>
                  <td>Заглавные буквы, центрировано</td>
                </tr>
                <tr>
                  <td><strong>Dialogue</strong></td>
                  <td>Реплика персонажа</td>
                  <td>С отступами слева и справа</td>
                </tr>
                <tr>
                  <td><strong>Parenthetical</strong></td>
                  <td>Ремарка — указание для актёра</td>
                  <td>В скобках, с отступом</td>
                </tr>
                <tr>
                  <td><strong>Transition</strong></td>
                  <td>Монтажный переход</td>
                  <td>Заглавные, выровнено вправо (CUT TO:, FADE OUT.)</td>
                </tr>
              </tbody>
            </table>
            <MockupEditor annotated />

            <h3>Автоформатирование</h3>
            <p>
              Редактор автоматически распознаёт некоторые паттерны:
            </p>
            <ul>
              <li>
                Текст, начинающийся с <code>INT.</code> или <code>EXT.</code>,
                определяется как заголовок сцены
              </li>
              <li>
                После заголовка сцены автоматически создаётся блок «Действие»
              </li>
              <li>
                После имени персонажа автоматически создаётся блок «Диалог»
              </li>
              <li>
                После нажатия <Kbd>Enter</Kbd> в конце диалога — новый блок «Действие»
              </li>
            </ul>

            {/* ==================== AI TOOLS ==================== */}
            <h2 id="ai-tools" className="section-anchor">
              AI-инструменты
            </h2>
            <p>
              YOMI Script интегрирует 6 AI-провайдеров для помощи на
              каждом этапе работы над сценарием.
            </p>

            <h3>Rewrite — переписывание</h3>
            <p>
              Выделите фрагмент текста → нажмите <strong>Rewrite</strong> на панели
              инструментов (или <Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + <Kbd>K</Kbd>).
              Опишите желаемые изменения. AI покажет результат в виде diff:
              удалённый текст красным, добавленный — зелёным.
            </p>
            <MockupRewrite />

            <h3>Format — форматирование</h3>
            <p>
              Выделите неструктурированный текст (например, вставленный из
              другого документа) и нажмите <strong>Format</strong>. AI
              автоматически разобьёт его на правильные сценарные блоки.
            </p>

            <h3>Chat — AI-ассистент</h3>
            <p>
              Контекстный чат на правой панели. AI видит ваш сценарий и может
              помочь с:
            </p>
            <ul>
              <li>Развитием сюжета и структуры</li>
              <li>Написанием диалогов</li>
              <li>Анализом персонажей</li>
              <li>Брейнштормом идей</li>
              <li>Ответами на вопросы о драматургии</li>
            </ul>
            <MockupChat />
            <div className="docs-tip">
              <strong>Контекст:</strong> Используйте вкладку «Контекст» чтобы
              прикрепить фрагменты текста, документы или заметки — AI будет
              учитывать их при ответе.
            </div>

            <h3>Analysis — анализ</h3>
            <p>AI-анализ сцены или всего сценария:</p>
            <ul>
              <li><strong>Анализ сцены</strong> — цели, конфликт, ставки, эмоциональный тон, темп, проблемы</li>
              <li><strong>Анализ персонажей</strong> — арки развития, мотивации, взаимоотношения</li>
              <li><strong>Анализ структуры</strong> — соответствие классической структуре (3 акта, Save the Cat)</li>
              <li><strong>Анализ темпа</strong> — ритм, длина сцен, баланс действия и диалога</li>
              <li><strong>Проверка согласованности</strong> — логические ошибки, нестыковки, пропущенные детали</li>
            </ul>

            <h3>Генерация контента</h3>
            <ul>
              <li><strong>Logline</strong> — генерация логлайна (1-2 предложения о проекте)</li>
              <li><strong>Beat Sheet</strong> — разбор структуры по 15 битам Save the Cat</li>
              <li><strong>Synopsis</strong> — полный синопсис сценария</li>
              <li><strong>Knowledge Graph</strong> — интерактивный граф персонажей, локаций, событий и их связей</li>
            </ul>

            <h3>Выбор AI-провайдера</h3>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Провайдер</th>
                  <th>Модели</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>OpenAI</td><td>GPT-4o, GPT-4o-mini, o1, o3-mini</td></tr>
                <tr><td>Anthropic</td><td>Claude 3.5 Sonnet, Claude 3 Haiku</td></tr>
                <tr><td>DeepSeek</td><td>DeepSeek-V3, DeepSeek-R1</td></tr>
                <tr><td>Gemini</td><td>Gemini 2.0 Flash, Gemini 2.5 Pro</td></tr>
                <tr><td>Yandex</td><td>YandexGPT Pro, YandexGPT Lite</td></tr>
                <tr><td>Grok</td><td>Grok-2, Grok-3</td></tr>
              </tbody>
            </table>

            {/* ==================== WORKSPACE MODES ==================== */}
            <h2 id="workspace-modes" className="section-anchor">
              Режимы рабочего пространства
            </h2>
            <p>
              Переключайтесь между режимами через иконки в боковой панели.
            </p>
            <MockupWorkspace />

            <div style={{ marginTop: "1.5rem" }}>
              {[
                { name: "Script", desc: "Основной редактор сценария. Написание и форматирование текста." },
                { name: "Bible", desc: "Библия проекта — справочный документ с описанием мира, правил, персонажей." },
                { name: "Outline", desc: "Иерархический аутлайн — все сцены в виде списка с синопсисами." },
                { name: "Characters", desc: "База персонажей — имя, описание, характер, арка развития." },
                { name: "Locations", desc: "База локаций — названия, описания, связанные сцены." },
                { name: "Scene Board", desc: "Визуальная доска сцен в виде карточек. Перетаскивание, цветовые метки, синопсисы." },
                { name: "One-Pager", desc: "Одностраничная сводка проекта для питчинга." },
                { name: "Notes", desc: "Личные заметки по проекту. Свободный формат." },
                { name: "Versions", desc: "История версий. Сравнение изменений между черновиками." },
                { name: "Graph", desc: "Интерактивный граф знаний — визуализация связей между сущностями (d3-force)." },
              ].map((mode) => (
                <div key={mode.name} className="docs-feature-item">
                  <div className="docs-feature-icon">
                    <span style={{ fontSize: "12px", fontWeight: 700 }}>
                      {mode.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="docs-feature-text">
                    <h4>{mode.name}</h4>
                    <p>{mode.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <MockupSceneBoard />

            {/* ==================== RIGHT PANEL ==================== */}
            <h2 id="right-panel" className="section-anchor">
              Правая панель
            </h2>
            <p>
              Правая панель содержит 5 вкладок для работы с контекстом сценария:
            </p>
            <ul>
              <li><strong>Комментарии</strong> — треды, привязанные к тексту. Уведомления при ответах.</li>
              <li><strong>Чат</strong> — AI-ассистент с контекстом проекта.</li>
              <li><strong>Контекст</strong> — прикреплённые фрагменты текста, документы и заметки для AI.</li>
              <li><strong>Анализ</strong> — результаты AI-анализа сцен и сценария.</li>
              <li><strong>Активность</strong> — лог действий: редактирование, комментарии, версии.</li>
            </ul>

            {/* ==================== SELECTION TOOLBAR ==================== */}
            <h2 id="selection-toolbar" className="section-anchor">
              Панель инструментов выделения
            </h2>
            <p>
              При выделении текста в редакторе появляется плавающая панель:
            </p>
            <MockupSelectionToolbar />
            <ul>
              <li><strong>Rewrite</strong> — переписать выделенный фрагмент с помощью AI</li>
              <li><strong>Format</strong> — переформатировать в сценарные блоки</li>
              <li><strong>Comment</strong> — создать комментарий к выделенному тексту</li>
              <li><strong>Pin</strong> — прикрепить фрагмент к контексту AI</li>
            </ul>

            {/* ==================== COLLABORATION ==================== */}
            <h2 id="collaboration" className="section-anchor">
              Совместная работа
            </h2>
            <p>
              YOMI Script поддерживает совместное редактирование в реальном
              времени.
            </p>

            <h3>Приглашение участников</h3>
            <p>
              Откройте <strong>Настройки проекта</strong> → <strong>Участники</strong>.
              Введите email коллеги и выберите роль.
            </p>

            <h3>Роли</h3>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Роль</th>
                  <th>Редактирование</th>
                  <th>Комментарии</th>
                  <th>Настройки</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Владелец</strong></td>
                  <td>Да</td>
                  <td>Да</td>
                  <td>Да</td>
                </tr>
                <tr>
                  <td><strong>Редактор</strong></td>
                  <td>Да</td>
                  <td>Да</td>
                  <td>Нет</td>
                </tr>
                <tr>
                  <td><strong>Комментатор</strong></td>
                  <td>Нет</td>
                  <td>Да</td>
                  <td>Нет</td>
                </tr>
                <tr>
                  <td><strong>Зритель</strong></td>
                  <td>Нет</td>
                  <td>Нет</td>
                  <td>Нет</td>
                </tr>
              </tbody>
            </table>

            <h3>Совместное редактирование</h3>
            <p>
              Изменения синхронизируются в реальном времени через WebSocket.
              Вы видите курсоры и выделения других участников. Конфликты
              редактирования разрешаются автоматически (CRDT).
            </p>

            {/* ==================== SHORTCUTS ==================== */}
            <h2 id="shortcuts" className="section-anchor">
              Горячие клавиши
            </h2>
            <p>
              Основные клавиатурные сокращения для быстрой работы. Нажмите{" "}
              <Kbd>⌘</Kbd> + <Kbd>/</Kbd> чтобы открыть справку по клавишам
              прямо в редакторе.
            </p>

            <h3>Навигация</h3>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Действие</th>
                  <th>Клавиши</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Следующий тип блока</td>
                  <td><Kbd>Tab</Kbd></td>
                </tr>
                <tr>
                  <td>Предыдущий тип блока</td>
                  <td><Kbd>Shift</Kbd> + <Kbd>Tab</Kbd></td>
                </tr>
                <tr>
                  <td>Поиск по документу</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>F</Kbd></td>
                </tr>
                <tr>
                  <td>Глобальный поиск</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + <Kbd>F</Kbd></td>
                </tr>
                <tr>
                  <td>Справка по клавишам</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>/</Kbd></td>
                </tr>
              </tbody>
            </table>

            <h3>Редактирование</h3>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Действие</th>
                  <th>Клавиши</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Отменить</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>Z</Kbd></td>
                </tr>
                <tr>
                  <td>Повторить</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + <Kbd>Z</Kbd></td>
                </tr>
                <tr>
                  <td>Жирный</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>B</Kbd></td>
                </tr>
                <tr>
                  <td>Курсив</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>I</Kbd></td>
                </tr>
                <tr>
                  <td>Подчёркивание</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>U</Kbd></td>
                </tr>
              </tbody>
            </table>

            <h3>AI-инструменты</h3>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Действие</th>
                  <th>Клавиши</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>AI Rewrite</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + <Kbd>K</Kbd></td>
                </tr>
                <tr>
                  <td>Добавить комментарий</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + <Kbd>M</Kbd></td>
                </tr>
                <tr>
                  <td>Сохранить</td>
                  <td><Kbd>⌘</Kbd> + <Kbd>S</Kbd></td>
                </tr>
              </tbody>
            </table>

            {/* ==================== EXPORT ==================== */}
            <h2 id="export" className="section-anchor">
              Экспорт
            </h2>
            <p>
              Экспортируйте сценарий в стандартных форматах:
            </p>

            <h3>PDF</h3>
            <p>
              Стандартный формат для подачи сценариев. Настройки экспорта:
            </p>
            <ul>
              <li><strong>Титульная страница</strong> — название, автор, контактная информация</li>
              <li><strong>Нумерация сцен</strong> — автоматическая нумерация заголовков сцен</li>
              <li><strong>Нумерация страниц</strong> — позиция и формат номера страницы</li>
              <li><strong>Водяной знак</strong> — текст поверх страниц (например, «КОНФИДЕНЦИАЛЬНО»)</li>
            </ul>

            <h3>Импорт</h3>
            <p>
              Импортируйте существующие сценарии из форматов PDF, Fountain (.fountain)
              и Word (.docx). AI поможет распознать структуру и типы блоков.
            </p>

            {/* ==================== TV SERIES ==================== */}
            <h2 id="tv-series" className="section-anchor">
              Сериалы и эпизоды
            </h2>
            <p>
              При создании проекта типа «Сериал» доступна расширенная структура:
            </p>
            <ul>
              <li><strong>Эпизоды</strong> — каждый эпизод — отдельный документ со своим списком сцен</li>
              <li><strong>Навигация по эпизодам</strong> — переключение между эпизодами в боковой панели</li>
              <li><strong>Сквозные персонажи</strong> — база персонажей общая для всего сериала</li>
              <li><strong>Библия сериала</strong> — единый справочный документ для всех сезонов</li>
            </ul>
            <div className="docs-tip">
              <strong>Совет:</strong> Используйте Библию сериала для хранения общих
              правил мира, арок персонажей по сезонам и ключевых сюжетных
              поворотов.
            </div>

            {/* Bottom CTA */}
            <div style={{
              textAlign: "center" as const,
              padding: "4rem 0 2rem",
              borderTop: "1px solid var(--l-border)",
              marginTop: "3rem",
            }}>
              <p style={{ color: "var(--l-text-dim)", marginBottom: "1.5rem" }}>
                Не нашли ответ? Напишите нам:{" "}
                <a href="mailto:support@yomimovie.art" style={{ color: "var(--l-accent)" }}>
                  support@yomimovie.art
                </a>
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" as const }}>
                <Link href="/tutorial" className="btn-secondary">
                  Руководство
                </Link>
                <Link href="/sign-up" className="btn-primary">
                  Начать бесплатно
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DocsFooter />
    </div>
  );
}
