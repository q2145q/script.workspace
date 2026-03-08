"use client";

import { useInView } from "../hooks";
import { COMPARISON_HEADERS, COMPARISON_ROWS } from "../data";

export function ComparisonSection() {
  const [ref, visible] = useInView();

  return (
    <section ref={ref} className="landing-section">
      <div className="landing-container">
        <div className={`reveal ${visible ? "visible" : ""}`}>
          <h2
            className="text-3xl sm:text-4xl mb-4 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Почему не Final Draft или STARC?
          </h2>
        </div>

        <div
          className={`reveal ${visible ? "visible" : ""} mt-12 overflow-x-auto`}
        >
          <table className="comparison-table">
            <thead>
              <tr>
                <th></th>
                {COMPARISON_HEADERS.map((h, i) => (
                  <th key={h} className={i === 0 ? "highlight-col" : ""}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="row-label">{row.label}</td>
                  {row.values.map((val, i) => (
                    <td key={i} className={i === 0 ? "highlight-col" : ""}>
                      {val === "✓" ? (
                        <span className="check-mark">✓</span>
                      ) : val === "—" ? (
                        <span style={{ color: "var(--l-text-muted)" }}>—</span>
                      ) : (
                        val
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`reveal ${visible ? "visible" : ""}`}>
          <p
            className="text-center mt-10 text-base leading-relaxed max-w-2xl mx-auto"
            style={{ color: "var(--l-text-dim)" }}
          >
            Script Workspace — единственный редактор сценариев,
            созданный для российской индустрии с нуля.
          </p>
        </div>
      </div>
    </section>
  );
}
