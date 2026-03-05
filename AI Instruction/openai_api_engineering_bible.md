# OPENAI API ENGINEERING BIBLE

Comprehensive developer reference for OpenAI APIs. Version: 2026-03-04

This document explains how to use the OpenAI platform to build AI
assistants, agents, and production systems.

------------------------------------------------------------------------

# 1. API OVERVIEW

Main endpoints:

/v1/responses\
/v1/embeddings\
/v1/images\
/v1/audio\
/v1/moderations

The main modern interface is:

Responses API

------------------------------------------------------------------------

# 2. INSTALLATION

Python

pip install openai

Node

npm install openai

------------------------------------------------------------------------

# 3. AUTHENTICATION

Set environment variable:

export OPENAI_API_KEY="your_key"

Python example:

from openai import OpenAI client = OpenAI()

------------------------------------------------------------------------

# 4. BASIC REQUEST

from openai import OpenAI

client = OpenAI()

response = client.responses.create( model="gpt-5", input="Write a short
story" )

print(response.output_text)

------------------------------------------------------------------------

# 5. PARAMETERS

model\
input\
instructions\
temperature\
max_output_tokens\
tools\
store\
previous_response_id

------------------------------------------------------------------------

# 6. RESPONSE STRUCTURE

Responses return items:

message\
reasoning\
function_call\
function_call_output

------------------------------------------------------------------------

# 7. MULTI TURN

response1 = client.responses.create( model="gpt-5", input="What is the
capital of France?" )

response2 = client.responses.create( model="gpt-5",
previous_response_id=response1.id, input="Population?" )

------------------------------------------------------------------------

# 8. STRUCTURED OUTPUT

response = client.responses.create( model="gpt-5", input="John is 32",
text={ "format":{ "type":"json_schema", "name":"person", "schema":{
"type":"object", "properties":{ "name":{"type":"string"},
"age":{"type":"number"} } } } } )

------------------------------------------------------------------------

# 9. FUNCTION CALLING

tools=\[ { "type":"function", "name":"get_weather", "parameters":{
"type":"object", "properties":{"city":{"type":"string"}},
"required":\["city"\] } }\]

------------------------------------------------------------------------

# 10. BUILT IN TOOLS

web_search\
file_search\
code_interpreter\
computer_use\
image_generation

------------------------------------------------------------------------

# 11. MODEL LIST

GPT‑5\
GPT‑5-mini\
GPT‑5-nano

GPT‑4.1\
GPT‑4.1-mini\
GPT‑4.1-nano

Reasoning models:

o3\
o3-pro\
o4-mini

Embedding:

text-embedding-3-large\
text-embedding-3-small

Images:

gpt-image-1\
gpt-image-1-mini

Audio:

gpt-audio\
gpt-audio-mini

------------------------------------------------------------------------

# 12. CONTEXT LIMITS

GPT‑5 \~400k tokens\
GPT‑4.1 up to 1M tokens

------------------------------------------------------------------------

# 13. AGENT ARCHITECTURE

User ↓ Backend ↓ Responses API ↓ Tool calls ↓ External services ↓ Final
response

------------------------------------------------------------------------

# 14. RAG ARCHITECTURE

User ↓ Embeddings ↓ Vector database ↓ Context ↓ LLM

------------------------------------------------------------------------

# 15. BEST PRACTICES

Use structured outputs.

Use embeddings for search.

Use tools instead of prompt parsing.

------------------------------------------------------------------------

END OF DOCUMENT
