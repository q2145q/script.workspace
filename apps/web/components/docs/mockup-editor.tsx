export function MockupEditor({ annotated = false }: { annotated?: boolean }) {
  return (
    <div className="mockup-wrapper">
      <div className="editor-mockup">
        <div className="editor-mockup-titlebar">
          <div className="editor-dot" style={{ background: "#ff5f57" }} />
          <div className="editor-dot" style={{ background: "#febc2e" }} />
          <div className="editor-dot" style={{ background: "#28c840" }} />
          <span
            style={{
              marginLeft: "12px",
              fontSize: "11px",
              color: "#71717a",
            }}
          >
            Мой сценарий.script
          </span>
        </div>
        <div className="editor-mockup-body">
          <div className="editor-mockup-sidebar">
            <div className="editor-mockup-sidebar-item active">
              1. INT. КАФЕ — ДЕНЬ
            </div>
            <div className="editor-mockup-sidebar-item">
              2. EXT. УЛИЦА — ВЕЧЕР
            </div>
            <div className="editor-mockup-sidebar-item">
              3. INT. КВАРТИРА — НОЧЬ
            </div>
            <div className="editor-mockup-sidebar-item">
              4. INT. ОФИС — УТРО
            </div>
          </div>
          <div className="editor-mockup-content" style={{ position: "relative" }}>
            <div className="mock-heading">INT. КАФЕ &quot;ЛУНА&quot; — ДЕНЬ</div>
            <div className="mock-action">
              Маленькое кафе в центре Москвы. За окном идёт дождь.
            </div>
            <div className="mock-action">
              АННА (32) сидит за столиком, листает блокнот.
            </div>
            <div className="mock-character">АННА</div>
            <div className="mock-dialogue">
              Мне нужна розетка. Срочно. У меня дедлайн.
            </div>
            <div className="mock-character">ОФИЦИАНТ</div>
            <div className="mock-parenthetical">(указывает на стену)</div>
            <div className="mock-dialogue">Вон там, у колонны.</div>

            {annotated && (
              <>
                <div className="mockup-label" style={{ top: "0", right: "-8px" }}>
                  Заголовок сцены
                </div>
                <div className="mockup-label" style={{ top: "32px", right: "-8px" }}>
                  Действие
                </div>
                <div className="mockup-label" style={{ top: "112px", right: "-8px" }}>
                  Персонаж
                </div>
                <div className="mockup-label" style={{ top: "140px", right: "-8px" }}>
                  Диалог
                </div>
                <div className="mockup-label" style={{ top: "196px", right: "-8px" }}>
                  Ремарка
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
