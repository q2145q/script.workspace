# AI Provider Benchmark Report

Generated: 2026-03-08T17:30:55.004Z

## Summary Table

| Provider | Model | Task | Duration (ms) | Blocks | Block Types | Schema Valid |
|----------|-------|------|---------------|--------|-------------|-------------|
| Anthropic (Claude) | claude-haiku-4-5-20251001 | format | 2983 | 7 | sceneHeading, action, character, dialogue | ✅ |
| DeepSeek | deepseek-chat | format | 11202 | 7 | sceneHeading, action, character, dialogue | ✅ |
| Yandex | yandexgpt/latest | format | 2646 | 7 | sceneHeading, action, character, dialogue | ✅ |
| Anthropic (Claude) | claude-haiku-4-5-20251001 | rewrite | 1671 | 1 | dialogue | ✅ |
| DeepSeek | deepseek-chat | rewrite | 5080 | 1 | dialogue | ✅ |
| Yandex | yandexgpt/latest | rewrite | 1090 | 1 | dialogue | ✅ |

## Detailed Responses

### Anthropic (Claude) — format (2983ms)

```
[sceneHeading] INT. ПАРК — ДЕНЬ
[action] Анна бежит по аллее. Её преследует незнакомец в чёрном пальт
[character] АННА
[dialogue] Оставьте меня в покое!
[action] Незнакомец останавливается и снимает шляпу. Это ВИКТОР.
[character] ВИКТОР
[dialogue] Подождите! Я просто хотел вернуть вашу сумку.
```

### DeepSeek — format (11202ms)

```
[sceneHeading] INT. ПАРК — ДЕНЬ
[action] Анна бежит по аллее. Её преследует незнакомец в чёрном пальт
[character] АННА
[dialogue] Оставьте меня в покое!
[action] Незнакомец останавливается и снимает шляпу. Это ВИКТОР.
[character] ВИКТОР
[dialogue] Подождите! Я просто хотел вернуть вашу сумку.
```

### Yandex — format (2646ms)

```
[sceneHeading] INT. ПАРК — ДЕНЬ
[action] Анна бежит по аллее. Её преследует незнакомец в чёрном пальт
[character] АННА
[dialogue] Оставьте меня в покое!
[action] Незнакомец останавливается и снимает шляпу. Это ВИКТОР.
[character] ВИКТОР
[dialogue] Подождите! Я просто хотел вернуть вашу сумку.
```

### Anthropic (Claude) — rewrite (1671ms)

```
[dialogue] Что-то здесь не складывается... Что-то не так, и я чувствую 
```

### DeepSeek — rewrite (5080ms)

```
[dialogue] Что-то здесь не так... Это не складывается, чёрт возьми!
```

### Yandex — rewrite (1090ms)

```
[dialogue] Что-то здесь совсем не сходится! Черт возьми, что я упускаю?
```
