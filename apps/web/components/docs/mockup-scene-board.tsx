export function MockupSceneBoard() {
  const scenes = [
    { num: 1, title: "INT. КАФЕ — ДЕНЬ", color: "#818cf8", synopsis: "Анна ищет розетку. Встреча с Официантом." },
    { num: 2, title: "EXT. УЛИЦА — ВЕЧЕР", color: "#34d399", synopsis: "Анна убегает под дождём. Звонок от продюсера." },
    { num: 3, title: "INT. КВАРТИРА — НОЧЬ", color: "#f59e0b", synopsis: "Анна переписывает сценарий до утра." },
    { num: 4, title: "INT. ОФИС — УТРО", color: "#ef4444", synopsis: "Презентация. Неожиданная встреча." },
    { num: 5, title: "EXT. ПАРК — ДЕНЬ", color: "#818cf8", synopsis: "Разговор по душам. Решение." },
    { num: 6, title: "INT. КАФЕ — ВЕЧЕР", color: "#34d399", synopsis: "Финальная сцена. Полный круг." },
  ];

  return (
    <div className="mockup-wrapper">
      <div className="editor-mockup">
        <div className="editor-mockup-titlebar">
          <div className="editor-dot" style={{ background: "#ff5f57" }} />
          <div className="editor-dot" style={{ background: "#febc2e" }} />
          <div className="editor-dot" style={{ background: "#28c840" }} />
          <span style={{ marginLeft: "12px", fontSize: "11px", color: "#71717a" }}>
            Scene Board
          </span>
        </div>
        <div className="mock-board-grid">
          {scenes.map((s) => (
            <div key={s.num} className="mock-scene-card">
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: s.color,
                }} />
                <span style={{ fontSize: "10px", color: "#71717a" }}>
                  Сцена {s.num}
                </span>
              </div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#e4e4e7", marginBottom: "6px" }}>
                {s.title}
              </div>
              <div style={{ fontSize: "10px", color: "#71717a", lineHeight: "1.4" }}>
                {s.synopsis}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
