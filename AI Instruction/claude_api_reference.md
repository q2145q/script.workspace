# Claude API — Полный справочник (март 2026)

> Актуальные данные из официальной документации Anthropic.  
> Источник: `platform.claude.com/docs` · `pypi.org/project/anthropic`

---

## 1. Актуальные модели

### Рекомендуемые (production-ready)

| Модель | API ID (точный) | Контекст | Описание |
|--------|----------------|----------|----------|
| **Claude Opus 4.6** | `claude-opus-4-6` | 200K (1M beta) | Самая мощная. Агенты, сложный код, рассуждения |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | 200K (1M beta) | Баланс скорости и интеллекта |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | 200K | Быстрая, дешёвая, near-frontier |

### Дополнительные актуальные снапшоты

| Модель | API ID (точный) |
|--------|----------------|
| Claude Opus 4.5 | `claude-opus-4-5-20251101` |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` |
| Claude Sonnet 4 | `claude-sonnet-4-20250514` |
| Claude Opus 4 | `claude-opus-4-20250514` |
| Claude Opus 4.1 | `claude-opus-4-1-20250805` |

> **Важно:** Алиасы (`claude-opus-4-6`) → всегда указывают на последний снапшот.  
> Для стабильного production используй точный снапшот с датой.

### 1M Token Context Window (бета)

Доступно для `claude-opus-4-6` и `claude-sonnet-4-6`. Требует beta-заголовок:

```
anthropic-beta: context-1m-2025-08-07
```

Запросы >200K токенов тарифицируются по повышенной ставке (2x input).

---

## 2. Цены (USD, актуально на март 2026)

| Модель | Input / 1M | Output / 1M | Batch (-50%) |
|--------|-----------|------------|--------------|
| Claude Opus 4.6 | $5.00 | $25.00 | $2.50 / $12.50 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $1.50 / $7.50 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.50 / $2.50 |
| Claude Opus 4.5 | $5.00 | $25.00 | — |
| Claude Sonnet 4.5 | $3.00 | $15.00 | — |
| Claude Opus 4.1 | $15.00 | $75.00 | — |

**Prompt Caching:**
- Cache write (5 мин): 1.25× от base input
- Cache write (1 час): 2× от base input
- Cache read: 0.1× от base input (экономия 90%)

**Opus 4.6 Fast Mode (research preview):** $30 / $150 — в 6× дороже, но значительно быстрее.

---

## 3. Установка SDK

```bash
# Базовая установка
pip install anthropic

# С поддержкой AWS Bedrock
pip install anthropic[bedrock]

# С поддержкой Google Vertex AI
pip install anthropic[vertex]

# С улучшенным async (aiohttp)
pip install anthropic[aiohttp]
```

**Требования:** Python 3.9+

```bash
# Node.js SDK
npm install @anthropic-ai/sdk
```

---

## 4. Аутентификация

### Переменная окружения (рекомендуется)

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### В коде Python

```python
import os
from anthropic import Anthropic

# Ключ берётся автоматически из ANTHROPIC_API_KEY
client = Anthropic()

# Или явно
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
```

### .env файл (для разработки)

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
```

```python
from dotenv import load_dotenv
load_dotenv()
client = Anthropic()
```

---

## 5. Базовые запросы

### Простой запрос (sync)

```python
import os
from anthropic import Anthropic

client = Anthropic()

message = client.messages.create(
    model="claude-opus-4-6",       # ID модели
    max_tokens=1024,                # Обязательный параметр
    messages=[
        {"role": "user", "content": "Привет! Расскажи о себе."}
    ]
)

print(message.content[0].text)     # Текст ответа
print(message.usage.input_tokens)  # Использованные токены
print(message.usage.output_tokens)
```

### С системным промптом

```python
message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=2048,
    system="Ты опытный продюсер в кино. Отвечай кратко и по делу.",
    messages=[
        {"role": "user", "content": "Как составить смету на съёмочный день?"}
    ]
)
```

### Многоходовой диалог

```python
messages = [
    {"role": "user", "content": "Что такое токен в контексте LLM?"},
    {"role": "assistant", "content": "Токен — это единица текста..."},
    {"role": "user", "content": "Как посчитать цену запроса?"}
]

response = client.messages.create(
    model="claude-haiku-4-5-20251001",
    max_tokens=1024,
    messages=messages
)
```

