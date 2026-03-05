# DeepSeek API — Полный справочник (март 2026)

> Актуальные данные из официальной документации DeepSeek.  
> Источник: `api-docs.deepseek.com` · обновлено декабрь 2025 / март 2026

---

## 1. Ключевые особенности

- **Полная совместимость с OpenAI API** — менять только `base_url` и `api_key`
- **Два режима одной модели:** `deepseek-chat` (обычный) и `deepseek-reasoner` (с reasoning)
- **Оба работают на DeepSeek-V3.2** — 128K контекст
- **Context caching включён по умолчанию** — экономия до 90%
- **В 10–30× дешевле** чем GPT-5 или Claude Sonnet при сопоставимом качестве
- **Open-source:** модели доступны на HuggingFace под MIT License для self-hosting

---

## 2. Модели

Оба алиаса — `deepseek-chat` и `deepseek-reasoner` — соответствуют модели DeepSeek-V3.2 с контекстом 128K. `deepseek-chat` — это нон-тинкинг режим, `deepseek-reasoner` — тинкинг режим (Chain-of-Thought).

| Модель | Режим | Контекст | Max output | Описание |
|--------|-------|----------|------------|----------|
| `deepseek-chat` | Non-thinking | 128K | 8K | Общие задачи, function calling, JSON, быстро |
| `deepseek-reasoner` | Thinking (CoT) | 128K | 64K (8K финал) | Сложные рассуждения, математика, код |

### Ограничения deepseek-reasoner

- **Не поддерживает:** `temperature`, `top_p`, `presence_penalty`, `frequency_penalty`, `logprobs` (передавать можно — ошибки не будет, но эффекта нет)
- **Не поддерживает:** `logprobs` / `top_logprobs` — вернёт ошибку
- **Function calling** с reasoner → запрос молча переадресуется в `deepseek-chat`
- **Нельзя** возвращать `reasoning_content` в messages → ошибка 400

---

## 3. Цены (март 2026)

Актуальные цены DeepSeek V3.2 для обоих режимов одинаковы: $0.28/M токенов (cache miss), $0.028/M (cache hit), $0.42/M output.

| Модель | Input (cache miss) | Input (cache hit) | Output |
|--------|-------------------|------------------|--------|
| `deepseek-chat` | $0.28 / 1M | **$0.028 / 1M** | $0.42 / 1M |
| `deepseek-reasoner` | $0.28 / 1M | **$0.028 / 1M** | $0.42 / 1M |

> Cache hit = **в 10× дешевле** cache miss. Разница между hit и miss покрывает большинство production-сценариев.

### Для сравнения

| Провайдер | Input / 1M | Output / 1M |
|-----------|-----------|------------|
| DeepSeek V3.2 | $0.28 | $0.42 |
| Gemini 2.5 Flash | $0.30 | $2.50 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| GPT-5 | $1.25 | $10.00 |

**Бесплатно:** 5M токенов при регистрации, без привязки карты.

---

## 4. Установка

DeepSeek использует формат OpenAI — стандартный `openai` SDK, просто меняй base_url:

```bash
pip install openai
```

```bash
export DEEPSEEK_API_KEY="sk-..."
```

Получить ключ: [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)

---

## 5. Инициализация клиента

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

# Или без env
client = OpenAI(
    api_key="sk-...",
    base_url="https://api.deepseek.com"
)
```

> `https://api.deepseek.com` и `https://api.deepseek.com/v1` — одно и то же.  
> `/v1` — для совместимости с OpenAI, не номер версии модели.

---

## 6. Базовый запрос

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "Ты опытный продюсер в кино. Отвечай кратко."},
        {"role": "user", "content": "Как составить смету на съёмочный день?"}
    ],
    stream=False
)

print(response.choices[0].message.content)
print(f"Токены: {response.usage.total_tokens}")
```

### curl

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'
```

---

## 7. Стриминг

```python
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "Напиши подробный план съёмочного дня"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)

print()
```

---

## 8. Многоходовой диалог

```python
history = [
    {"role": "system", "content": "Ты помощник по кино-производству."}
]

def chat(user_message: str) -> str:
    history.append({"role": "user", "content": user_message})
    
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=history
    )
    
    answer = response.choices[0].message.content
    history.append({"role": "assistant", "content": answer})
    return answer

print(chat("Что включает смета на фильм?"))
print(chat("А как посчитать транспортные расходы?"))
```

