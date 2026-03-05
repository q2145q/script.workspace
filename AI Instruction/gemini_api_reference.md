# Gemini API — Полный справочник (март 2026)

> Актуальные данные из официальной документации Google AI.  
> Источник: `ai.google.dev/api` · `googleapis.github.io/python-genai`

---

## ⚠️ Важные предупреждения (март 2026)

- `gemini-3-pro-preview` **устарел**, будет отключён **26 марта 2026** → мигрируй на `gemini-3.1-pro-preview`
- `gemini-2.0-flash` и `gemini-2.0-flash-lite` будут отключены **1 июня 2026** → переходи на `gemini-2.5-flash-lite`
- **Старый SDK** `google-generativeai` — **legacy**, не используй для новых проектов
- **Новый SDK** `google-genai` — GA с мая 2025, это единственный актуальный вариант

---

## 1. Актуальные модели

### Gemini 3.x (новейшее поколение, preview)

| Модель | API ID | Контекст | Описание |
|--------|--------|----------|----------|
| **Gemini 3.1 Pro Preview** | `gemini-3.1-pro-preview` | 1M | Самая мощная. Агенты, сложный код, reasoning |
| **Gemini 3.1 Pro Preview (custom tools)** | `gemini-3.1-pro-preview-customtools` | 1M | Когда модель игнорирует кастомные инструменты |
| **Gemini 3 Flash Preview** | `gemini-3-flash-preview` | 1M | Frontier-класс, быстрая, дешевле Pro |
| **Gemini 3.1 Flash-Lite Preview** | `gemini-3.1-flash-lite-preview` | 1M | Самая экономичная в серии Gemini 3 |

> Gemini 3 Pro Preview: **только платный tier**, без бесплатного доступа.

### Gemini 2.5 (стабильные, production)

| Модель | API ID | Контекст | Описание |
|--------|--------|----------|----------|
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | 2M | Лучший для кода и сложных задач. Стабильный |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | 1M | ⭐ Лучший price/performance. С reasoning |
| **Gemini 2.5 Flash-Lite** | `gemini-2.5-flash-lite` | 1M | Самый дешёвый стабильный. Высокий throughput |

### Gemini 2.0 (устаревающие, ещё доступны)

| Модель | API ID | Контекст | Описание |
|--------|--------|----------|----------|
| Gemini 2.0 Flash | `gemini-2.0-flash` | 1M | Будет отключён 1 июня 2026 |
| Gemini 2.0 Flash-Lite | `gemini-2.0-flash-lite` | 1M | Будет отключён 1 июня 2026 |

### Именование и версии

```
gemini-2.5-flash          → alias (stable), всегда указывает на последний стабильный
gemini-2.5-flash-latest   → alias, последний релиз (stable/preview/experimental)
gemini-3-flash-preview    → конкретная preview-версия
```

> **Для production:** используй стабильные алиасы без суффикса (например `gemini-2.5-flash`).  
> Stable модели обычно не меняются без уведомления.

---

## 2. Цены (USD, актуально на март 2026)

### Платные модели

| Модель | Input / 1M | Output / 1M | Cache read / 1M |
|--------|-----------|------------|----------------|
| Gemini 3.1 Pro Preview | $2.00 (≤200K) / $4.00 (>200K) | $12.00 (≤200K) / $18.00 (>200K) | — |
| Gemini 3 Flash Preview | $0.50 | $3.00 | — |
| Gemini 2.5 Pro | $1.25 (≤200K) / $2.50 (>200K) | $10.00 (≤200K) / $15.00 (>200K) | $0.125 |
| Gemini 2.5 Flash | $0.30 | $2.50 | $0.03 |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | — |
| Gemini 2.0 Flash | $0.10 | $0.40 | $0.025 |
| Gemini 2.0 Flash-Lite | $0.075 | $0.30 | — |

### Бесплатный tier (Google AI Studio)

- `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3-flash-preview` — бесплатно с лимитами
- `gemini-3.1-pro-preview` — только платный
- **AI Studio: полностью бесплатен** для всех доступных моделей

