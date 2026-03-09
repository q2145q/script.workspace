import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — Script Workspace",
  description: "Политика конфиденциальности сервиса Script Workspace от YOMI Film",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="glass-panel sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold text-foreground">
            Script Workspace
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            На главную
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-4 text-3xl font-bold text-foreground">
          Политика конфиденциальности
        </h1>
        <p className="mb-2 text-sm text-muted-foreground">
          Дата вступления в силу: 6 марта 2026 г.
        </p>
        <p className="mb-8 text-sm text-muted-foreground">
          Последнее обновление: 8 марта 2026 г.
        </p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-foreground/90">
          <section>
            <p>
              Настоящая Политика конфиденциальности описывает, как YOMI Film (далее — «мы», «наш», «Компания»)
              собирает, использует и защищает персональные данные пользователей сервиса Script Workspace
              (далее — «Сервис»), доступного по адресу <a href="https://script.yomimovie.art" className="text-cinema hover:underline">script.yomimovie.art</a>.
              Используя Сервис, вы соглашаетесь с условиями данной политики.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Какие данные мы собираем</h2>
            <p>При использовании Script Workspace мы можем собирать следующие категории данных:</p>

            <h3 className="text-base font-medium text-foreground mt-4">1.1. Данные аккаунта</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Имя и фамилия (или псевдоним)</li>
              <li>Адрес электронной почты</li>
              <li>Аватар (при загрузке)</li>
              <li>Хеш пароля (мы не храним пароли в открытом виде)</li>
            </ul>

            <h3 className="text-base font-medium text-foreground mt-4">1.2. Контент пользователя</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Сценарии, заметки, комментарии, библия проекта</li>
              <li>Настройки проектов (название, жанр, язык)</li>
              <li>История версий документов</li>
            </ul>

            <h3 className="text-base font-medium text-foreground mt-4">1.3. Технические данные</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP-адрес и геолокация (на уровне страны)</li>
              <li>Тип и версия браузера, операционная система</li>
              <li>Время и продолжительность сессий</li>
              <li>Данные о производительности для мониторинга и диагностики</li>
            </ul>

            <h3 className="text-base font-medium text-foreground mt-4">1.4. Данные использования AI</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Текстовые запросы к AI-моделям (переписка, форматирование, анализ)</li>
              <li>Результаты обработки AI</li>
              <li>Метрики использования: выбранный провайдер, количество токенов, время обработки</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Цели обработки данных</h2>
            <p>Мы обрабатываем ваши данные исключительно в следующих целях:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Предоставление Сервиса:</strong> создание и управление аккаунтом, хранение и синхронизация ваших сценариев, совместная работа над проектами.</li>
              <li><strong>AI-функции:</strong> обработка запросов к искусственному интеллекту (форматирование, генерация логлайнов, синопсисов, анализ текста).</li>
              <li><strong>Безопасность:</strong> предотвращение несанкционированного доступа, обнаружение злоупотреблений, защита от атак.</li>
              <li><strong>Улучшение Сервиса:</strong> анализ анонимизированных данных об использовании для совершенствования функциональности.</li>
              <li><strong>Коммуникация:</strong> отправка уведомлений о важных изменениях в Сервисе (только с вашего согласия для маркетинговых сообщений).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Правовые основания обработки</h2>
            <p>Мы обрабатываем персональные данные на основании:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Исполнение договора:</strong> обработка необходима для предоставления Сервиса (ст. 6(1)(b) GDPR).</li>
              <li><strong>Согласие:</strong> для отправки маркетинговых материалов и аналитики использования (ст. 6(1)(a) GDPR).</li>
              <li><strong>Законный интерес:</strong> для обеспечения безопасности и предотвращения злоупотреблений (ст. 6(1)(f) GDPR).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Хранение и защита данных</h2>
            <p>Мы применяем комплекс технических и организационных мер для защиты ваших данных:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Шифрование:</strong> все данные передаются через HTTPS/TLS. API-ключи шифруются с использованием AES-256-GCM.</li>
              <li><strong>Серверы:</strong> данные хранятся на защищённых серверах с ограниченным доступом.</li>
              <li><strong>Аутентификация:</strong> используем безопасную систему сессий с HTTP-only cookie.</li>
              <li><strong>Пароли:</strong> хешируются с помощью bcrypt — мы никогда не храним пароли в открытом виде.</li>
              <li><strong>Резервное копирование:</strong> регулярные бэкапы базы данных для предотвращения потери данных.</li>
            </ul>
            <p className="mt-3">
              Данные хранятся в течение всего срока действия вашего аккаунта. При удалении аккаунта
              все связанные персональные данные удаляются в течение 30 дней, за исключением случаев,
              когда их хранение требуется по закону.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Передача данных третьим лицам</h2>
            <p>
              Мы <strong>не продаём и не передаём</strong> ваши персональные данные третьим лицам для маркетинговых целей.
            </p>
            <p className="mt-2">Данные могут передаваться следующим категориям получателей:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>AI-провайдеры</strong> (OpenAI, Anthropic, Google, DeepSeek, Yandex, xAI) —
                исключительно для выполнения ваших запросов к AI. Мы передаём только тот текст, который вы
                явно отправляете на обработку. Каждый провайдер имеет собственную политику конфиденциальности
                и обязательства по защите данных.
              </li>
              <li>
                <strong>Хостинг-провайдеры</strong> — для размещения серверной инфраструктуры Сервиса.
              </li>
            </ul>
            <p className="mt-2">
              Все третьи стороны обязаны соблюдать конфиденциальность и безопасность ваших данных
              в соответствии с применимым законодательством.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Ваши права</h2>
            <p>В соответствии с применимым законодательством, вы имеете следующие права:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Право на доступ:</strong> получение информации о том, какие данные мы обрабатываем.</li>
              <li><strong>Право на исправление:</strong> изменение неточных или устаревших данных.</li>
              <li><strong>Право на удаление:</strong> удаление аккаунта и всех связанных данных.</li>
              <li><strong>Право на экспорт:</strong> получение ваших данных в машиночитаемом формате.</li>
              <li><strong>Право на ограничение обработки:</strong> ограничение определённых видов обработки данных.</li>
              <li><strong>Право на отзыв согласия:</strong> отзыв ранее данного согласия на обработку данных в любое время.</li>
            </ul>
            <p className="mt-3">
              Для реализации своих прав направьте запрос на{" "}
              <a href="mailto:support@yomimovie.art" className="text-cinema hover:underline">support@yomimovie.art</a>.
              Мы ответим в течение 30 дней.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Файлы cookie</h2>
            <p>Мы используем следующие категории файлов cookie:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Необходимые (сессионные):</strong> для аутентификации и поддержания сессии. Без них Сервис не может функционировать.</li>
              <li><strong>Функциональные:</strong> для сохранения пользовательских предпочтений (тема оформления, язык интерфейса).</li>
            </ul>
            <p className="mt-2">
              Мы <strong>не используем</strong> аналитические или рекламные cookie. Мы не отслеживаем ваше
              поведение на других сайтах.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Несовершеннолетние</h2>
            <p>
              Сервис не предназначен для лиц младше 16 лет. Мы сознательно не собираем персональные данные
              детей. Если вы считаете, что мы получили данные несовершеннолетнего, свяжитесь с нами
              для их удаления.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Изменения политики</h2>
            <p>
              Мы можем обновлять настоящую Политику конфиденциальности. О существенных изменениях
              мы уведомим вас через электронную почту или уведомление в Сервисе не менее чем за 14 дней
              до вступления изменений в силу. Рекомендуем периодически ознакомляться с актуальной версией
              данного документа.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Контакты</h2>
            <p>По вопросам конфиденциальности и защиты персональных данных:</p>
            <ul className="list-none space-y-2 mt-3">
              <li>
                <strong>Email:</strong>{" "}
                <a href="mailto:support@yomimovie.art" className="text-cinema hover:underline">support@yomimovie.art</a>
              </li>
              <li>
                <strong>Telegram:</strong>{" "}
                <a href="https://t.me/yaborovkov" target="_blank" rel="noopener noreferrer" className="text-cinema hover:underline">@yaborovkov</a>
              </li>
              <li>
                <strong>Компания:</strong> YOMI Film
              </li>
            </ul>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="mx-auto max-w-3xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2026 YOMI Film. Все права защищены.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Главная</Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">Документация</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
