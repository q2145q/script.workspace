import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Условия использования — Script Workspace",
  description: "Условия использования сервиса Script Workspace",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="glass-panel sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/" className="text-lg font-semibold text-foreground">
            Script Workspace
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold text-foreground">
          Условия использования
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Дата вступления в силу: 6 марта 2026 г.
        </p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Общие положения</h2>
            <p>
              Script Workspace — онлайн-сервис для создания и редактирования сценариев.
              Используя сервис, вы соглашаетесь с настоящими условиями.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Регистрация и аккаунт</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Для использования требуется регистрация.</li>
              <li>Вы несёте ответственность за сохранность учётных данных.</li>
              <li>Запрещено создание множественных аккаунтов для обхода ограничений.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Права на контент</h2>
            <p>
              Вы сохраняете все авторские права на создаваемый контент.
              Мы не претендуем на владение вашими сценариями, заметками и другими материалами.
              Вы предоставляете нам лицензию на хранение и обработку контента исключительно для предоставления сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Использование AI</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>AI-функции предоставляются «как есть» и могут содержать неточности.</li>
              <li>Контент, отправляемый AI-провайдерам, обрабатывается согласно их политикам.</li>
              <li>Результаты AI являются вспомогательными и не заменяют профессиональное суждение.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Запрещённое использование</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Создание контента, нарушающего законодательство.</li>
              <li>Попытки получить несанкционированный доступ к сервису или данным других пользователей.</li>
              <li>Использование автоматизированных средств для массового обращения к API.</li>
              <li>Перепродажа или сублицензирование доступа к сервису.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Ограничение ответственности</h2>
            <p>
              Сервис предоставляется «как есть». Мы не гарантируем бесперебойную работу и не несём
              ответственности за потерю данных в результате технических сбоев.
              Рекомендуем регулярно экспортировать важный контент.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Прекращение использования</h2>
            <p>
              Вы можете удалить аккаунт в любое время через настройки профиля.
              Мы оставляем за собой право приостановить или удалить аккаунт при нарушении настоящих условий.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Изменения условий</h2>
            <p>
              Мы можем обновлять условия использования. О существенных изменениях
              мы уведомим через сервис или по электронной почте.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Контакты</h2>
            <p>
              По вопросам: <a href="mailto:support@yomimovie.art" className="text-ai-accent hover:underline">support@yomimovie.art</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
