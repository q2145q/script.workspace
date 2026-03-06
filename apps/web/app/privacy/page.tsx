import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — Script Workspace",
  description: "Политика конфиденциальности сервиса Script Workspace",
};

export default function PrivacyPage() {
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
          Политика конфиденциальности
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Дата вступления в силу: 6 марта 2026 г.
        </p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Какие данные мы собираем</h2>
            <p>При использовании Script Workspace мы можем собирать следующие данные:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Данные аккаунта:</strong> имя, адрес электронной почты, аватар (при регистрации).</li>
              <li><strong>Контент:</strong> сценарии, заметки, комментарии, библия проекта и другие материалы, создаваемые вами в сервисе.</li>
              <li><strong>Технические данные:</strong> IP-адрес, тип браузера, операционная система, время доступа — для обеспечения безопасности и производительности.</li>
              <li><strong>Данные использования AI:</strong> запросы к AI-моделям и их результаты (для улучшения качества сервиса).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Как мы используем данные</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Предоставление и улучшение сервиса.</li>
              <li>Аутентификация и управление аккаунтом.</li>
              <li>Отправка уведомлений (с вашего согласия).</li>
              <li>Анализ производительности и предотвращение злоупотреблений.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Хранение и защита данных</h2>
            <p>
              Данные хранятся на защищённых серверах. API-ключи шифруются с помощью AES-256-GCM.
              Мы применяем стандартные меры безопасности для защиты ваших данных от несанкционированного доступа.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Передача данных третьим лицам</h2>
            <p>
              Мы не продаём ваши данные. Контент может передаваться AI-провайдерам (OpenAI, Anthropic и др.)
              исключительно для выполнения ваших запросов. Каждый провайдер имеет собственную политику конфиденциальности.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Ваши права</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Доступ к своим данным и их экспорт.</li>
              <li>Исправление неточных данных.</li>
              <li>Удаление аккаунта и всех связанных данных.</li>
              <li>Отзыв согласия на обработку данных.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Cookie</h2>
            <p>
              Мы используем сессионные cookie для аутентификации. Аналитические cookie не используются.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Контакты</h2>
            <p>
              По вопросам конфиденциальности: <a href="mailto:support@yomimovie.art" className="text-ai-accent hover:underline">support@yomimovie.art</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
