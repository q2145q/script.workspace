"use client";

/* ===========================================================
   HTML Mockups — realistic UI previews for the landing page
   =========================================================== */

const S = {
  // MacBook device frame
  frame: {
    background: "#0a0a0f",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 40px 100px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
  } as React.CSSProperties,
  frameLite: {
    background: "#0a0a0f",
    border: "1px solid #1a1a22",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 20px 60px -10px rgba(0,0,0,0.3)",
  } as React.CSSProperties,
  titlebar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 14px",
    background: "#111116",
    borderBottom: "1px solid #1a1a22",
  } as React.CSSProperties,
  dot: (c: string) =>
    ({
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: c,
    }) as React.CSSProperties,
  // Sidebar
  sidebar: {
    width: 170,
    borderRight: "1px solid #1a1a22",
    padding: "10px 0",
    flexShrink: 0,
    background: "#0e0e14",
  } as React.CSSProperties,
  sidebarItem: (active?: boolean) =>
    ({
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "5px 14px",
      fontSize: 11,
      color: active ? "#e8a0a0" : "#52525b",
      background: active ? "rgba(240,122,28,0.08)" : "transparent",
      borderRight: active ? "2px solid #F07A1C" : "2px solid transparent",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }) as React.CSSProperties,
  // Editor content area
  editorContent: {
    flex: 1,
    padding: "20px 28px",
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    fontSize: 11.5,
    lineHeight: 1.5,
    color: "#e4e4e7",
    overflow: "hidden",
  } as React.CSSProperties,
  // Right panel
  rightPanel: {
    width: 200,
    borderLeft: "1px solid #1a1a22",
    padding: "10px 12px",
    flexShrink: 0,
    background: "#0e0e14",
    fontSize: 11,
  } as React.CSSProperties,
  // Screenplay line types
  heading: {
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: "0.6em",
    color: "#e4e4e7",
    borderLeft: "2px solid #F07A1C",
    paddingLeft: 8,
  } as React.CSSProperties,
  action: { marginBottom: "0.4em", color: "#a1a1aa" } as React.CSSProperties,
  character: {
    textTransform: "uppercase",
    paddingLeft: "35%",
    marginTop: "0.7em",
    marginBottom: 0,
    color: "#e4e4e7",
    fontWeight: 600,
  } as React.CSSProperties,
  dialogue: {
    paddingLeft: "20%",
    paddingRight: "15%",
    marginBottom: "0.4em",
    color: "#d4d4d8",
  } as React.CSSProperties,
  parenthetical: {
    paddingLeft: "28%",
    fontStyle: "italic",
    color: "#71717a",
    marginBottom: 0,
  } as React.CSSProperties,
};

function Titlebar({ title }: { title: string }) {
  return (
    <div style={S.titlebar}>
      <div style={S.dot("#ff5f57")} />
      <div style={S.dot("#febc2e")} />
      <div style={S.dot("#28c840")} />
      <span style={{ marginLeft: 8, fontSize: 11, color: "#52525b" }}>{title}</span>
    </div>
  );
}

/* ----------------------------------------------------------
   HERO MOCKUP — full editor: sidebar + screenplay + chat
   ---------------------------------------------------------- */