### Дополнительные инструменты

| Инструмент | Стоимость |
|-----------|-----------|
| Google Search grounding (Gemini 2.x) | $35 / 1,000 запросов (1,500 RPD бесплатно) |
| Google Search grounding (Gemini 3.x) | $14 / 1,000 запросов |
| Batch API | -50% от стандартной цены |
| Context caching | ~-90% (читать кеш = 10% от input) |
| Audio input | 2–7× дороже текстового input |

> Pro модели: 2× цена для запросов >200K токенов. Flash — фиксированная цена.

---

## 3. Установка SDK

```bash
# Основной SDK (единственный актуальный)
pip install google-genai

# С поддержкой aiohttp для лучшего async
pip install google-genai[aiohttp]

# Node.js
npm install @google/genai
```

**Требования:** Python 3.9+

> ⛔ Не используй `google-generativeai` (legacy, устарел с Gemini 2.0)

---

## 4. Аутентификация

### Переменная окружения (рекомендуется)

```bash
export GEMINI_API_KEY="AIza..."
# или
export GOOGLE_API_KEY="AIza..."   # GOOGLE_API_KEY имеет приоритет если установлены оба
```

Получить ключ: [Google AI Studio](https://aistudio.google.com/apikey) — бесплатно.

### В коде Python

```python
from google import genai

# Ключ берётся автоматически из GEMINI_API_KEY
client = genai.Client()

# Или явно
client = genai.Client(api_key="AIza...")
```

### .env файл (для разработки)

```bash
# .env
GEMINI_API_KEY=AIza...
```

```python
from dotenv import load_dotenv
load_dotenv()
from google import genai
client = genai.Client()
```

---

## 5. Базовые запросы

### Простой запрос (sync)

```python
from google import genai

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Привет! Расскажи о себе."
)

print(response.text)                    # Текст ответа
print(response.usage_metadata)          # Использованные токены
```

### С системным промптом и конфигурацией

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Как составить смету на съёмочный день?",
    config=types.GenerateContentConfig(
        system_instruction="Ты опытный продюсер в кино. Отвечай кратко и по делу.",
        max_output_tokens=2048,
        temperature=0.7,
    )
)

print(response.text)
```

### Многоходовой диалог (history вручную)

```python
contents = [
    {"role": "user", "parts": [{"text": "Что такое токен в контексте LLM?"}]},
    {"role": "model", "parts": [{"text": "Токен — это единица текста..."}]},
    {"role": "user", "parts": [{"text": "Как посчитать цену запроса?"}]},
]

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=contents
)
```

---

## 6. Chat-интерфейс (диалог)

SDK автоматически управляет историей:

```python
from google import genai

client = genai.Client()

# Создать чат-сессию
chat = client.chats.create(model="gemini-2.5-flash")

# Отправить сообщения
response1 = chat.send_message("Что такое смета?")
print(response1.text)

response2 = chat.send_message("Дай пример для съёмочного дня")
print(response2.text)

# Просмотреть историю
for message in chat.get_history():
    print(f"{message.role}: {message.parts[0].text}")
```

### Async Chat

```python
import asyncio
from google import genai

client = genai.Client()

async def main():
    chat = client.aio.chats.create(model="gemini-2.5-flash")
    response = await chat.send_message("Привет!")
    print(response.text)

asyncio.run(main())
```

---

## 7. Асинхронный клиент

```python
import asyncio
from google import genai

client = genai.Client()

async def main():
    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents="Объясни работу LLM"
    )
    print(response.text)

asyncio.run(main())
```

### Async с aiohttp (лучшая производительность)

```python
from google import genai
from google.genai import types

client = genai.Client(
    http_options=types.HttpOptions(
        async_client_args={}  # настройки aiohttp
    )
)
```

---

## 8. Стриминг

### Python SDK

```python
from google import genai

client = genai.Client()