> ⚠️ **API stateless** — история передаётся заново при каждом запросе.  
> Context caching автоматически экономит на повторяющемся системном промпте.

---

## 9. Thinking Mode (deepseek-reasoner)

Модель возвращает цепочку рассуждений (`reasoning_content`) и финальный ответ (`content`).

### Non-streaming

```python
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=[{"role": "user", "content": "Сколько R в слове 'strawberry'?"}]
)

reasoning = response.choices[0].message.reasoning_content  # Цепочка мыслей
answer    = response.choices[0].message.content            # Финальный ответ

print("Рассуждение:", reasoning)
print("Ответ:", answer)
```

### Streaming с reasoning

```python
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=[{"role": "user", "content": "9.11 и 9.8 — какое больше?"}],
    stream=True
)

reasoning_content = ""
answer_content    = ""

for chunk in response:
    delta = chunk.choices[0].delta
    if delta.reasoning_content:
        reasoning_content += delta.reasoning_content
        print("💭", delta.reasoning_content, end="", flush=True)
    elif delta.content:
        answer_content += delta.content
        print(delta.content, end="", flush=True)
```

### Multi-turn с reasoning — важные правила

```python
# ✅ Правильно: НЕ передаём reasoning_content обратно в messages
messages = [{"role": "user", "content": "9.11 и 9.8 — что больше?"}]

response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=messages
)

reasoning = response.choices[0].message.reasoning_content
answer    = response.choices[0].message.content

# Добавляем в историю ТОЛЬКО content, без reasoning_content!
messages.append({"role": "assistant", "content": answer})

# Следующий вопрос
messages.append({"role": "user", "content": "Сколько R в 'strawberry'?"})

response2 = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=messages
)
# ❌ Неправильно: если добавить reasoning_content в messages → ошибка 400
```

---

## 10. JSON Output (Structured Output)

```python
import json

# ⚠️ Обязательно укажи в промпте что ожидаешь JSON!
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "Отвечай ТОЛЬКО валидным JSON без markdown."},
        {"role": "user", "content": "Данные фильма 'Матрица': title, year, director, genres"}
    ],
    response_format={"type": "json_object"}
)

data = json.loads(response.choices[0].message.content)
print(data["title"], data["year"])
```

> ⚠️ **Без системного промпта с JSON-инструкцией** модель может зависнуть (генерировать пробелы до `max_tokens`).

---

## 11. Function Calling (Tool Calls)

Поддерживается только в `deepseek-chat`. При использовании с `deepseek-reasoner` запрос автоматически переадресуется в `deepseek-chat`.

```python
import json

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Получить текущую погоду для города",
            "parameters": {
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
    }
]

messages = [{"role": "user", "content": "Какая погода в Москве?"}]

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=messages,
    tools=tools
)

# Проверить: модель хочет вызвать функцию?
if response.choices[0].finish_reason == "tool_calls":
    tool_call = response.choices[0].message.tool_calls[0]
    func_name = tool_call.function.name
    func_args = json.loads(tool_call.function.arguments)
    
    print(f"Вызываю: {func_name}({func_args})")
    
    # Выполнить функцию
    result = "15°C, солнечно"
    
    # Добавить в историю
    messages.append(response.choices[0].message)
    messages.append({
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": result
    })
    
    # Финальный ответ
    final = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        tools=tools
    )
    print(final.choices[0].message.content)
```

### Tool Calls в Thinking Mode

```python
# ⚠️ Нужно передавать reasoning_content обратно при использовании tools с reasoner
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=messages,
    tools=tools
)

# Если есть tool call, добавляем сообщение ассистента целиком (с reasoning_content)
if response.choices[0].finish_reason == "tool_calls":
    messages.append(response.choices[0].message)  # включает reasoning_content!
    # ...выполнить функцию и добавить результат...
```

---

## 12. Context Caching

Caching включён **по умолчанию** для всех аккаунтов. Не требует настройки.

**Как работает:** DeepSeek кешируем префикс запроса (системный промпт + история) блоками по 64 токена. При повторном использовании того же префикса — cache hit ($0.028/M вместо $0.28/M).

```python
# Проверить использование кеша в ответе
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "Длинный системный промпт..."},
        {"role": "user", "content": "Вопрос 1"}
    ]
)

usage = response.usage
print(f"Cache hit tokens:  {usage.prompt_tokens_details.cached_tokens}")
print(f"Cache miss tokens: {usage.prompt_tokens - usage.prompt_tokens_details.cached_tokens}")
print(f"Output tokens:     {usage.completion_tokens}")
```

