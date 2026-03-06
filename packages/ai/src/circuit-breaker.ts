import type { ProviderId, ProviderConfig } from "./types";
import { AIProviderError } from "./errors";

interface CircuitState {
  failures: number;
  openUntil: number;
}

/**
 * In-memory circuit breaker per provider.
 * After 3 failures within 60 seconds → circuit opens for 60 seconds.
 */
const circuitState = new Map<string, CircuitState>();

const MAX_FAILURES = 3;
const OPEN_DURATION_MS = 60_000;

/** Check whether the circuit is open (provider is unavailable). */
export function isCircuitOpen(providerId: string): boolean {
  const state = circuitState.get(providerId);
  if (!state) return false;
  if (state.failures >= MAX_FAILURES && Date.now() < state.openUntil) {
    return true;
  }
  // If open period expired, allow half-open (next request is a probe)
  if (state.failures >= MAX_FAILURES && Date.now() >= state.openUntil) {
    state.failures = MAX_FAILURES - 1; // half-open: one more failure re-opens
  }
  return false;
}

/** Record a provider failure. */
export function recordFailure(providerId: string): void {
  const state = circuitState.get(providerId) ?? { failures: 0, openUntil: 0 };
  state.failures++;
  if (state.failures >= MAX_FAILURES) {
    state.openUntil = Date.now() + OPEN_DURATION_MS;
  }
  circuitState.set(providerId, state);
}

/** Record a successful request — resets the circuit. */
export function recordSuccess(providerId: string): void {
  circuitState.delete(providerId);
}

/** Reset all circuits (useful for testing). */
export function resetAllCircuits(): void {
  circuitState.clear();
}

/**
 * Default fallback order. First available non-open provider is chosen.
 * The primary provider is always tried first if its circuit is closed.
 */
const FALLBACK_ORDER: ProviderId[] = [
  "openai",
  "anthropic",
  "deepseek",
  "gemini",
  "grok",
  "yandex",
];

/**
 * Given a primary provider, return the next fallback provider whose circuit is closed.
 * Returns null if no fallback is available.
 */
export function getNextFallback(
  primaryId: ProviderId,
  alreadyTried: Set<string>,
): ProviderId | null {
  for (const id of FALLBACK_ORDER) {
    if (id === primaryId) continue;
    if (alreadyTried.has(id)) continue;
    if (!isCircuitOpen(id)) return id;
  }
  return null;
}

/**
 * Determine if an error is retryable (server errors, timeouts, rate limits).
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AIProviderError) return error.isRetryable;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Server errors
    if (/5\d{2}/.test(msg)) return true;
    // Rate limiting
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    // Timeout / network
    if (msg.includes("timeout") || msg.includes("econnreset") || msg.includes("fetch failed")) return true;
  }
  return false;
}

/** Key resolver callback type — caller provides DB-based resolution. */
export type FallbackKeyResolver = (
  providerId: ProviderId,
) => Promise<{ apiKey: string; model: string; provider: string } | null>;

/**
 * Execute an AI operation with automatic provider fallback.
 * On retryable failure, tries the next available provider (max 2 retries).
 *
 * @param primaryId - The preferred provider.
 * @param fn - The AI operation. Receives (providerId, config). Should throw on error.
 * @param primaryConfig - Config for the primary provider.
 * @param resolveKey - Optional callback to get keys for fallback providers.
 */
export async function withProviderFallback<T>(
  primaryId: ProviderId,
  fn: (providerId: ProviderId, config: ProviderConfig) => Promise<T>,
  primaryConfig: ProviderConfig,
  resolveKey?: FallbackKeyResolver,
): Promise<T> {
  // Check if primary circuit is open — go straight to fallback
  if (isCircuitOpen(primaryId) && resolveKey) {
    const tried = new Set<string>([primaryId]);
    const fallbackId = getNextFallback(primaryId, tried);
    if (fallbackId) {
      const fallbackKey = await resolveKey(fallbackId);
      if (fallbackKey) {
        try {
          const result = await fn(fallbackId as ProviderId, {
            apiKey: fallbackKey.apiKey,
            model: fallbackKey.model,
          });
          recordSuccess(fallbackId);
          return result;
        } catch (fallbackErr) {
          recordFailure(fallbackId);
          throw fallbackErr;
        }
      }
    }
  }

  // Try primary provider
  try {
    const result = await fn(primaryId, primaryConfig);
    recordSuccess(primaryId);
    return result;
  } catch (err) {
    if (!isRetryableError(err) || !resolveKey) throw err;
    recordFailure(primaryId);

    // Try up to 2 fallback providers
    const tried = new Set<string>([primaryId]);
    let lastError: unknown = err;

    for (let attempt = 0; attempt < 2; attempt++) {
      const fallbackId = getNextFallback(primaryId, tried);
      if (!fallbackId) break;
      tried.add(fallbackId);

      const fallbackKey = await resolveKey(fallbackId);
      if (!fallbackKey) continue;

      try {
        const result = await fn(fallbackId as ProviderId, {
          apiKey: fallbackKey.apiKey,
          model: fallbackKey.model,
        });
        recordSuccess(fallbackId);
        return result;
      } catch (fallbackErr) {
        recordFailure(fallbackId);
        lastError = fallbackErr;
        if (!isRetryableError(fallbackErr)) throw fallbackErr;
      }
    }

    throw lastError;
  }
}