# Синхронный стриминг
for chunk in client.models.generate_content_stream(
    model="gemini-2.5-flash",
    contents="Напиши подробный план съёмочного дня"
):
    print(chunk.text, end="", flush=True)

print()  # Новая строка в конце
```

### Async стриминг

```python
import asyncio
from google import genai

client = genai.Client()

async def main():
    async for chunk in client.aio.models.generate_content_stream(
        model="gemini-2.5-flash",
        contents="Объясни принципы сметы"
    ):
        print(chunk.text, end="", flush=True)

asyncio.run(main())
```

### Стриминг чата

```python
chat = client.chats.create(model="gemini-2.5-flash")

for chunk in chat.send_message_stream("Расскажи о производстве фильмов"):
    print(chunk.text, end="", flush=True)
```

### curl (прямой API)

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "contents": [{"parts": [{"text": "Привет!"}]}]
  }'
```

---

## 9. Vision (изображения)

### Base64

```python
import base64
from google import genai
from google.genai import types

client = genai.Client()

with open("image.jpg", "rb") as f:
    image_data = base64.b64encode(f.read()).decode("utf-8")

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        types.Part(
            inline_data=types.Blob(
                mime_type="image/jpeg",
                data=image_data
            )
        ),
        types.Part(text="Что на этом изображении?")
    ]
)

print(response.text)
```

### По URL

```python
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        types.Part(
            file_data=types.FileData(
                file_uri="https://example.com/image.jpg",
                mime_type="image/jpeg"
            )
        ),
        types.Part(text="Опиши изображение")
    ]
)
```

### Из Google Cloud Storage

```python
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        types.Part.from_uri(
            file_uri="gs://bucket/image.jpg",
            mime_type="image/jpeg"
        ),
        "Что показано на изображении?"
    ]
)
```

---

## 10. Files API (загрузка файлов)

Загрузи файл один раз и используй в нескольких запросах.

```python
from google import genai

client = genai.Client()

# Загрузить файл
uploaded_file = client.files.upload(file="document.pdf")
print(f"File ID: {uploaded_file.name}")

# Использовать в запросе
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=["Кратко изложи этот документ", uploaded_file]
)
print(response.text)

# Список загруженных файлов
for file in client.files.list():
    print(f"{file.name}: {file.mime_type}")

# Удалить файл
client.files.delete(name=uploaded_file.name)
```

**Поддерживаемые форматы:** PDF, TXT, images (JPEG/PNG/WebP/GIF), audio (MP3/WAV/etc), video (MP4/etc)

---

## 11. Function Calling (вызов функций)

### Автоматический режим

```python
from google import genai
from google.genai import types

client = genai.Client()

# Обычная Python-функция — SDK автоматически извлечёт схему
def get_weather(city: str, units: str = "celsius") -> str:
    """Получить текущую погоду для указанного города.
    
    Args:
        city: Название города
        units: Единицы температуры (celsius или fahrenheit)
    
    Returns:
        Строка с описанием погоды
    """
    return f"В {city} сейчас 15°C, солнечно"

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Какая погода в Москве?",
    config=types.GenerateContentConfig(
        tools=[get_weather],
        automatic_function_calling=types.AutomaticFunctionCallingConfig(
            maximum_remote_calls=3
        )
    )
)

print(response.text)
```

### Ручной режим (полный контроль)

```python
tools = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="get_weather",
                description="Получить погоду для города",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "city": types.Schema(type="STRING", description="Название города"),
                        "units": types.Schema(type="STRING", enum=["celsius", "fahrenheit"])
                    },
                    required=["city"]
                )
            )
        ]
    )
]

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Погода в Москве?",
    config=types.GenerateContentConfig(tools=tools)
)

# Обработать вызов функции
if response.candidates[0].content.parts[0].function_call:
    func_call = response.candidates[0].content.parts[0].function_call
    func_name = func_call.name
    func_args = func_call.args
    
    # Выполнить функцию
    result = "15°C, солнечно"
    
    # Вернуть результат модели
    final_response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Content(role="user", parts=[types.Part(text="Погода в Москве?")]),
            response.candidates[0].content,
            types.Content(
                role="user",
                parts=[types.Part(
                    function_response=types.FunctionResponse(
                        name=func_name,
                        response={"result": result}
                    )
                )]
            )
        ],
        config=types.GenerateContentConfig(tools=tools)
    )
```

