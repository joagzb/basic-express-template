import { setTimeout } from 'node:timers/promises';
import { LoggerService } from '../logging/logger.interface';

export interface FibonacciRetryOptions {
  readonly name: string;
  readonly target: string;
  readonly maxRetries: number;
  readonly baseDelayMs: number; // The multiplier unit for the delay (e.g., 500ms)
  readonly logger: LoggerService;
  readonly fn: () => Promise<void>;
}

export type RetryStrategy = (options: FibonacciRetryOptions) => Promise<void>;

const calculateFibonacci = (n: number): number => {
  let a = 1;
  let b = 1;
  for (let i = 2; i < n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
};

export async function withFibonacciRetry(options: FibonacciRetryOptions): Promise<void> {
  const {name, target, maxRetries, baseDelayMs, logger, fn} = options;
  const maxAttempts = maxRetries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fn();
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        const cause = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`${name} connection to ${target} failed after ${maxAttempts} attempts: ${cause}`, {cause: error});
      }

      const fibMultiplier = calculateFibonacci(attempt);
      const delayMs = fibMultiplier * baseDelayMs;

      logger.warn({service: name, target, attempt, maxAttempts, delayMs, error}, `Connection attempt failed; retrying in ${delayMs}ms (Fibonacci attempt ${attempt})...`);

      await setTimeout(delayMs);
    }
  }
}
