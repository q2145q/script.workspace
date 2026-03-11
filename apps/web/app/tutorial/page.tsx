import type { Metadata } from "next";
import Link from "next/link";
import "../landing.css";
import "../docs.css";
import { DocsHeader } from "../../components/docs/docs-header";
import { DocsFooter } from "../../components/docs/docs-footer";
import { MockupEditor } from "../../components/docs/mockup-editor";
import { MockupWorkspace } from "../../components/docs/mockup-workspace";
import { MockupRewrite } from "../../components/docs/mockup-rewrite";
import { MockupChat } from "../../components/docs/mockup-chat";
import { MockupSelectionToolbar } from "../../components/docs/mockup-selection-toolbar";
import { Kbd } from "../../components/docs/kbd";

export const metadata: Metadata = {
  title: "Руководство — YOMI Script",
  description:
    "Пошаговое руководство по началу работы с YOMI Script — профессиональным редактором сценариев с AI-инструментами.",
};

export default function TutorialPage() {
  return (
    <div className="landing">
      <DocsHeader />

      <main className="docs-container">
        {/* Hero */}
        <div className="tutorial-hero">
          <div className="beta-badge" style={{ marginBottom: "1.5rem" }}>
            Руководство
          </div>
          <h1>Начните работу с YOMI Script</h1>
          <p>
            Пошаговое руководство по созданию вашего первого сценария — от
            проекта до финального текста с AI-помощником.
          </p>
        </div>

        {/* Steps */}
        <div style={{ maxWidth: "48rem", margin: "0 auto", paddingBottom: "4rem" }}>
          {/* Step 1 */}
          <div className="step-card">
            <div className="step-header">
              <div className="step-number">1</div>
              <div className="step-title">Создание проекта</div>
            </div>
            <div className="docs-prose">
              <p>
                После входа в систему вы попадаете на <strong>Дашборд</strong> — страницу
                со списком ваших проектов. Нажмите кнопку <strong>&quot;Новый проект&quot;</strong> для
                создания.
              </p>
              <p>Укажите основные параметры:</p>
              <ul>
                <li>
                  <strong>Название</strong> — рабочее название вашего сценария
                </li>
                <li>
                  <strong>Тип</strong> — полнометражный фильм, сериал, короткометражка
                </li>
                <li>
                  <strong>Язык</strong> — язык сценария (русский, английский и др.)
                </li>
                <li>
                  <strong>Жанр</strong> — для более точной работы AI-ассистента
                </li>
              </ul>

              {/* Dashboard mockup */}
              <div className="mockup-wrapper">
                <div className="editor-mockup">
                  <div className="editor-mockup-titlebar">
                    <div className="editor-dot" style={{ background: "#ff5f57" }} />
                    <div className="editor-dot" style={{ background: "#febc2e" }} />
                    <div className="editor-dot" style={{ background: "#28c840" }} />
                    <span style={{ marginLeft: "12px", fontSize: "11px", color: "#71717a" }}>
                      Dashboard
                    </span>
                  </div>
                  <div style={{ padding: "20px", display: "flex", flexDirection: "column" as const, gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "#e4e4e7" }}>
                        Мои проекты
                      </span>
                      <span className="btn-primary" style={{ fontSize: "11px", padding: "6px 14px" }}>
                        + Новый проект
                      </span>
                    </div>
                    {[
                      { title: "Кафе «Луна»", type: "Полнометражный", status: "В работе" },
                      { title: "Ночная смена", type: "Сериал", status: "Черновик" },
                    ].map((p) => (
                      <div
                        key={p.title}
                        style={{
                          background: "#111116",
                          border: "1px solid #23232e",
                          borderRadius: "10px",
                          padding: "14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#e4e4e7" }}>
                            {p.title}
                          </div>
                          <div style={{ fontSize: "11px", color: "#71717a", marginTop: "2px" }}>
                            {p.type}
                          </div>
                        </div>
                        <span style={{
                          fontSize: "10px",
                          padding: "3px 8px",
                          borderRadius: "100px",
                          background: "rgba(129, 140, 248, 0.1)",
                          color: "#818cf8",
                        }}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="docs-tip">
                <strong>Совет:</strong> Вы можете создать проект из шаблона —
                с предзаполненной структурой и примерами сцен.
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-card">
            <div className="step-header">
              <div className="step-number">2</div>
              <div className="step-title">Знакомство с рабочим пространством</div>
            </div>
            <div className="docs-prose">
              <p>
                Рабочее пространство состоит из трёх областей:
              </p>
              <ul>
                <li>
                  <strong>Боковая панель</strong> (слева) — навигация по режимам:
                  Сценарий, Библия, Аутлайн, Персонажи, Локации, Scene Board и др.
                </li>
                <li>
                  <strong>Редактор</strong> (центр) — основная зона написания текста
                </li>
                <li>
                  <strong>Правая панель</strong> — Чат с AI, Комментарии, Контекст,
                  Анализ, Активность
                </li>
              </ul>
              <MockupWorkspace />
              <p>
                Переключайтесь между режимами в боковой панели, чтобы работать с
                разными аспектами проекта.{" "}
                <Link href="/docs#workspace-modes">Подробнее о режимах →</Link>
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-card">
            <div className="step-header">
              <div className="step-number">3</div>
              <div className="step-title">Написание в редакторе</div>
            </div>
            <div className="docs-prose">
              <p>
                Редактор поддерживает стандартное форматирование сценария.
                Каждый абзац автоматически получает один из типов блоков:
              </p>
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Тип блока</th>
                    <th>Описание</th>
                    <th>Пример</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Заголовок сцены</strong></td>
                    <td>Место и время действия</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>INT. КАФЕ — ДЕНЬ</td>
                  </tr>
                  <tr>
                    <td><strong>Действие</strong></td>
                    <td>Описание происходящего</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>Анна входит в кафе.</td>
                  </tr>
                  <tr>
                    <td><strong>Персонаж</strong></td>
                    <td>Имя говорящего</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>АННА</td>
                  </tr>
                  <tr>
                    <td><strong>Диалог</strong></td>
                    <td>Реплика персонажа</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>Мне нужна розетка.</td>
                  </tr>
                  <tr>
                    <td><strong>Ремарка</strong></td>
                    <td>Указание для актёра</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>(шёпотом)</td>
                  </tr>
                  <tr>
                    <td><strong>Переход</strong></td>
                    <td>Монтажный переход</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>CUT TO:</td>
                  </tr>
                </tbody>
              </table>

              <MockupEditor annotated />

              <p>
                Используйте <Kbd>Tab</Kbd> для переключения типа блока вперёд
                и <Kbd>Shift</Kbd> + <Kbd>Tab</Kbd> для переключения назад.{" "}
                <Link href="/docs#block-types">Подробнее о типах блоков →</Link>
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="step-card">
            <div className="step-header">
              <div className="step-number">4</div>
              <div className="step-title">Использование AI-инструментов</div>
            </div>
            <div className="docs-prose">
              <p>
                YOMI Script предлагает мощные AI-инструменты для работы над сценарием.
                Поддерживается 6 провайдеров: OpenAI, Anthropic, DeepSeek, Gemini, Yandex, Grok.
              </p>

              <h3>Rewrite — переписывание текста</h3>
              <p>
                Выделите фрагмент текста → появится панель инструментов → нажмите
                <strong> Rewrite</strong>. Опишите, как изменить текст, и AI покажет
                результат в виде diff-сравнения.
              </p>
              <MockupSelectionToolbar />
              <MockupRewrite />

              <h3>Chat — AI-ассистент</h3>
              <p>
                Откройте вкладку <strong>Чат</strong> на правой панели. Задавайте вопросы
                о сценарии, просите помочь с диалогами, персонажами или структурой.
                AI видит контекст вашего проекта.
              </p>
              <MockupChat />

              <h3>Другие AI-инструменты</h3>
              <ul>
                <li><strong>Format</strong> — автоматически форматирует неструктурированный текст в блоки сценария</li>
                <li><strong>Analysis</strong> — анализ сцены: конфликт, темп, проблемы</li>
                <li><strong>Logline</strong> — генерация логлайна для всего проекта</li>
                <li><strong>Beat Sheet</strong> — разбор структуры по битам</li>
                <li><strong>Synopsis</strong> — генерация синопсиса</li>
                <li><strong>Knowledge Graph</strong> — интерактивный граф связей персонажей, локаций и событий</li>
              </ul>
              <p>
                <Link href="/docs#ai-tools">Полный обзор AI-инструментов →</Link>
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="step-card">
            <div className="step-header">
              <div className="step-number">5</div>
              <div className="step-title">Комментарии и совместная работа</div>
            </div>
            <div className="docs-prose">
              <p>
                Приглашайте соавторов для совместной работы над сценарием.
              </p>

              <h3>Комментарии</h3>
              <p>
                Выделите текст и нажмите <strong>Comment</strong> на панели
                инструментов — или используйте правую панель <strong>Комментарии</strong>.
                Комментарии привязываются к тексту и поддерживают треды.
              </p>

              {/* Comment thread mockup */}
              <div className="mockup-wrapper">
                <div className="mock-right-panel">
                  <div className="mock-panel-tabs">
                    <div className="mock-panel-tab active">Комментарии</div>
                    <div className="mock-panel-tab">Чат</div>
                    <div className="mock-panel-tab">Контекст</div>
                  </div>
                  <div className="mock-panel-content">
                    <div className="mock-comment">
                      <div className="mock-comment-header">
                        <div className="mock-avatar" />
                        <div>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#e4e4e7" }}>
                            Алексей
                          </span>
                          <span style={{ fontSize: "10px", color: "#52525b", marginLeft: "6px" }}>
                            2 часа назад
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5" }}>
                        Диалог Анны звучит слишком спокойно для ситуации с дедлайном. Нужно больше напряжения.
                      </div>
                    </div>
                    <div className="mock-comment" style={{ marginLeft: "20px" }}>
                      <div className="mock-comment-header">
                        <div className="mock-avatar secondary" />
                        <div>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#e4e4e7" }}>
                            Мария
                          </span>
                          <span style={{ fontSize: "10px", color: "#52525b", marginLeft: "6px" }}>
                            1 час назад
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5" }}>
                        Согласна! Попробовала через AI Rewrite — получилось хорошо. Посмотри новый вариант.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <h3>Роли участников</h3>
              <ul>
                <li><strong>Владелец</strong> — полный доступ, управление проектом</li>
                <li><strong>Редактор</strong> — может редактировать текст</li>
                <li><strong>Комментатор</strong> — может оставлять комментарии</li>
                <li><strong>Зритель</strong> — только чтение</li>
              </ul>
              <p>
                <Link href="/docs#collaboration">Подробнее о совместной работе →</Link>
              </p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="step-card">
            <div className="step-header">
              <div className="step-number">6</div>
              <div className="step-title">Экспорт и версии</div>
            </div>
            <div className="docs-prose">
              <p>
                Когда сценарий готов, экспортируйте его в нужном формате.
              </p>
              <ul>
                <li><strong>PDF</strong> — стандартный формат для подачи. Настройте титульную страницу, нумерацию сцен и страниц.</li>
                <li><strong>Версии</strong> — сохраняйте снимки версий на ключевых этапах. Сравнивайте изменения между версиями.</li>
              </ul>

              <div className="docs-tip">
                <strong>Совет:</strong> Используйте версии перед крупными изменениями —
                так вы всегда сможете вернуться к предыдущему варианту.
              </div>
              <p>
                <Link href="/docs#export">Подробнее об экспорте →</Link>
              </p>
            </div>
          </div>

          {/* Next steps */}
          <div style={{
            textAlign: "center" as const,
            padding: "3rem 0",
          }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--l-text)", marginBottom: "1rem" }}>
              Готовы начать?
            </h2>
            <p style={{ color: "var(--l-text-dim)", marginBottom: "1.5rem" }}>
              Изучите полную документацию или создайте свой первый проект.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" as const }}>
              <Link href="/docs" className="btn-secondary">
                Документация
              </Link>
              <Link href="/sign-up" className="btn-primary">
                Создать аккаунт
              </Link>
            </div>
          </div>
        </div>
      </main>

      <DocsFooter />
    </div>
  );
}