---

## 12. Thinking (расширенное мышление)

Доступно для Gemini 2.5 Flash, 2.5 Pro и всех Gemini 3.x моделей.

### Gemini 2.5 Flash — thinking budget

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Реши сложную математическую задачу...",
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_budget=8000    # Токены для размышлений (0 = отключить)
        )
    )
)

print(response.text)
```

### Gemini 3.x — thinking levels

```python
# Gemini 3 использует thinking_level вместо thinking_budget
response = client.models.generate_content(
    model="gemini-3.1-pro-preview",
    contents="Сложная задача требующая рассуждений",
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level="high"   # "low", "medium", "high"
        )
    )
)
```

> **Важно для Gemini 3:** возвращай `thought_signatures` обратно в API в multi-turn диалоге, иначе качество ухудшится (или будет ошибка 400 для image generation).

---

## 13. Structured Outputs (JSON)

### Через system instruction

```python
import json
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents='Данные о фильме "Матрица": title, year, director, genres',
    config=types.GenerateContentConfig(
        system_instruction="Отвечай ТОЛЬКО валидным JSON без markdown-обёртки.",
        response_mime_type="application/json"
    )
)

data = json.loads(response.text)
```

### С JSON Schema (response_schema)

```python
from google.genai import types

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Список 3 популярных фильмов",
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema={
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "year": {"type": "integer"},
                    "director": {"type": "string"}
                },
                "required": ["title", "year", "director"]
            }
        }
    )
)

import json
films = json.loads(response.text)
```

---

## 14. Context Caching

Кеширует часть контекста для повторных запросов. Экономия до 90%.

```python
import datetime
from google import genai
from google.genai import types

client = genai.Client()

# Создать кеш с большим документом
cache = client.caches.create(
    model="gemini-2.5-flash",
    config=types.CreateCachedContentConfig(
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part(text="Огромный документ для кеширования..." * 1000)
                ]
            )
        ],
        system_instruction="Ты помощник по анализу документов",
        ttl=datetime.timedelta(hours=1)     # Хранить 1 час
    )
)

print(f"Cache ID: {cache.name}")

# Использовать кеш в запросе
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Кратко изложи ключевые моменты",
    config=types.GenerateContentConfig(
        cached_content=cache.name
    )
)

print(response.text)

# Проверить использование кеша
print(response.usage_metadata.cached_content_token_count)
```

---

## 15. Batch API (пакетная обработка)

50% скидка, асинхронная обработка.

```python
from google import genai
from google.genai import types

client = genai.Client()

# Создать batch-задачи
requests = [
    types.EmbedContentRequest(
        model="text-embedding-004",
        content=types.Content(parts=[types.Part(text=f"Текст {i}")])
    )
    for i in range(10)
]

# Для generate_content используй прямой API или SDK batch методы
# (детали: ai.google.dev/api/batch-api)
```

---

## 16. Embeddings (векторизация)

```python
from google import genai

client = genai.Client()

result = client.models.embed_content(
    model="text-embedding-004",
    contents="Привет мир"
)

print(result.embeddings[0].values)  # Вектор размерностью 768
```

### Batch embeddings

```python
result = client.models.embed_content(
    model="text-embedding-004",
    contents=[
        "Первый текст",
        "Второй текст",
        "Третий текст"
    ]
)

for embedding in result.embeddings:
    print(len(embedding.values))  # 768
