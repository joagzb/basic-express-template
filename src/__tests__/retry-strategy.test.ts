import {testConfig} from '../config/test-config';
import {PinoLoggerService} from '../infrastructure/logging/logger.service';
import {FibonacciRetryStrategy} from '../infrastructure/helpers/retry/retry.strategy';

describe('FibonacciRetryStrategy', () => {
  test('bounds retries and reports the dependency endpoint', async () => {
    const connect = jest.fn().mockRejectedValue(new Error('connection refused'));
    await expect(
      new FibonacciRetryStrategy().execute({
        name: 'PostgreSQL',
        target: 'localhost:5432',
        maxRetries: 1,
        baseDelayMs: 0,
        logger: new PinoLoggerService(testConfig),
        fn: connect,
      }),
    ).rejects.toThrow('PostgreSQL connection to localhost:5432 failed after 2 attempts: connection refused');
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
