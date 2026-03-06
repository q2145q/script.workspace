/**
 * Custom error class for AI provider errors.
 * Includes provider ID, HTTP status code, and retryability info.
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
