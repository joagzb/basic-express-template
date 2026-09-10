import {testConfig} from '../config/test-config';
import {createLogger} from '../infrastructure/logging/logger.service';
import {withFibonacciRetry} from '../infrastructure/startup/retry.strategy';

describe('withFibonacciRetry', () => {
  test('bounds retries and reports the dependency endpoint', async () => {
    const connect = jest.fn().mockRejectedValue(new Error('connection refused'));
    await expect(
      withFibonacciRetry({
        name: 'PostgreSQL',
        target: 'localhost:5432',
        maxRetries: 1,
        baseDelayMs: 0,
        logger: createLogger(testConfig),
        fn: connect,
      }),
    ).rejects.toThrow('PostgreSQL connection to localhost:5432 failed after 2 attempts: connection refused');
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
