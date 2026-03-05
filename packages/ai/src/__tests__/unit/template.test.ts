import { describe, it, expect } from "vitest";
import { fillTemplate } from "../../prompts/compose";

describe("fillTemplate", () => {
  it("replaces simple {{VARIABLE}} placeholders", () => {
    const result = fillTemplate("Hello {{NAME}}!", { NAME: "World" });
    expect(result).toBe("Hello World!");
  });

  it("replaces multiple different variables", () => {
    const result = fillTemplate("{{A}} and {{B}}", { A: "foo", B: "bar" });
    expect(result).toBe("foo and bar");
  });

  it("replaces the same variable multiple times", () => {
    const result = fillTemplate("{{X}} + {{X}}", { X: "1" });
    expect(result).toBe("1 + 1");
  });

  it("replaces unmatched variables with empty string", () => {
    const result = fillTemplate("Hello {{NAME}}, your role is {{ROLE}}", {
      NAME: "Alice",
    });
    expect(result).toBe("Hello Alice, your role is ");
  });

  it("leaves text without placeholders unchanged", () => {
    const result = fillTemplate("No placeholders here", { FOO: "bar" });
    expect(result).toBe("No placeholders here");
  });

  it("handles empty template", () => {
    const result = fillTemplate("", { FOO: "bar" });
    expect(result).toBe("");
  });

  it("handles empty vars", () => {
    const result = fillTemplate("{{A}} and {{B}}", {});
    expect(result).toBe(" and ");
  });

  it("handles multiline templates", () => {
    const template = `Line 1: {{FOO}}
Line 2: {{BAR}}
Line 3: no replacement`;
    const result = fillTemplate(template, { FOO: "hello", BAR: "world" });
    expect(result).toBe(`Line 1: hello
Line 2: world
Line 3: no replacement`);
  });

  it("works with XML-tagged variables (Claude format)", () => {
    const template = `<project_context>
{{PROJECT_CONTEXT}}
</project_context>`;
    const result = fillTemplate(template, { PROJECT_CONTEXT: "My project info" });
    expect(result).toBe(`<project_context>
My project info
</project_context>`);
  });

  it("does not replace single-brace variables", () => {
    const result = fillTemplate("{NOT_REPLACED} but {{REPLACED}}", {
      NOT_REPLACED: "no",
      REPLACED: "yes",
    });
    expect(result).toBe("{NOT_REPLACED} but yes");
  });

  it("handles variables with underscores", () => {
    const result = fillTemplate("{{USER_LANGUAGE}}", { USER_LANGUAGE: "ru" });
    expect(result).toBe("ru");
  });
});