```

> **text-embedding-004** — полностью бесплатен для всех пользователей.

---

## 17. Google Search Grounding

Модель может искать актуальную информацию в интернете.

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Какой курс доллара сегодня в России?",
    config=types.GenerateContentConfig(
        tools=[types.Tool(google_search=types.GoogleSearch())]
    )
)

print(response.text)

# Проверить источники
if response.candidates[0].grounding_metadata:
    for chunk in response.candidates[0].grounding_metadata.grounding_chunks:
        print(f"Источник: {chunk.web.uri}")
```

---

## 18. Code Execution

Модель может писать и выполнять Python-код.

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Вычисли сумму всех простых чисел до 100",
    config=types.GenerateContentConfig(
        tools=[types.Tool(code_execution=types.ToolCodeExecution())]
    )
)

for part in response.candidates[0].content.parts:
    if part.text:
        print("Текст:", part.text)
    if part.executable_code:
        print("Код:", part.executable_code.code)
    if part.code_execution_result:
        print("Результат:", part.code_execution_result.output)
```

---

## 19. Подсчёт токенов

```python
from google import genai

client = genai.Client()

# Посчитать до отправки запроса
result = client.models.count_tokens(
    model="gemini-2.5-flash",
    contents="Длинный текст для подсчёта токенов..."
)

print(f"Токенов: {result.total_tokens}")
print(f"Примерная цена: ${result.total_tokens / 1_000_000 * 0.30:.4f}")
```

---

## 20. Обработка ошибок

```python
from google import genai
from google.api_core import exceptions as google_exceptions

client = genai.Client()

try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Hello"
    )
    print(response.text)
    
except google_exceptions.ResourceExhausted as e:
    print(f"Rate limit: {e}")
    # Подождать и повторить
    
except google_exceptions.InvalidArgument as e:
    print(f"Неверный запрос: {e}")
    
except google_exceptions.NotFound as e:
    print(f"Модель не найдена: {e}")
    
except google_exceptions.PermissionDenied as e:
    print(f"Нет доступа (проверь API ключ): {e}")
    
except Exception as e:
    print(f"Ошибка: {e}")
```

---

## 21. Vertex AI (enterprise)

Для Google Cloud с data residency и enterprise-поддержкой.

```python
from google import genai

# Через переменные окружения
# export GOOGLE_GENAI_USE_VERTEXAI=true
# export GOOGLE_CLOUD_PROJECT=my-project-id
# export GOOGLE_CLOUD_LOCATION=us-central1

# Или явно
client = genai.Client(
    vertexai=True,
    project="my-project-id",
    location="us-central1"
)

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Hello from Vertex AI!"
)
```

---

## 22. REST API (curl)

Базовый URL: `https://generativelanguage.googleapis.com/v1beta/`

```bash
# Простой запрос
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "contents": [
      {"parts": [{"text": "Привет!"}]}
    ]
  }'

# С системным промптом
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "system_instruction": {"parts": [{"text": "Отвечай кратко"}]},
    "contents": [
      {"role": "user", "parts": [{"text": "Что такое ИИ?"}]}
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 1024
    }
  }'

# Список доступных моделей
curl "https://generativelanguage.googleapis.com/v1beta/models" \
  -H "x-goog-api-key: $GEMINI_API_KEY"
```

---

## 23. Параметры GenerateContentConfig

| Параметр | Тип | Описание |
|----------|-----|----------|
| `system_instruction` | str | Системный промпт |
| `temperature` | float 0–2 | Случайность (default: 1.0) |
| `top_p` | float | Nucleus sampling |
| `top_k` | int | Top-k sampling |
| `max_output_tokens` | int | Макс. токенов в ответе |
| `stop_sequences` | list[str] | Стоп-последовательности |
| `response_mime_type` | str | `"text/plain"` или `"application/json"` |
| `response_schema` | dict | JSON Schema для структурированного вывода |
| `tools` | list | Инструменты (функции, Search, Code Exec) |
| `tool_config` | ToolConfig | Настройки вызова инструментов |
| `thinking_config` | ThinkingConfig | Настройки reasoning |
| `cached_content` | str | ID кеша для повторного использования |

---

## 24. Структура ответа