---

## 6. Асинхронный клиент

```python
import asyncio
from anthropic import AsyncAnthropic

client = AsyncAnthropic()

async def main():
    message = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Hello!"}]
    )
    print(message.content[0].text)

asyncio.run(main())
```

### Async с aiohttp (лучшая производительность)

```python
from anthropic import AsyncAnthropic, DefaultAioHttpClient
import asyncio

async def main():
    async with AsyncAnthropic(http_client=DefaultAioHttpClient()) as client:
        message = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Hello!"}]
        )
        print(message.content[0].text)

asyncio.run(main())
```

---

## 7. Стриминг

### Python SDK (рекомендуется)

```python
client = Anthropic()

with client.messages.stream(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Напиши короткий рассказ"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

# Получить финальный объект Message
final_message = stream.get_final_message()
print(f"\nTokens: {final_message.usage}")
```

### Через параметр stream=True

```python
with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=2048,
    messages=[{"role": "user", "content": "..."}]
) as stream:
    for event in stream:
        if hasattr(event, 'delta') and hasattr(event.delta, 'text'):
            print(event.delta.text, end="")
```

### curl (прямой API)

```bash
curl https://api.anthropic.com/v1/messages \
  --header "x-api-key: $ANTHROPIC_API_KEY" \
  --header "anthropic-version: 2023-06-01" \
  --header "content-type: application/json" \
  --data '{
    "model": "claude-opus-4-6",
    "max_tokens": 1024,
    "stream": true,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## 8. Vision (изображения)

### Base64 (любое изображение)

```python
import base64

with open("image.jpg", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",  # jpeg / png / gif / webp
                    "data": image_data
                }
            },
            {
                "type": "text",
                "text": "Что на этом изображении?"
            }
        ]
    }]
)
```

### По URL

```python
message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "url",
                    "url": "https://example.com/image.jpg"
                }
            },
            {"type": "text", "text": "Опиши изображение"}
        ]
    }]
)
```

---

## 9. Tool Use (вызов функций)

```python
tools = [
    {
        "name": "get_weather",
        "description": "Получить текущую погоду для указанного города",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "Название города"
                },
                "units": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "Единицы температуры"
                }
            },
            "required": ["city"]
        }
    }
]

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "Какая погода в Москве?"}]
)

# Обработка вызова инструмента
if response.stop_reason == "tool_use":
    for block in response.content:
        if block.type == "tool_use":
            tool_name = block.name
            tool_input = block.input
            # Выполнить функцию и вернуть результат
            tool_result = call_your_function(tool_name, tool_input)
            
            # Продолжить диалог с результатом
            messages = [
                {"role": "user", "content": "Какая погода в Москве?"},
                {"role": "assistant", "content": response.content},
                {
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": str(tool_result)
                    }]
                }
            ]
            
            final_response = client.messages.create(
                model="claude-opus-4-6",
                max_tokens=1024,
                tools=tools,
                messages=messages
            )
```

---

## 10. Extended Thinking (расширенное мышление)

Позволяет Claude "думать вслух" перед ответом. Улучшает качество на сложных задачах.

### Adaptive mode (рекомендуется для Opus 4.6)

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={
        "type": "adaptive"   # Claude сам решает когда и сколько думать
    },
    messages=[{"role": "user", "content": "Реши сложную математическую задачу..."}]
)

for block in response.content:
    if block.type == "thinking":
        print("Размышления:", block.thinking)
    elif block.type == "text":
        print("Ответ:", block.text)
```

### Явный budget (для других моделей)

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 8000    # Минимум 1024, меньше чем max_tokens
    },
    messages=[{"role": "user", "content": "..."}]
)
```

> **Стоимость:** thinking токены = output токены (оплачиваются по той же ставке).

---

## 11. Prompt Caching

Кеширует часть промпта для повторных запросов. Экономия до 90%.

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "Очень длинный системный промпт с документацией...",
            "cache_control": {"type": "ephemeral"}  # Кешировать на 5 мин
        }
    ],
    messages=[{"role": "user", "content": "Вопрос по документации"}]
)

# Проверить использование кеша
print(response.usage.cache_read_input_tokens)
print(response.usage.cache_creation_input_tokens)
```

---

## 12. Batch API (пакетная обработка)

50% скидка, асинхронная обработка до 24 часов.