export function HeroMockup() {
  return (
    <div style={{ ...S.frame, marginTop: "2rem" }}>
      <Titlebar title="Без названия — YOMI Script" />
      <div style={{ display: "flex", minHeight: 340 }}>
        {/* Left sidebar — scenes */}
        <div style={S.sidebar} className="hidden sm:block">
          <div
            style={{
              padding: "4px 14px 8px",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#52525b",
              borderBottom: "1px solid #1a1a22",
              marginBottom: 4,
            }}
          >
            Сцены
          </div>
          {[
            { n: 1, t: 'INT. КАФЕ "ЛУНА" — ДЕНЬ', active: true },
            { n: 2, t: "EXT. УЛИЦА — ВЕЧЕР" },
            { n: 3, t: "INT. КВАРТИРА АННЫ — НОЧЬ" },
            { n: 4, t: "INT. РЕДАКЦИЯ — УТРО" },
            { n: 5, t: "EXT. НАБЕРЕЖНАЯ — ДЕНЬ" },
          ].map((s) => (
            <div key={s.n} style={S.sidebarItem(s.active)}>
              <span style={{ opacity: 0.4, fontSize: 10 }}>{s.n}</span>
              {s.t}
            </div>
          ))}
        </div>

        {/* Main editor */}
        <div style={S.editorContent}>
          <div style={S.heading}>INT. КАФЕ &quot;ЛУНА&quot; — ДЕНЬ</div>
          <div style={S.action}>Маленькое кафе в центре Москвы. Дождь за окном.</div>
          <div style={S.action}>АННА (32) сидит за столиком, листает блокнот.</div>
          <div style={S.character}>АННА</div>
          <div style={S.dialogue}>Мне нужна розетка. Срочно. У меня дедлайн.</div>
          <div style={S.character}>ОФИЦИАНТ</div>
          <div style={S.parenthetical}>(указывает на стену)</div>
          <div style={S.dialogue}>Вон там, у колонны.</div>
          <div style={S.action}>Анна благодарно кивает, подхватывает ноутбук и пересаживается.</div>
          <div style={S.character}>АННА</div>
          <div style={S.parenthetical}>(себе под нос)</div>
          <div style={S.dialogue}>
            Ещё два часа. Два часа — и всё.
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: "1em",
                background: "#F07A1C",
                marginLeft: 1,
                verticalAlign: "text-bottom",
                animation: "blink 1s step-end infinite",
              }}
            />
          </div>
        </div>

        {/* Right panel — AI chat */}
        <div style={S.rightPanel} className="hidden md:block">
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 10,
              borderBottom: "1px solid #1a1a22",
              paddingBottom: 8,
            }}
          >
            <span style={{ color: "#F07A1C", fontWeight: 600 }}>Chat</span>
            <span style={{ color: "#52525b" }}>Bible</span>
          </div>
          {/* Chat messages */}
          <div
            style={{
              background: "rgba(240,122,28,0.06)",
              borderRadius: 8,
              padding: "6px 8px",
              marginBottom: 8,
              fontSize: 10,
              color: "#a1a1aa",
            }}
          >
            Какая мотивация у Анны в этой сцене?
          </div>
          <div
            style={{
              background: "rgba(99,102,241,0.08)",
              borderLeft: "2px solid #6366f1",
              borderRadius: "0 8px 8px 0",
              padding: "6px 8px",
              marginBottom: 8,
              fontSize: 10,
              color: "#c4c4cc",
              lineHeight: 1.4,
            }}
          >
            Анна — сценарист с горящим дедлайном. Её мотивация — найти тихое место и закончить работу. Внутренний конфликт: перфекционизм vs. нехватка времени.
          </div>
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              marginTop: "auto",
              paddingTop: 8,
              borderTop: "1px solid #1a1a22",
            }}
          >
            <div
              style={{
                flex: 1,
                background: "#1a1a22",
                borderRadius: 6,
                padding: "5px 8px",
                fontSize: 10,
                color: "#52525b",
              }}
            >
              Спросите о сценарии...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------
   WORKFLOW MOCKUP — 4 variants for each step
   ---------------------------------------------------------- */