**Стратегия максимизации cache hits:**
- Системный промпт → всегда в начале, не меняй его
- История диалога → после системного промпта, растёт постепенно
- Уникальный вопрос пользователя → в самом конце

---

## 13. Chat Prefix Completion (Beta)

Принуждает модель продолжать с заданного префикса ответа.

```python
# Beta endpoint
client_beta = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com/beta"
)

response = client_beta.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "user", "content": "Напиши функцию сортировки пузырьком"},
        {"role": "assistant", "content": "```python\ndef bubble_sort(arr):", "prefix": True}
    ]
)

print(response.choices[0].message.content)
```

---

## 14. FIM Completion / Fill-in-the-Middle (Beta)

Для дополнения кода в середине — задаёшь начало и конец, модель заполняет середину.

```python
client_beta = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com/beta"
)

response = client_beta.completions.create(
    model="deepseek-chat",
    prompt="def fibonacci(n):\n    if n <= 1:\n        return n\n",
    suffix="\n    return fib(n-1) + fib(n-2)",
    max_tokens=128
)

print(response.choices[0].text)
```

> Лимит FIM: ~4,000 токенов.

---

## 15. Параметры запроса

| Параметр | Модели | Тип | Описание |
|----------|--------|-----|----------|
| `model` | оба | string | `deepseek-chat` / `deepseek-reasoner` |
| `messages` | оба | array | История диалога |
| `stream` | оба | bool | Стриминг (default: false) |
| `max_tokens` | оба | int | Макс. токенов в ответе |
| `temperature` | chat only | float 0–2 | Случайность (default: 1.0) |
| `top_p` | chat only | float | Nucleus sampling |
| `presence_penalty` | chat only | float -2–2 | Штраф за повторение тем |
| `frequency_penalty` | chat only | float -2–2 | Штраф за повторение слов |
| `stop` | оба | str/list | Стоп-последовательности (до 16) |
| `response_format` | chat only | object | `{"type": "json_object"}` |
| `tools` | chat only | array | Определения функций |
| `tool_choice` | chat only | string | `auto` / `required` / `none` |
| `logprobs` | chat only | bool | Log probabilities |

> ⚠️ `temperature`, `top_p`, `presence_penalty`, `frequency_penalty` для `deepseek-reasoner` — игнорируются без ошибки.

---

## 16. Структура ответа

```python
response = client.chat.completions.create(...)

# Основные поля
response.id                                         # ID запроса
response.model                                      # Использованная модель
response.choices[0].message.content                # Текст ответа
response.choices[0].message.reasoning_content      # CoT (только reasoner)
response.choices[0].message.tool_calls             # Tool calls (если есть)
response.choices[0].finish_reason                  # stop / length / tool_calls / content_filter

# Использование токенов
response.usage.prompt_tokens                        # Входящие токены
response.usage.completion_tokens                    # Исходящие токены
response.usage.total_tokens                         # Итого
response.usage.prompt_tokens_details.cached_tokens # Cache hit токены
response.usage.completion_tokens_details.reasoning_tokens  # Токены на CoT
```

### finish_reason

| Значение | Описание |
|----------|----------|
| `stop` | Модель завершила нормально |
| `length` | Достигнут `max_tokens` |
| `tool_calls` | Модель хочет вызвать инструмент |
| `content_filter` | Контент отфильтрован |
| `insufficient_system_resource` | Перегрузка сервера |

---

## 17. Обработка ошибок

```python
from openai import OpenAI, APIError, RateLimitError, APIConnectionError
import time

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

def ask_with_retry(messages, model="deepseek-chat", max_retries=3):
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages
            )
            return response.choices[0].message.content
            
        except RateLimitError:
            wait = 2 ** attempt
            print(f"Rate limit, ждём {wait}s...")
            time.sleep(wait)
            
        except APIConnectionError as e:
            print(f"Ошибка соединения: {e}")
            time.sleep(1)
            
        except APIError as e:
            if e.status_code == 400:
                print("Неверный запрос (проверь reasoning_content в messages)")
                raise
            elif e.status_code == 401:
                print("Неверный API ключ")
                raise
            elif e.status_code == 402:
                print("Недостаточно средств на балансе")
                raise
            elif e.status_code == 503:
                print("Сервер перегружен")
                time.sleep(5)
            else:
                raise
    
    raise Exception("Превышено число попыток")
