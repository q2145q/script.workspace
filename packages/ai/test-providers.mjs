/**
 * Quick smoke test — one simple request to each AI provider (except Grok).
 * Reads encrypted API keys from the database via psql, decrypts, sends "Say hello".
 *
 * Usage: node test-providers.mjs
 */
import { createDecipheriv, scryptSync } from "crypto";
import { execSync } from "child_process";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ── Config ──────────────────────────────────────────────────
const AI_ENCRYPTION_SECRET = "391e2b701c59de8efdf071a3ff4008e4e72b9bab65351d6417c210aa1491e78d";
const DATABASE_URL = "postgresql://neondb_owner:npg_yKDL5prUvVz7@ep-holy-flower-ag4j9j78-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const PROVIDERS_TO_TEST = ["openai", "anthropic", "deepseek", "gemini", "yandex"];

const PROVIDER_CONFIG = {
  openai:    { model: "gpt-4.1-mini",              baseURL: undefined },
  anthropic: { model: "claude-haiku-4-5-20251001",  baseURL: undefined },
  deepseek:  { model: "deepseek-chat",              baseURL: "https://api.deepseek.com" },
  gemini:    { model: "gemini-2.5-flash",           baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" },
  yandex:    { model: "yandexgpt-lite/latest",      baseURL: undefined },
};

// ── Crypto ──────────────────────────────────────────────────
function decrypt(encryptedBase64, secret) {
  const packed = Buffer.from(encryptedBase64, "base64");
  const salt = packed.subarray(0, 16);
  const iv = packed.subarray(16, 28);
  const authTag = packed.subarray(28, 44);
  const ciphertext = packed.subarray(44);
  const key = scryptSync(secret, salt, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// ── Load keys from DB ───────────────────────────────────────
function loadKeysFromDB() {
  const raw = execSync(
    `psql "${DATABASE_URL}" -t -A -c "SELECT provider, \\"apiKeyEnc\\" FROM global_api_key WHERE \\"isActive\\" = true ORDER BY provider;"`,
    { encoding: "utf8" },
  ).trim();

  const keyMap = new Map();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const [provider, enc] = line.split("|");
    try {
      keyMap.set(provider, decrypt(enc, AI_ENCRYPTION_SECRET));
    } catch (e) {
      console.error(`   ${provider}: DECRYPT FAILED — ${e.message}`);
    }
  }
  return keyMap;
}

// ── Provider test functions ─────────────────────────────────
async function testOpenAICompatible(apiKey, model, baseURL) {
  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  const res = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: "Say hello in one sentence." }],
    max_tokens: 100,
    temperature: 0.5,
  });
  return res.choices[0]?.message?.content || "(empty response)";
}

async function testAnthropic(apiKey, model) {
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model,
    max_tokens: 100,
    messages: [{ role: "user", content: "Say hello in one sentence." }],
  });
  return res.content[0]?.type === "text" ? res.content[0].text : "(empty response)";
}

async function testYandex(apiKey, model) {
  const modelUri = model.startsWith("gpt://")
    ? model
    : `gpt://b1g45ceaq1kfrqh94m6e/${model}`;

  const authHeader = apiKey.startsWith("Api-Key") || apiKey.startsWith("Bearer")
    ? apiKey
    : `Api-Key ${apiKey}`;

  const response = await fetch(
    "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        modelUri,
        completionOptions: { stream: false, temperature: 0.5, maxTokens: 100 },
        messages: [
          { role: "system", text: "You are a helpful assistant." },
          { role: "user", text: "Say hello in one sentence." },
        ],
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Yandex ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data?.result?.alternatives?.[0]?.message?.text || "(empty response)";
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log("\n  Loading API keys from database...");
  const keyMap = loadKeysFromDB();
  console.log(`  Found ${keyMap.size} keys: ${[...keyMap.keys()].join(", ")}`);

  for (const [provider, key] of keyMap) {
    console.log(`   ${provider}: ${key.slice(0, 8)}...${key.slice(-4)}`);
  }

  console.log(`\n  Testing ${PROVIDERS_TO_TEST.length} providers...\n`);

  for (const providerId of PROVIDERS_TO_TEST) {
    const apiKey = keyMap.get(providerId);
    if (!apiKey) {
      console.log(`SKIP ${providerId.toUpperCase().padEnd(10)} — no API key in DB\n`);
      continue;
    }

    const cfg = PROVIDER_CONFIG[providerId];
    const start = Date.now();

    try {
      let response;
      if (providerId === "anthropic") {
        response = await testAnthropic(apiKey, cfg.model);
      } else if (providerId === "yandex") {
        response = await testYandex(apiKey, cfg.model);
      } else {
        response = await testOpenAICompatible(apiKey, cfg.model, cfg.baseURL);
      }

      const elapsed = Date.now() - start;
      console.log(`OK   ${providerId.toUpperCase().padEnd(10)} (${cfg.model}) — ${elapsed}ms`);
      console.log(`     "${response.slice(0, 150)}"\n`);
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(`FAIL ${providerId.toUpperCase().padEnd(10)} (${cfg.model}) — ${elapsed}ms`);
      console.log(`     Error: ${err.message?.slice(0, 300)}\n`);
    }
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
