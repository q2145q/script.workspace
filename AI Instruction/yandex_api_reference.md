# Yandex AI Studio API — Полный справочник (март 2026)

> Актуальные данные из официальной документации Yandex Cloud.  
> Источник: `yandex.cloud/docs/ai-studio` · `aistudio.yandex.ru/docs`

---

## 1. О платформе

**Yandex AI Studio** — платформа Яндекса для разработки ИИ-приложений. Объединяет:
- YandexGPT (собственные LLM Яндекса)
- Open-source модели: Qwen, Gemma, gpt-oss
- Инструменты: Embeddings, YandexART, Classifiers, RAG, Agents
- Полная совместимость с OpenAI API (Responses API, Realtime API, Vector Store API)

**Доступ:** через [Yandex Cloud](https://console.yandex.cloud) — нужен аккаунт и каталог (folder).

---

## 2. Актуальные модели (февраль 2026)

### YandexGPT (собственные модели Яндекса)

| Модель | URI | Контекст | Описание |
|--------|-----|----------|----------|
| **YandexGPT Pro 5.1 (RC)** | `gpt://<folder_ID>/yandexgpt/rc` | 32,768 | Новейшая версия. Сложные задачи, reasoning |
| **YandexGPT Pro 5 (Latest)** | `gpt://<folder_ID>/yandexgpt/latest` | 32,768 | Стабильная Pro. Анализ, генерация, Q&A |
| **YandexGPT Pro 5** | `gpt://<folder_ID>/yandexgpt` | 32,768 | Алиас → latest по умолчанию |
| **YandexGPT Lite 5** | `gpt://<folder_ID>/yandexgpt-lite` | 32,768 | Быстрая, дешёвая, для чат-ботов |
| **YandexGPT Lite (Latest)** | `gpt://<folder_ID>/yandexgpt-lite/latest` | 32,768 | Явная ссылка на latest |
| **Alice AI LLM** | `gpt://<folder_ID>/aliceai-llm` | 32,768 | Модель ассистента Алиса |

### Open-source модели

| Модель | URI | Контекст | Описание |
|--------|-----|----------|----------|
| **Qwen3 235B** | `gpt://<folder_ID>/qwen3-235b-a22b-fp8/latest` | 262,144 | Мощная open-source модель |
| **gpt-oss-120b** | `gpt://<folder_ID>/gpt-oss-120b/latest` | 131,072 | OpenAI open-source 120B |
| **gpt-oss-20b** | `gpt://<folder_ID>/gpt-oss-20b/latest` | 131,072 | OpenAI open-source 20B |
| **Gemma 3 27B** | `gpt://<folder_ID>/gemma-3-27b-it/latest` | 131,072 | Google Gemma 3 (мультимодальная) |

### Генерация изображений

| Модель | URI | Описание |
|--------|-----|----------|
| **YandexART** | `art://<folder_ID>/yandex-art/latest` | Генерация изображений, до 500 символов |

### Ветки моделей (lifecycle)

| Ветка | Описание |
|-------|----------|
| `/rc` | Release Candidate — новейшая, может меняться |
| `/latest` | Стабильная текущая (рекомендуется для production) |
| `/deprecated` | Устаревшая, ещё поддерживается 1 месяц |

**Цикл обновления:** RC → через 1 месяц становится Latest → Latest уходит в Deprecated → через 1 месяц Latest и Deprecated становятся идентичными.

### Fine-tuned модели

```
gpt://<folder_ID>/yandexgpt-lite/latest@<suffix>
```

---

## 3. Цены (тарификация)

**Модель:** pay-as-you-go, оплата за токены (входящие + исходящие).  
Базовая единица: **1000 токенов = 0.4 руб** (множитель зависит от модели).

| Модель | Коэффициент | ~руб / 1000 токенов |
|--------|-------------|---------------------|
| YandexGPT Lite | 0.5 | ~0.20 руб |
| YandexGPT Pro | 6 | ~2.40 руб |
| Open-source модели | свой | уточнять в консоли |

**Новые виды токенов (март 2026):**
- **Кешированные токены** — повторно используемая часть контекста (~в 4× дешевле)
- **Токены инструментов** — данные от внешних вызовов (~в 4× дешевле)

**Асинхронный режим** — дешевле синхронного (задержка до нескольких часов).

> Актуальные цены: `yandex.cloud/ru/docs/ai-studio/pricing`

---

## 4. Получение доступа

### Шаг 1. Создать каталог в Yandex Cloud

1. Зайди в [консоль](https://console.yandex.cloud)
2. Создай каталог (folder) — запомни **folder_id**
3. Назначь роль `ai.languageModels.user` или выше

### Шаг 2. Получить API-ключ

```bash
# Через Yandex Cloud CLI
yc iam api-key create --service-account-name my-sa

# Сохранить в переменную окружения
export YC_API_KEY="AQVN..."
export YC_FOLDER_ID="b1g..."
```

Или создай ключ в [консоли](https://console.yandex.cloud) → IAM → Сервисные аккаунты → API-ключи.

### Типы аутентификации

| Тип | Переменная окружения | Описание |
|-----|---------------------|----------|
| API-ключ | `YC_API_KEY` | Рекомендуется для production |
| IAM-токен | `YC_IAM_TOKEN` | Временный, обновлять каждые 12ч |
| OAuth-токен | `YC_OAUTH_TOKEN` | Для CLI и разработки |

---

## 5. Установка SDK

```bash
# Основной Python ML SDK
pip install yandex-cloud-ml-sdk

# С поддержкой LangChain
pip install yandex-cloud-ml-sdk[langchain]
```

**Требования:** Python 3.9+, актуальная версия: 0.19.1 (январь 2026)

---

## 6. Инициализация клиента

```python
from yandex_cloud_ml_sdk import YCloudML

# Ключ из переменных окружения (автоматически)
# SDK проверяет: YC_API_KEY → YC_IAM_TOKEN → YC_OAUTH_TOKEN
sdk = YCloudML(
    folder_id="b1g...",   # Твой folder_id
    auth="AQVN..."        # Или оставь пустым — возьмёт из env
)

# Только через переменные окружения
import os
sdk = YCloudML(
    folder_id=os.environ["YC_FOLDER_ID"],
    auth=os.environ.get("YC_API_KEY")
)
```

---

## 7. Базовые запросы

### Простой запрос (sync)

```python
from yandex_cloud_ml_sdk import YCloudML

sdk = YCloudML(folder_id="b1g...", auth="AQVN...")

# Создать модель
model = sdk.models.completions("yandexgpt")

# Настроить и выполнить
result = model.configure(temperature=0.5).run([
    {"role": "user", "text": "Привет! Расскажи о себе."}
])

print(result.text)                    # Текст ответа
print(result.usage.input_text_tokens) # Входящие токены
print(result.usage.completion_tokens) # Исходящие токены
```

### С системным промптом

```python
messages = [
    {"role": "system", "text": "Ты опытный продюсер в кино. Отвечай кратко и по делу."},
    {"role": "user", "text": "Как составить смету на съёмочный день?"}
]

result = (
    sdk.models.completions("yandexgpt")
    .configure(temperature=0.6, max_tokens=2000)
    .run(messages)
)

print(result.text)
```

### Выбор версии модели

```python
# Через имя + версию
model = sdk.models.completions(
    model_name="yandexgpt",
    model_version="rc"         # rc / latest / deprecated
)

# Через полный URI
model = sdk.models.completions(
    "gpt://b1g.../yandexgpt/rc"
)

# Lite модель
model_lite = sdk.models.completions("yandexgpt-lite")

# Qwen
model_qwen = sdk.models.completions("qwen3-235b-a22b-fp8")
```

---

## 8. Многоходовой диалог

```python
from yandex_cloud_ml_sdk import YCloudML

sdk = YCloudML(folder_id="b1g...", auth="AQVN...")
model = sdk.models.completions("yandexgpt").configure(temperature=0.6)

# История накапливается вручную
history = [
    {"role": "system", "text": "Ты помощник по кино-производству."}
]

def chat(user_message: str) -> str:
    history.append({"role": "user", "text": user_message})
    result = model.run(history)
    history.append({"role": "assistant", "text": result.text})
    return result.text

print(chat("Что включает смета?"))
print(chat("А транспорт туда входит?"))
```

---

## 9. Асинхронный режим

```python
import asyncio
from yandex_cloud_ml_sdk import YCloudML

sdk = YCloudML(folder_id="b1g...", auth="AQVN...")

async def main():
    model = sdk.models.completions("yandexgpt")
    
    # Async запрос
    result = await model.configure(temperature=0.5).run_async([
        {"role": "user", "text": "Привет!"}
    ])
    
    print(result.text)

asyncio.run(main())
```

### Долгая асинхронная операция (deferred)

```python
# Отправить задачу и получить operation_id
operation = model.configure().run_deferred([
    {"role": "user", "text": "Сгенерируй длинный текст..."}
])

operation_id = operation.id
print(f"Operation ID: {operation_id}")

# Проверить позже
operation = sdk.operations.get(operation_id)
if operation.done:
    print(operation.result.text)
```

---

## 10. Стриминг

```python
from yandex_cloud_ml_sdk import YCloudML

sdk = YCloudML(folder_id="b1g...", auth="AQVN...")

messages = [
    {"role": "system", "text": "Найди ошибки в тексте и исправь их"},
    {"role": "user", "text": "Ашипки саме сибя ни исрпвят."}
]

# Потоковый вывод
for result in sdk.models.completions("yandexgpt").configure(temperature=0.5).run_stream(messages):
    for alternative in result:
        print(alternative.text, end="", flush=True)

print()  # Новая строка
```

### Async стриминг

```python
async def stream_response():
    async for result in sdk.models.completions("yandexgpt").run_stream_async(messages):
        for alt in result:
            print(alt.text, end="", flush=True)
```

---

## 11. REST API (прямые запросы)

**Базовый URL:** `https://llm.api.cloud.yandex.net/foundationModels/v1/`

### Синхронный запрос

```bash
curl "https://llm.api.cloud.yandex.net/foundationModels/v1/completion" \
  -H "Authorization: Api-Key $YC_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "modelUri": "gpt://<folder_ID>/yandexgpt/latest",
    "completionOptions": {
      "stream": false,
      "temperature": 0.6,
      "maxTokens": "2000"
    },
    "messages": [
      {"role": "system", "text": "Ты умный ассистент."},
      {"role": "user", "text": "Привет! Как дела?"}
    ]
  }'
```

### Стриминг через REST

```bash
curl "https://llm.api.cloud.yandex.net/foundationModels/v1/completion" \
  -H "Authorization: Api-Key $YC_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "modelUri": "gpt://<folder_ID>/yandexgpt/latest",
    "completionOptions": {"stream": true},
    "messages": [{"role": "user", "text": "Напиши рассказ"}]
  }'
```

### Асинхронный запрос через REST

```bash
# 1. Отправить задачу
curl "https://llm.api.cloud.yandex.net/foundationModels/v1/completionAsync" \
  -H "Authorization: Api-Key $YC_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"modelUri": "gpt://<folder_ID>/yandexgpt", "messages": [...]}'

# 2. Получить результат по operation_id
curl "https://llm.api.cloud.yandex.net/operations/<operation_id>" \
  -H "Authorization: Api-Key $YC_API_KEY"
```

---

## 12. OpenAI-совместимый API

Yandex AI Studio полностью совместим с OpenAI API. Меняй только base_url и ключ.

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ["YC_API_KEY"],
    base_url="https://llm.api.cloud.yandex.net/v1"
)

# Нужно передавать folder_id как часть имени модели или через заголовок
response = client.chat.completions.create(
    model="gpt://<folder_ID>/yandexgpt/latest",
    messages=[
        {"role": "system", "content": "Ты умный ассистент."},
        {"role": "user", "content": "Привет!"}
    ],
    temperature=0.7,
    max_tokens=1024
)

print(response.choices[0].message.content)
```

### Стриминг через OpenAI SDK

```python
stream = client.chat.completions.create(
    model="gpt://<folder_ID>/yandexgpt/latest",
    messages=[{"role": "user", "content": "Расскажи о кино"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

---

## 13. Reasoning Mode (рассуждения)

Доступно для YandexGPT Pro 5 (ветка RC).

```python
# Через REST API
import requests

response = requests.post(
    "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
    headers={"Authorization": f"Api-Key {api_key}"},
    json={
        "modelUri": f"gpt://{folder_id}/yandexgpt/rc",
        "completionOptions": {
            "stream": False,
            "temperature": 0.6,
            "maxTokens": "4000",
            "reasoningOptions": {
                "mode": "ENABLED_HIDDEN"  # DISABLED / ENABLED_HIDDEN
            }
        },
        "messages": [
            {"role": "user", "text": "Реши сложную математическую задачу..."}
        ]
    }
)
```

**Режимы reasoning:**
- `DISABLED` — рассуждения выключены (по умолчанию)
- `ENABLED_HIDDEN` — рассуждения включены, результат скрыт (дороже, но лучше качество)

---

## 14. Structured Output (JSON)

Поддерживается в YandexGPT Pro 5 (ветка RC).

```python
# Через REST API
response = requests.post(
    "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
    headers={"Authorization": f"Api-Key {api_key}"},
    json={
        "modelUri": f"gpt://{folder_id}/yandexgpt/rc",
        "completionOptions": {"stream": False},
        "messages": [
            {"role": "user", "text": "Назови дату первого полёта Гагарина."}
        ],
        "json_schema": {
            "schema": {
                "type": "object",
                "properties": {
                    "day":   {"title": "День", "type": "integer"},
                    "month": {"title": "Месяц", "type": "string"},
                    "year":  {"title": "Год", "type": "integer"}
                },
                "required": ["day", "month", "year"]
            }
        }
    }
)

import json
data = json.loads(response.json()["result"]["alternatives"][0]["message"]["text"])
```

### Через ML SDK с Pydantic

```python
import json
import pydantic
from yandex_cloud_ml_sdk import YCloudML

class FilmData(pydantic.BaseModel):
    title: str
    year: int
    director: str

sdk = YCloudML(folder_id="b1g...", auth="AQVN...")

result = (
    sdk.models.completions("yandexgpt", model_version="rc")
    .configure(response_format=FilmData)
    .run([{"role": "user", "text": "Расскажи о фильме Матрица в JSON"}])
)

film = FilmData.model_validate_json(result.text)
print(film.title, film.year)
```

---

## 15. Function Calling (вызов функций)

Доступно в YandexGPT Pro 5 (ветка RC).

```python
tools = [
    {
        "function": {
            "name": "get_weather",
            "description": "Получить текущую погоду для города",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "Название города"
                    }
                },
                "required": ["city"]
            }
        }
    }
]

response = requests.post(
    "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
    headers={"Authorization": f"Api-Key {api_key}"},
    json={
        "modelUri": f"gpt://{folder_id}/yandexgpt/rc",
        "completionOptions": {"stream": False},
        "messages": [{"role": "user", "text": "Какая погода в Москве?"}],
        "tools": tools
    }
)

result = response.json()["result"]["alternatives"][0]["message"]
if result.get("toolCallList"):
    for call in result["toolCallList"]["toolCalls"]:
        func_name = call["functionCall"]["name"]
        func_args = json.loads(call["functionCall"]["arguments"])
        # Выполнить функцию...
```

---

## 16. Embeddings (векторизация)

```python
from yandex_cloud_ml_sdk import YCloudML

sdk = YCloudML(folder_id="b1g...", auth="AQVN...")

# Для документов
doc_model = sdk.models.text_embeddings("text-search-doc")
result = doc_model.run("Текст документа для индексации")
print(result.embedding)   # Список float, размерность 256

# Для запросов (поиск)
query_model = sdk.models.text_embeddings("text-search-query")
result = query_model.run("поисковый запрос пользователя")
print(len(result.embedding))  # 256
```

### Модели эмбеддингов

| Модель | URI | Описание |
|--------|-----|----------|
| text-search-doc | `emb://<folder_ID>/text-search-doc/latest` | Для документов (индексация) |
| text-search-query | `emb://<folder_ID>/text-search-query/latest` | Для поисковых запросов |

### Через REST API

```bash
curl "https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding" \
  -H "Authorization: Api-Key $YC_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "modelUri": "emb://<folder_ID>/text-search-doc/latest",
    "text": "Текст для векторизации"
  }'
```

---

## 17. Генерация изображений (YandexART)

```python
from yandex_cloud_ml_sdk import YCloudML

sdk = YCloudML(folder_id="b1g...", auth="AQVN...")

model = sdk.models.image_generation("yandex-art")

# Асинхронная генерация (только async для изображений)
operation = model.run_deferred(
    "Красивый закат над Москвой, реалистичный стиль, 4K"
)

# Ожидать результата
result = operation.wait()

# Сохранить изображение
import base64
image_data = base64.b64decode(result.image_bytes)
with open("output.jpg", "wb") as f:
    f.write(image_data)
```

---

## 18. Параметры запроса

| Параметр | Тип | Описание |
|----------|-----|----------|
| `modelUri` | string | URI модели с folder_id |
| `stream` | bool | Потоковая передача (true/false) |
| `temperature` | float 0–1 | Случайность ответа |
| `maxTokens` | string | Макс. токенов в ответе |
| `reasoningOptions.mode` | string | `DISABLED` / `ENABLED_HIDDEN` |
| `json_schema` | object | JSON Schema для structured output |
| `tools` | array | Список функций для function calling |

---

## 19. Структура ответа REST API

```json
{
  "result": {
    "alternatives": [
      {
        "message": {
          "role": "assistant",
          "text": "Текст ответа..."
        },
        "status": "ALTERNATIVE_STATUS_FINAL"
      }
    ],
    "usage": {
      "inputTextTokens": "42",
      "completionTokens": "150",
      "totalTokens": "192"
    },
    "modelVersion": "23.10.2024"
  }
}
```

---

## 20. Обработка ошибок

```python
import requests
from yandex_cloud_ml_sdk import YCloudML
from yandex_cloud_ml_sdk.exceptions import YCloudMLError

sdk = YCloudML(folder_id="b1g...", auth="AQVN...")

try:
    result = sdk.models.completions("yandexgpt").run([
        {"role": "user", "text": "Привет!"}
    ])
    print(result.text)

except YCloudMLError as e:
    print(f"Ошибка YCloud: {e}")

except Exception as e:
    print(f"Общая ошибка: {e}")
```

### HTTP коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Неверный запрос (проверь параметры) |
| 401 | Ошибка аутентификации (проверь API-ключ) |
| 403 | Нет прав (проверь роль `ai.languageModels.user`) |
| 429 | Превышен лимит запросов (rate limit) |
| 500 | Внутренняя ошибка сервера |

---

## 21. LangChain интеграция

```python
from yandex_cloud_ml_sdk import YCloudML
from yandex_cloud_ml_sdk.langchain import ChatYandexCloudML

sdk = YCloudML(folder_id="b1g...", auth="AQVN...")

# Инициализация LangChain-совместимого чата
chat = ChatYandexCloudML(
    sdk=sdk,
    model_name="yandexgpt",
    model_version="latest",
    temperature=0.7
)

from langchain.schema import HumanMessage, SystemMessage

messages = [
    SystemMessage(content="Ты опытный продюсер"),
    HumanMessage(content="Как составить смету?")
]

response = chat(messages)
print(response.content)
```

---

## 22. Готовый шаблон для Claude Code

```python
"""
Готовый шаблон подключения к Yandex AI Studio API
Сохрани в yandex_client.py

Требования:
- pip install yandex-cloud-ml-sdk
- Переменные окружения: YC_API_KEY, YC_FOLDER_ID
"""
import os
from yandex_cloud_ml_sdk import YCloudML

# --- Конфигурация ---
FOLDER_ID = os.environ.get("YC_FOLDER_ID", "b1g...")
API_KEY   = os.environ.get("YC_API_KEY")

MODELS = {
    "pro_rc":   "yandexgpt/rc",          # Новейшая, RC-ветка
    "pro":      "yandexgpt",             # Стабильная Pro
    "lite":     "yandexgpt-lite",        # Быстрая и дешёвая
    "qwen":     "qwen3-235b-a22b-fp8",   # Open-source 235B
}
DEFAULT_MODEL = MODELS["pro"]

# --- Клиент ---
sdk = YCloudML(folder_id=FOLDER_ID, auth=API_KEY)

def ask(
    prompt: str,
    model: str = DEFAULT_MODEL,
    system: str = "",
    max_tokens: int = 2000,
    temperature: float = 0.6
) -> str:
    """Простая обёртка для одиночного запроса."""
    messages = []
    if system:
        messages.append({"role": "system", "text": system})
    messages.append({"role": "user", "text": prompt})
    
    result = (
        sdk.models.completions(model)
        .configure(temperature=temperature, max_tokens=str(max_tokens))
        .run(messages)
    )
    return result.text

def chat_run(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.6
) -> tuple[str, dict]:
    """Многоходовой диалог. Возвращает (текст, usage)."""
    result = (
        sdk.models.completions(model)
        .configure(temperature=temperature)
        .run(messages)
    )
    usage = {
        "input": result.usage.input_text_tokens,
        "output": result.usage.completion_tokens,
        "total": result.usage.total_tokens
    }
    return result.text, usage

def stream_ask(
    prompt: str,
    model: str = DEFAULT_MODEL,
    system: str = "",
    temperature: float = 0.6
):
    """Стриминг ответа."""
    messages = []
    if system:
        messages.append({"role": "system", "text": system})
    messages.append({"role": "user", "text": prompt})
    
    for chunk in sdk.models.completions(model).configure(temperature=temperature).run_stream(messages):
        for alt in chunk:
            yield alt.text


# --- Пример использования ---
if __name__ == "__main__":
    # Простой запрос
    result = ask("Привет! Что умеет YandexGPT?", model=MODELS["lite"])
    print(result)
    
    # Диалог
    history = [
        {"role": "system", "text": "Ты помощник по кино-производству."},
        {"role": "user", "text": "Что включает смета?"},
    ]
    text, usage = chat_run(history)
    print(text)
    print(f"Токены: input={usage['input']}, output={usage['output']}")
    
    # Стриминг
    for chunk in stream_ask("Расскажи о YandexGPT", system="Отвечай кратко"):
        print(chunk, end="", flush=True)
    print()
```

---

## 23. Полезные ссылки

| Ресурс | URL |
|--------|-----|
| Yandex AI Studio | https://aistudio.yandex.ru |
| Документация | https://yandex.cloud/ru/docs/ai-studio |
| Модели | https://yandex.cloud/en/docs/ai-studio/concepts/generation/models |
| Цены | https://yandex.cloud/ru/docs/ai-studio/pricing |
| AI Playground | https://console.yandex.cloud/link/foundation-models |
| Python ML SDK (PyPI) | https://pypi.org/project/yandex-cloud-ml-sdk |
| GitHub SDK | https://github.com/yandex-cloud/yandex-cloud-ml-sdk |
| OpenAI-совместимость | https://yandex.cloud/en/docs/ai-studio/concepts/openai-compatibility |
| Создать API-ключ | https://console.yandex.cloud → IAM → Сервисные аккаунты |
| Telegram-сообщество | https://t.me/YFM_Community |

---

*Обновлено: март 2026. Проверяй актуальность моделей на `yandex.cloud/ru/docs/ai-studio/concepts/generation/models`*
