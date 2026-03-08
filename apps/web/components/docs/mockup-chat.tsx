export function MockupChat() {
  return (
    <div className="mockup-wrapper">
      <div className="mock-right-panel">
        <div className="mock-panel-tabs">
          <div className="mock-panel-tab">Комментарии</div>
          <div className="mock-panel-tab active">Чат</div>
          <div className="mock-panel-tab">Контекст</div>
          <div className="mock-panel-tab">Анализ</div>
        </div>
        <div className="mock-panel-content" style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
          <div className="mock-chat-user">
            Помоги развить конфликт между Анной и Официантом. Что если они знакомы?
          </div>
          <div className="mock-chat-ai">
            Интересная идея! Вот несколько вариантов:
            <br /><br />
            <strong style={{ color: "#e4e4e7" }}>1. Бывшие коллеги</strong> — Официант раньше работал в редакции Анны.
            Они расстались на плохой ноте. Теперь молча избегают друг друга.
            <br /><br />
            <strong style={{ color: "#e4e4e7" }}>2. Старые друзья</strong> — Учились вместе. Анна пошла вверх,
            Официант остался. Неловкость и скрытая обида.
            <br /><br />
            Какой вариант ближе к вашей истории?
          </div>
          <div className="mock-chat-user">
            Вариант 2, но добавь деталь — у них был общий проект, который провалился.
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "8px",
            padding: "10px 14px",
            background: "#111116",
            border: "1px solid #23232e",
            borderRadius: "10px",
          }}>
            <span style={{ flex: 1, fontSize: "11px", color: "#52525b" }}>
              Напишите сообщение...
            </span>
            <span style={{ fontSize: "10px", color: "#818cf8", fontWeight: 600 }}>
              GPT-4o
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
