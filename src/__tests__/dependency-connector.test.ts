import {createLogger} from '../infrastructure/logging/logger';
import {DependencyConnector} from '../infrastructure/startup/dependency-connector';
import {testConfig} from '../testing/test-config';

describe('DependencyConnector', () => {
  test('bounds retries and reports the dependency endpoint', async () => {
    const connect = jest.fn().mockRejectedValue(new Error('connection refused'));
    const connector = new DependencyConnector(createLogger(testConfig));

    await expect(connector.connect({name: 'PostgreSQL', endpoint: 'localhost:5432', retries: 1, retryDelayMs: 0, connect})).rejects.toThrow(
      'PostgreSQL connection to localhost:5432 failed after 2 attempt(s): connection refused',
    );
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
