export function MockupRewrite() {
  return (
    <div className="mockup-wrapper">
      <div className="editor-mockup">
        <div className="editor-mockup-titlebar">
          <div className="editor-dot" style={{ background: "#ff5f57" }} />
          <div className="editor-dot" style={{ background: "#febc2e" }} />
          <div className="editor-dot" style={{ background: "#28c840" }} />
          <span style={{ marginLeft: "12px", fontSize: "11px", color: "#71717a" }}>
            AI Rewrite
          </span>
        </div>
        <div style={{ padding: "16px" }}>
          <div className="mock-cmd-bar" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", color: "#818cf8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
                Инструкция
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#a1a1aa" }}>
              Сделай диалог более напряжённым и эмоциональным
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px", fontFamily: "'Courier Prime', monospace", fontSize: "12px" }}>
            <div className="diff-remove">
              Мне нужна розетка. Срочно. У меня дедлайн.
            </div>
            <div className="diff-add">
              Розетка! Где розетка?! У меня двадцать минут до дедлайна, и ноутбук на трёх процентах!
            </div>
            <div style={{ height: "8px" }} />
            <div className="diff-remove">Вон там, у колонны.</div>
            <div className="diff-add">
              Там. У колонны. Только осторожно — провод хлипкий.
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
            <button className="btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.75rem" }}>
              Отклонить
            </button>
            <button className="btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.75rem" }}>
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
