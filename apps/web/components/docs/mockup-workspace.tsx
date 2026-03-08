export function MockupWorkspace() {
  const modes = [
    { label: "SC", active: true },
    { label: "BI" },
    { label: "OL" },
    { label: "CH" },
    { label: "LO" },
    { label: "SB" },
    { label: "1P" },
    { label: "NO" },
    { label: "VR" },
    { label: "GR" },
  ];

  return (
    <div className="mockup-wrapper">
      <div className="mock-workspace">
        {/* Sidebar icons */}
        <div className="mock-ws-sidebar">
          {modes.map((m) => (
            <div
              key={m.label}
              className={`mock-ws-icon${m.active ? " active" : ""}`}
            >
              {m.label}
            </div>
          ))}
        </div>

        {/* Editor area */}
        <div className="mock-ws-editor">
          <div className="mock-heading">INT. КАФЕ &quot;ЛУНА&quot; — ДЕНЬ</div>
          <div className="mock-action">
            Маленькое кафе в центре Москвы. За окном идёт дождь.
          </div>
          <div className="mock-action">
            АННА (32) сидит за столиком, листает блокнот.
          </div>
          <div className="mock-character">АННА</div>
          <div className="mock-dialogue">
            Мне нужна розетка. Срочно.
          </div>
          <div className="mock-character">ОФИЦИАНТ</div>
          <div className="mock-parenthetical">(указывает на стену)</div>
          <div className="mock-dialogue">Вон там, у колонны.</div>
        </div>

        {/* Right panel */}
        <div className="mock-ws-panel">
          <div className="mock-panel-tabs">
            <div className="mock-panel-tab active">Чат</div>
            <div className="mock-panel-tab">Комм.</div>
            <div className="mock-panel-tab">Анализ</div>
          </div>
          <div className="mock-panel-content" style={{ fontSize: "11px" }}>
            <div className="mock-chat-user" style={{ fontSize: "11px", marginBottom: "8px" }}>
              Как усилить конфликт в этой сцене?
            </div>
            <div className="mock-chat-ai" style={{ fontSize: "11px" }}>
              Добавьте тикающие часы: у Анны 15 минут до звонка продюсеру,
              а ноутбук разряжается...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