```

### Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Неверный формат запроса |
| 401 | Неверный API ключ |
| 402 | Недостаточно средств |
| 422 | Неверные параметры |
| 429 | Rate limit |
| 500 | Ошибка сервера |
| 503 | Перегрузка сервера |

---

## 18. Готовый шаблон для Claude Code

```python
"""
Готовый шаблон подключения к DeepSeek API
Сохрани в deepseek_client.py

Установка:
  pip install openai
Переменная окружения:
  export DEEPSEEK_API_KEY="sk-..."
"""
import os
import json
from openai import OpenAI

# --- Конфигурация ---
MODELS = {
    "chat":     "deepseek-chat",      # Быстро, дёшево, function calling
    "reasoner": "deepseek-reasoner",  # Chain-of-Thought, сложные задачи
}
DEFAULT_MODEL = MODELS["chat"]

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

def ask(
    prompt: str,
    model: str = DEFAULT_MODEL,
    system: str = "You are a helpful assistant.",
    max_tokens: int = 2048,
    temperature: float = 1.0
) -> str:
    """Простой одиночный запрос."""
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": prompt}
    ]
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature if model == MODELS["chat"] else None
    )
    return response.choices[0].message.content

def ask_json(prompt: str, system: str = "Respond only with valid JSON.") -> dict:
    """Запрос с гарантированным JSON-ответом."""
    response = client.chat.completions.create(
        model=MODELS["chat"],
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def ask_with_reasoning(prompt: str) -> tuple[str, str]:
    """Запрос с цепочкой рассуждений. Возвращает (reasoning, answer)."""
    response = client.chat.completions.create(
        model=MODELS["reasoner"],
        messages=[{"role": "user", "content": prompt}]
    )
    reasoning = response.choices[0].message.reasoning_content or ""
    answer    = response.choices[0].message.content
    return reasoning, answer

def stream_ask(prompt: str, system: str = "", model: str = DEFAULT_MODEL):
    """Генератор стримингового ответа."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    for chunk in client.chat.completions.create(
        model=model, messages=messages, stream=True
    ):
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content

def count_cache(response) -> dict:
    """Показать использование кеша."""
    u = response.usage
    cached = u.prompt_tokens_details.cached_tokens if u.prompt_tokens_details else 0
    return {
        "cached_tokens": cached,
        "uncached_tokens": u.prompt_tokens - cached,
        "output_tokens": u.completion_tokens,
        "cache_hit_rate": f"{cached/u.prompt_tokens*100:.1f}%" if u.prompt_tokens else "0%"
    }


# --- Пример использования ---
if __name__ == "__main__":
    # Простой запрос
    result = ask("Привет! Что умеет DeepSeek?")
    print(result)
    
    # JSON вывод
    data = ask_json("Дай данные о фильме 'Матрица': title, year, director, genres")
    print(data)
    
    # Reasoning (сложная задача)
    reasoning, answer = ask_with_reasoning("Сколько R в слове 'strawberry'?")
    print("Ответ:", answer)
    
    # Стриминг
    for chunk in stream_ask("Напиши краткий план съёмочного дня"):
        print(chunk, end="", flush=True)
    print()
```

---

## 19. Self-hosting (open-source)

Все основные модели доступны на HuggingFace под **MIT License**:

```bash
# DeepSeek-V3 (685B параметров, MoE архитектура)
# https://huggingface.co/deepseek-ai/DeepSeek-V3

# Через vLLM
pip install vllm
vllm serve deepseek-ai/DeepSeek-V3 --tensor-parallel-size 8

# Через Ollama (меньшие версии)
ollama run deepseek-v3
```

При self-hosting — нет платы за токены, только инфраструктура.

---

## 20. Полезные ссылки

| Ресурс | URL |
|--------|-----|
| Официальная документация | https://api-docs.deepseek.com |
| Платформа (API ключи, баланс) | https://platform.deepseek.com |
| Получить API ключ | https://platform.deepseek.com/api_keys |
| Цены | https://api-docs.deepseek.com/quick_start/pricing |
| Статус API | https://status.deepseek.com |
| GitHub | https://github.com/deepseek-ai |
| HuggingFace модели | https://huggingface.co/deepseek-ai |
| Discord | https://discord.gg/Tc7c45Zzu5 |
| Release Notes | https://api-docs.deepseek.com/updates |

---

*Обновлено: март 2026. Актуальные цены — `api-docs.deepseek.com/quick_start/pricing`*