```python
# Создать batch
batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": "request-1",
            "params": {
                "model": "claude-opus-4-6",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": "Привет!"}]
            }
        },
        {
            "custom_id": "request-2",
            "params": {
                "model": "claude-opus-4-6",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": "Как дела?"}]
            }
        }
    ]
)

print(f"Batch ID: {batch.id}")
print(f"Status: {batch.processing_status}")

# Проверить статус
batch_status = client.messages.batches.retrieve(batch.id)

# Получить результаты
for result in client.messages.batches.results(batch.id):
    print(f"{result.custom_id}: {result.result.message.content[0].text}")
```

---

## 13. Structured Outputs (JSON)

```python
import json

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system="Отвечай ТОЛЬКО валидным JSON без markdown-обёртки.",
    messages=[{
        "role": "user",
        "content": "Верни данные о фильме 'Матрица' в формате: {title, year, director, genre[]}"
    }]
)

data = json.loads(response.content[0].text)
```

---

## 14. Files API (загрузка файлов)

Загрузи файл один раз — используй в нескольких запросах.

```python
from pathlib import Path

# Загрузить файл
with client.beta.files.upload(
    file=Path("document.pdf"),
    betas=["files-api-2025-04-14"],
) as file_response:
    file_id = file_response.id

# Использовать в запросе
response = client.beta.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Кратко изложи этот документ"},
            {
                "type": "document",
                "source": {"type": "file", "file_id": file_id}
            }
        ]
    }],
    betas=["files-api-2025-04-14"]
)
```

---

## 15. OpenAI-совместимый endpoint

Для миграции с OpenAI — менять только baseURL и модель.

```python
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
    base_url="https://api.anthropic.com/v1/"
)

response = client.chat.completions.create(
    model="claude-opus-4-6",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

---

## 16. Обработка ошибок

```python
import anthropic
from anthropic import APIError, RateLimitError, APIStatusError

client = anthropic.Anthropic(
    max_retries=3,      # Автоматические ретраи (по умолчанию 2)
    timeout=30.0        # Таймаут в секундах
)

try:
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Hello"}]
    )
except RateLimitError as e:
    print("Rate limit — подождать и повторить")
    print(f"Headers: {e.response.headers}")
except APIStatusError as e:
    print(f"API Error {e.status_code}: {e.message}")
except APIError as e:
    print(f"Общая ошибка: {e}")
```

---

## 17. Подсчёт токенов (до отправки)

```python
# Посчитать токены без реального запроса
token_count = client.messages.count_tokens(
    model="claude-opus-4-6",
    system="Системный промпт...",
    messages=[{"role": "user", "content": "Пользовательский вопрос..."}]
)

print(f"Input tokens: {token_count.input_tokens}")
print(f"Примерная цена: ${token_count.input_tokens / 1_000_000 * 5:.4f}")
```

---

## 18. AWS Bedrock

```python
import anthropic

client = anthropic.AnthropicBedrock(
    aws_region="us-east-1",
    # Аутентификация через AWS SDK (env vars или IAM role)
)

response = client.messages.create(
    model="anthropic.claude-opus-4-6-v1",   # Bedrock ID
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}]
)
```

**Bedrock ID моделей:**

| Модель | Bedrock ID |
|--------|-----------|
| Claude Opus 4.6 | `anthropic.claude-opus-4-6-v1` |
| Claude Sonnet 4.6 | `anthropic.claude-sonnet-4-6` |
| Claude Haiku 4.5 | `anthropic.claude-haiku-4-5-20251001-v1:0` |

---

## 19. Заголовки API

Все запросы к `https://api.anthropic.com/v1/messages` требуют:

```
x-api-key: YOUR_API_KEY
anthropic-version: 2023-06-01
content-type: application/json
```

**Beta-заголовки (для новых фич):**

| Функция | Заголовок |
|---------|-----------|
| Files API | `anthropic-beta: files-api-2025-04-14` |
| 1M Context | `anthropic-beta: context-1m-2025-08-07` |
| Interleaved Thinking | `anthropic-beta: interleaved-thinking-2025-05-14` |
| Fine-grained Tool Streaming | `anthropic-beta: fine-grained-tool-streaming-2025-05-14` |
| Context Management | `anthropic-beta: context-management-2025-06-27` |

---

## 20. Параметры запроса (Messages API)

| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| `model` | string | ✅ | ID модели |
| `messages` | array | ✅ | История сообщений |
| `max_tokens` | int | ✅ | Макс. токенов в ответе |
| `system` | string/array | — | Системный промпт |
| `temperature` | float 0–1 | — | Случайность (default: 1.0) |
| `top_p` | float | — | Nucleus sampling |
| `top_k` | int | — | Top-k sampling |
| `stream` | bool | — | Стриминг ответа |
| `tools` | array | — | Описание инструментов |
| `tool_choice` | object | — | Управление вызовом тулов |
| `thinking` | object | — | Extended thinking |
| `stop_sequences` | array | — | Стоп-последовательности |
| `metadata` | object | — | user_id для трекинга |

---

## 21. Структура ответа

```python
response = client.messages.create(...)

response.id             # "msg_..."
response.type           # "message"
response.role           # "assistant"
response.model          # "claude-opus-4-6"
response.stop_reason    # "end_turn" / "max_tokens" / "tool_use" / "stop_sequence"
response.content        # List[TextBlock | ToolUseBlock | ThinkingBlock]
response.usage.input_tokens
response.usage.output_tokens
response.usage.cache_read_input_tokens
response.usage.cache_creation_input_tokens

# Получить текст
text = response.content[0].text
```

---

## 22. Быстрый старт — шаблон для Claude Code

```python
"""
Готовый шаблон подключения к Claude API
Сохрани в api_client.py
"""
import os
from anthropic import Anthropic, APIError, RateLimitError

# --- Конфигурация ---
MODELS = {
    "opus":   "claude-opus-4-6",           # Мощная, $5/$25 per 1M
    "sonnet": "claude-sonnet-4-6",          # Баланс, $3/$15 per 1M
    "haiku":  "claude-haiku-4-5-20251001",  # Быстрая, $1/$5 per 1M
}
DEFAULT_MODEL = MODELS["sonnet"]

# --- Клиент ---
client = Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
    max_retries=3,
    timeout=60.0
)

def ask(
    prompt: str,
    model: str = DEFAULT_MODEL,
    system: str = "",
    max_tokens: int = 2048,
    temperature: float = 1.0
) -> str:
    """Простая обёртка для одиночного запроса."""
    kwargs = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}]
    }
    if system:
        kwargs["system"] = system
    
    try:
        response = client.messages.create(**kwargs)
        return response.content[0].text
    except RateLimitError:
        raise
    except APIError as e:
        print(f"API Error: {e}")
        raise

def chat(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    system: str = "",
    max_tokens: int = 2048
) -> tuple[str, dict]:
    """Многоходовой диалог. Возвращает (текст, usage)."""
    kwargs = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages
    }
    if system:
        kwargs["system"] = system
    
    response = client.messages.create(**kwargs)
    usage = {
        "input": response.usage.input_tokens,
        "output": response.usage.output_tokens
    }
    return response.content[0].text, usage


# --- Пример использования ---
if __name__ == "__main__":
    # Простой запрос
    result = ask("Привет! Как дела?", model=MODELS["haiku"])
    print(result)
    
    # Диалог
    history = [
        {"role": "user", "content": "Что такое prompt caching?"},
        {"role": "assistant", "content": "Prompt caching — это..."},
        {"role": "user", "content": "Какова экономия?"}
    ]
    text, usage = chat(history, system="Отвечай кратко.")
    print(text)
    print(f"Токены: input={usage['input']}, output={usage['output']}")
```

---

## 23. Полезные ссылки

| Ресурс | URL |
|--------|-----|
| Документация API | https://platform.claude.com/docs |
| Модели и цены | https://platform.claude.com/docs/en/about-claude/models/overview |
| API Console | https://console.anthropic.com |
| Python SDK (PyPI) | https://pypi.org/project/anthropic/ |
| GitHub SDK | https://github.com/anthropics/anthropic-sdk-python |
| OpenAI-совместимость | https://platform.claude.com/docs/en/api/openai-sdk-compatibility |
| Extended Thinking | https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking |
| Стриминг | https://docs.anthropic.com/en/api/messages-streaming |
| Release Notes | https://docs.anthropic.com/en/release-notes/api |

---

*Обновлено: март 2026. Проверяй актуальность моделей на `platform.claude.com/docs/en/about-claude/models/overview`*