function EditorMockup() {
  return (
    <div style={S.frameLite}>
      <Titlebar title="Screenplay Editor" />
      <div style={{ ...S.editorContent, minHeight: 240, padding: "16px 24px" }}>
        <div style={S.heading}>INT. КАФЕ &quot;ЛУНА&quot; — ДЕНЬ</div>
        <div style={S.action}>Маленькое кафе в центре Москвы. Дождь за окном.</div>
        <div style={S.character}>АННА</div>
        <div style={S.dialogue}>Мне нужна розетка. Срочно.</div>
        <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
          <span
            style={{
              background: "#F07A1C",
              color: "#fff",
              fontSize: 9,
              padding: "3px 10px",
              borderRadius: 4,
              fontFamily: "sans-serif",
            }}
          >
            Export PDF
          </span>
          <span
            style={{
              background: "#333",
              color: "#aaa",
              fontSize: 9,
              padding: "3px 10px",
              borderRadius: 4,
              fontFamily: "sans-serif",
            }}
          >
            Export DOCX
          </span>
        </div>
      </div>
    </div>
  );
}

function BibleMockup() {
  return (
    <div style={S.frameLite}>
      <Titlebar title="Project Bible" />
      <div style={{ display: "flex", minHeight: 240 }}>
        <div
          style={{
            width: 120,
            borderRight: "1px solid #1a1a22",
            padding: "8px 0",
            background: "#0e0e14",
          }}
        >
          {["Персонажи", "Локации", "Арки", "Темы"].map((s, i) => (
            <div
              key={s}
              style={{
                padding: "5px 12px",
                fontSize: 10,
                color: i === 0 ? "#F07A1C" : "#52525b",
                background: i === 0 ? "rgba(240,122,28,0.08)" : "transparent",
                borderLeft: i === 0 ? "2px solid #F07A1C" : "2px solid transparent",
              }}
            >
              {s}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: "12px 16px", fontSize: 11, color: "#a1a1aa" }}>
          <div style={{ fontWeight: 600, color: "#e4e4e7", marginBottom: 8 }}>АННА (32)</div>
          <div style={{ color: "#71717a", marginBottom: 4, fontSize: 10 }}>Сценарист. Перфекционист.</div>
          <div
            style={{
              background: "#1a1a22",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 10,
              color: "#a1a1aa",
              lineHeight: 1.4,
              marginTop: 8,
            }}
          >
            <span style={{ color: "#F07A1C", fontWeight: 600 }}>Арка:</span> От неуверенности к решимости. Анна учится доверять
            интуиции вместо бесконечных правок.
          </div>
          <div style={{ fontWeight: 600, color: "#e4e4e7", marginTop: 12, marginBottom: 4 }}>ОФИЦИАНТ</div>
          <div style={{ color: "#71717a", fontSize: 10 }}>Молодой бариста. Спокойный, наблюдательный.</div>
        </div>
      </div>
    </div>
  );
}

function RewriteMockup() {
  return (
    <div style={S.frameLite}>
      <Titlebar title="AI Rewrite" />
      <div style={{ ...S.editorContent, minHeight: 240, padding: "16px 24px" }}>
        <div style={S.character}>АННА</div>
        <div style={{ ...S.dialogue, position: "relative" }}>
          <span
            style={{
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              textDecoration: "line-through",
            }}
          >
            Мне нужна розетка. Срочно. У меня дедлайн.
          </span>
        </div>
        <div style={{ ...S.dialogue, marginTop: 4 }}>
          <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
            Одна розетка. Одна. Мне нужен только один разъём — и два часа тишины.
          </span>
        </div>
        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 16,
            fontFamily: "sans-serif",
          }}
        >
          <span
            style={{
              background: "#22c55e",
              color: "#fff",
              fontSize: 10,
              padding: "4px 14px",
              borderRadius: 6,
              fontWeight: 600,
            }}
          >
            Apply
          </span>
          <span
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#aaa",
              fontSize: 10,
              padding: "4px 14px",
              borderRadius: 6,
            }}
          >
            Another
          </span>
          <span
            style={{
              background: "rgba(239,68,68,0.2)",
              color: "#f87171",
              fontSize: 10,
              padding: "4px 14px",
              borderRadius: 6,
            }}
          >
            Reject
          </span>
        </div>
        {/* Beat sheet hint */}
        <div
          style={{
            marginTop: 16,
            background: "rgba(99,102,241,0.08)",
            borderLeft: "2px solid #6366f1",
            borderRadius: "0 6px 6px 0",
            padding: "8px 10px",
            fontSize: 10,
            color: "#a1a1aa",
            lineHeight: 1.4,
            fontFamily: "sans-serif",
          }}
        >
          Реплика переписана: добавлен субтекст (усталость + сарказм), усилен голос персонажа.
        </div>
      </div>
    </div>
  );
}

