"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "editor", label: "Редактор" },
  { id: "block-types", label: "Типы блоков" },
  { id: "ai-tools", label: "AI-инструменты" },
  { id: "workspace-modes", label: "Режимы" },
  { id: "right-panel", label: "Правая панель" },
  { id: "selection-toolbar", label: "Панель выделения" },
  { id: "collaboration", label: "Совместная работа" },
  { id: "shortcuts", label: "Горячие клавиши" },
  { id: "export", label: "Экспорт" },
  { id: "tv-series", label: "Сериалы" },
];

export function DocsNav() {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id);
          }
        },
        { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav className="docs-sidebar">
      <div className="docs-sidebar-title">Содержание</div>
      {SECTIONS.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className={`docs-sidebar-link${activeId === id ? " active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
            setActiveId(id);
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
