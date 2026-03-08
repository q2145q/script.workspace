export function MockupSelectionToolbar() {
  return (
    <div className="mockup-wrapper">
      <div className="editor-mockup">
        <div className="editor-mockup-titlebar">
          <div className="editor-dot" style={{ background: "#ff5f57" }} />
          <div className="editor-dot" style={{ background: "#febc2e" }} />
          <div className="editor-dot" style={{ background: "#28c840" }} />
        </div>
        <div style={{ padding: "24px 32px", fontFamily: "'Courier Prime', monospace", fontSize: "12px", position: "relative" }}>
          <div className="mock-heading">INT. КАФЕ &quot;ЛУНА&quot; — ДЕНЬ</div>
          <div className="mock-action">
            Маленькое кафе в центре Москвы.
          </div>

          {/* Selected text */}
          <div style={{
            background: "rgba(129, 140, 248, 0.15)",
            borderRadius: "3px",
            padding: "2px 0",
            color: "#e4e4e7",
            marginBottom: "4px",
          }}>
            АННА (32) сидит за столиком, листает блокнот.
            Кофе остывает. Часы тикают.
          </div>

          {/* Floating toolbar */}
          <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
            <div className="mock-toolbar">
              <div className="mock-toolbar-btn active">
                <span style={{ fontSize: "12px" }}>✨</span> Rewrite
              </div>
              <div className="mock-toolbar-btn">
                <span style={{ fontSize: "12px" }}>📝</span> Format
              </div>
              <div className="mock-toolbar-btn">
                <span style={{ fontSize: "12px" }}>💬</span> Comment
              </div>
              <div className="mock-toolbar-btn">
                <span style={{ fontSize: "12px" }}>📌</span> Pin
              </div>
            </div>
          </div>

          <div className="mock-character">АННА</div>
          <div className="mock-dialogue">Мне нужна розетка.</div>
        </div>
      </div>
    </div>
  );
}
