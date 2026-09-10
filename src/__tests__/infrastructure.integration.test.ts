import {loadConfig} from '../config';
import {RedisConnection} from '../infrastructure/cache/redis.connection';
import {createLogger} from '../infrastructure/logging/logger.service';
import {createPostgresDataSource} from '../infrastructure/persistence/postgres/data-source';

const integrationTest = process.env.RUN_INTEGRATION_TESTS === 'true' ? test : test.skip;

describe('isolated infrastructure', () => {
  integrationTest(
    'connects to PostgreSQL and Redis from the test configuration',
    async () => {
      const config = loadConfig();
      const logger = createLogger(config);
      const dataSource = createPostgresDataSource(config);
      const redis = new RedisConnection(config, logger);

      try {
        await dataSource.initialize();
        expect(await dataSource.query('SELECT 1 AS connected')).toEqual([{connected: 1}]);
        await redis.connect();
        await redis.service.set('integration:connection', 'connected', 10);
        expect(await redis.service.get('integration:connection')).toBe('connected');
        await redis.service.delete('integration:connection');
      } finally {
        try {
          await redis.close();
        } finally {
          if (dataSource.isInitialized) {
            await dataSource.destroy();
          }
        }
      }
    },
    15000,
  );
});