function PitchMockup() {
  return (
    <div style={S.frameLite}>
      <Titlebar title="Pitch Artifacts" />
      <div style={{ padding: "16px 24px", minHeight: 240, fontSize: 11, color: "#a1a1aa" }}>
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#F07A1C",
            marginBottom: 8,
            fontWeight: 600,
            fontFamily: "sans-serif",
          }}
        >
          Logline
        </div>
        <div style={{ color: "#e4e4e7", lineHeight: 1.5, marginBottom: 16, fontFamily: "sans-serif" }}>
          Молодой сценарист борется с дедлайном в московском кафе, где случайная встреча переворачивает её
          представление о собственной истории.
        </div>
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#F07A1C",
            marginBottom: 8,
            fontWeight: 600,
            fontFamily: "sans-serif",
          }}
        >
          Synopsis
        </div>
        <div style={{ color: "#a1a1aa", lineHeight: 1.5, fontFamily: "sans-serif" }}>
          АННА, 32, — сценарист с горящим дедлайном. Она сидит в кафе &quot;Луна&quot;, пытаясь закончить финальный
          акт. Встреча с загадочным незнакомцем заставляет её пересмотреть развязку собственного сценария...
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 16, fontFamily: "sans-serif" }}>
          <span
            style={{
              background: "#F07A1C",
              color: "#fff",
              fontSize: 9,
              padding: "3px 10px",
              borderRadius: 4,
            }}
          >
            Copy All
          </span>
          <span
            style={{
              background: "#333",
              color: "#aaa",
              fontSize: 9,
              padding: "3px 10px",
              borderRadius: 4,
            }}
          >
            Regenerate
          </span>
        </div>
      </div>
    </div>
  );
}

const WORKFLOW_MOCKUPS = [EditorMockup, BibleMockup, RewriteMockup, PitchMockup];

export function WorkflowMockup({ step }: { step: number }) {
  const Comp = WORKFLOW_MOCKUPS[step] ?? EditorMockup;
  return <Comp />;
}

/* ----------------------------------------------------------
   AI SECTION MOCKUP — rewrite diff view
   ---------------------------------------------------------- */
export function AIRewriteMockup() {
  return (
    <div style={{ ...S.frameLite, marginTop: "2.5rem" }}>
      <Titlebar title="AI Rewrite — Diff View" />
      <div style={{ ...S.editorContent, minHeight: 200, padding: "20px 28px" }}>
        <div style={S.heading}>INT. КАФЕ &quot;ЛУНА&quot; — ДЕНЬ</div>
        <div style={S.character}>АННА</div>
        <div style={{ ...S.dialogue, marginBottom: 8 }}>
          <span
            style={{
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              textDecoration: "line-through",
              padding: "1px 2px",
            }}
          >
            Мне нужна розетка. Срочно. У меня дедлайн.
          </span>
        </div>
        <div style={{ ...S.dialogue, marginBottom: 12 }}>
          <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", padding: "1px 2px" }}>
            Одна розетка. Одна. Мне нужен только один разъём — и два часа тишины.
          </span>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, paddingLeft: "20%", fontFamily: "sans-serif" }}>
          <span
            style={{
              background: "#22c55e",
              color: "#fff",
              fontSize: 11,
              padding: "6px 20px",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Применить
          </span>
          <span
            style={{
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              fontSize: 11,
              padding: "6px 20px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Отклонить
          </span>
        </div>
      </div>
    </div>
  );
}