```python
response = client.models.generate_content(...)

response.text                           # Быстрый доступ к тексту
response.candidates                     # List[Candidate]
response.candidates[0].content.parts   # List[Part]
response.candidates[0].finish_reason   # STOP / MAX_TOKENS / SAFETY / etc
response.usage_metadata.prompt_token_count
response.usage_metadata.candidates_token_count
response.usage_metadata.total_token_count
response.usage_metadata.cached_content_token_count  # Если использовался кеш
```

---

## 25. Готовый шаблон для Claude Code

```python
"""
Готовый шаблон подключения к Gemini API
Сохрани в gemini_client.py
"""
import os
from google import genai
from google.genai import types
from google.api_core import exceptions as google_exc

# --- Конфигурация ---
MODELS = {
    "pro":        "gemini-2.5-pro",          # Лучший для кода, $1.25/$10 per 1M
    "flash":      "gemini-2.5-flash",        # ⭐ Баланс, $0.30/$2.50 per 1M
    "flash_lite": "gemini-2.5-flash-lite",   # Дешёвый, $0.10/$0.40 per 1M
    "frontier":   "gemini-3.1-pro-preview",  # Новейший, $2/$12 per 1M
}
DEFAULT_MODEL = MODELS["flash"]

# --- Клиент ---
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY")
)

def ask(
    prompt: str,
    model: str = DEFAULT_MODEL,
    system: str = "",
    max_tokens: int = 2048,
    temperature: float = 0.7
) -> str:
    """Простая обёртка для одиночного запроса."""
    config = types.GenerateContentConfig(
        max_output_tokens=max_tokens,
        temperature=temperature,
    )
    if system:
        config.system_instruction = system
    
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config
        )
        return response.text
    except google_exc.ResourceExhausted:
        raise
    except Exception as e:
        print(f"Ошибка Gemini API: {e}")
        raise

def chat_session(
    model: str = DEFAULT_MODEL,
    system: str = ""
):
    """Создать чат-сессию с автоматическим управлением историей."""
    config = types.GenerateContentConfig()
    if system:
        config.system_instruction = system
    
    return client.chats.create(model=model, config=config)

def count_tokens(text: str, model: str = DEFAULT_MODEL) -> int:
    """Посчитать токены до отправки запроса."""
    result = client.models.count_tokens(
        model=model,
        contents=text
    )
    return result.total_tokens


# --- Пример использования ---
if __name__ == "__main__":
    # Простой запрос
    result = ask("Привет! Что умеет Gemini?", model=MODELS["flash_lite"])
    print(result)
    
    # Диалог
    chat = chat_session(system="Ты помощник по киносмете. Отвечай кратко.")
    r1 = chat.send_message("Что включает смета на съёмочный день?")
    print(r1.text)
    r2 = chat.send_message("А транспорт?")
    print(r2.text)
    
    # Подсчёт токенов
    tokens = count_tokens("Длинный текст запроса...")
    price = tokens / 1_000_000 * 0.30
    print(f"Токенов: {tokens}, ~${price:.4f}")
```

---

## 26. Полезные ссылки

| Ресурс | URL |
|--------|-----|
| Документация API | https://ai.google.dev/api |
| Модели и цены | https://ai.google.dev/gemini-api/docs/models |
| Цены | https://ai.google.dev/gemini-api/docs/pricing |
| Google AI Studio | https://aistudio.google.com |
| Python SDK (PyPI) | https://pypi.org/project/google-genai/ |
| Python SDK Docs | https://googleapis.github.io/python-genai/ |
| GitHub SDK | https://github.com/googleapis/python-genai |
| Cookbook (примеры) | https://github.com/google-gemini/cookbook |
| Gemini 3 Guide | https://ai.google.dev/gemini-api/docs/gemini-3 |
| Thinking Guide | https://ai.google.dev/gemini-api/docs/thinking |
| Vertex AI | https://cloud.google.com/vertex-ai |

---

*Обновлено: март 2026. Проверяй актуальность моделей на `ai.google.dev/gemini-api/docs/models`*
