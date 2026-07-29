/**
 * Retry wrapper for Gemini API calls with 429 rate-limit handling.
 *
 * - Short-circuits immediately on zero-quota errors (limit: 0) — no retries
 * - Detects transient 429s via error.status === 429
 * - Reads Gemini's RetryInfo.retryDelay when present (capped at 15s)
 * - Falls back to exponential backoff (3s → 6s → 12s + jitter)
 * - Throws RateLimitError after maxRetries exhausted
 * - Non-429 errors are re-thrown immediately
 */

export class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
  }
}

export class QuotaExhaustedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuotaExhaustedError';
    this.status = 429;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_WAIT_MS = 15000; // Cap any single retry wait at 15 seconds

/**
 * Detect zero-quota errors — these have "limit: 0" in the message,
 * meaning the account has no free-tier allowance at all. Retrying is pointless.
 */
function isZeroQuota(error) {
  const msg = error?.message || '';
  return /\blimit:\s*0\b/i.test(msg);
}

/**
 * Parse the retry delay (in seconds) from a Gemini 429 error message.
 * Gemini embeds "Please retry in XX.XXs" in the error body.
 */
function parseRetryDelay(error) {
  try {
    const msg = error.message || error.errorDetails || '';
    const match = msg.match(/retry in ([\d.]+)s/i);
    if (match) {
      return parseFloat(match[1]);
    }

    // Also check errorDetails array for RetryInfo
    if (error.errorDetails && Array.isArray(error.errorDetails)) {
      for (const detail of error.errorDetails) {
        if (detail['@type']?.includes('RetryInfo') && detail.retryDelay) {
          const delayStr = detail.retryDelay.replace('s', '');
          return parseFloat(delayStr);
        }
      }
    }
  } catch (_) {
    // Parsing failed — fall through to exponential backoff
  }
  return null;
}

/**
 * Wraps geminiModel.generateContent() with automatic 429 retry logic.
 *
 * @param {object} model - The Gemini model instance
 * @param {string|Array} prompt - The prompt (string or multipart array)
 * @param {object} [options] - { maxRetries: 3 }
 * @returns {Promise<object>} - The Gemini response
 * @throws {QuotaExhaustedError} - Immediately on zero-quota (limit: 0) errors
 * @throws {RateLimitError} - After all retries exhausted on transient 429
 * @throws {Error} - Any non-429 error, re-thrown immediately
 */
export async function generateWithRetry(model, prompt, options = {}) {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = 3000; // 3 seconds

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (error) {
      const is429 = error.status === 429 ||
        error.httpStatusCode === 429 ||
        (error.message && error.message.includes('429'));

      if (!is429) {
        // Non-retryable error — re-throw immediately
        throw error;
      }

      // Zero-quota: account-level block, retrying will never help
      if (isZeroQuota(error)) {
        throw new QuotaExhaustedError(
          'This Gemini API key has zero free-tier quota for this model. ' +
          'This usually means no Google Cloud billing account is linked ' +
          '(required to unlock the free usage allowance), or the model has been deprecated. ' +
          'Check your project at aistudio.google.com — retrying will not help.'
        );
      }

      if (attempt === maxRetries) {
        throw new RateLimitError(
          'Gemini API rate limit exceeded. Your free-tier quota has been exhausted — please wait a minute and try again, or upgrade your API plan at https://ai.google.dev.'
        );
      }

      // Determine wait time: prefer Gemini's suggested delay, else exponential backoff
      // Cap at MAX_WAIT_MS to prevent 45–60s hangs
      const geminiDelay = parseRetryDelay(error);
      const jitter = Math.random() * 1000; // 0–1s of jitter
      const rawWaitMs = geminiDelay
        ? geminiDelay * 1000 + jitter
        : baseDelay * Math.pow(2, attempt) + jitter;
      const waitMs = Math.min(rawWaitMs, MAX_WAIT_MS);

      console.warn(
        `[geminiRetry] 429 on attempt ${attempt + 1}/${maxRetries + 1}. ` +
        `Retrying in ${(waitMs / 1000).toFixed(1)}s...`
      );

      await sleep(waitMs);
    }
  }
}
