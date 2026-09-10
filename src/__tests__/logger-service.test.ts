import {LoggerDestination, PinoLoggerService} from '../infrastructure/logging/logger';
import {testConfig} from '../testing/test-config';

class MemoryDestination implements LoggerDestination {
  public readonly lines: string[] = [];

  public write(message: string): void {
    this.lines.push(message);
  }
}

describe('PinoLoggerService', () => {
  test('exposes every log level with messages and structured context', () => {
    const destination = new MemoryDestination();
    const logger = new PinoLoggerService({...testConfig, logging: {level: 'trace'}}, destination);

    logger.trace('trace message');
    logger.debug({requestId: 'request-1'}, 'debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    logger.fatal('fatal message');

    const logs = destination.lines.map(line => JSON.parse(line) as Record<string, unknown>);
    expect(logs.map(log => log.level)).toEqual([10, 20, 30, 40, 50, 60]);
    expect(logs[1]).toMatchObject({requestId: 'request-1', msg: 'debug message'});
  });

  test('preserves Pino error serialization and secret redaction', () => {
    const destination = new MemoryDestination();
    const logger = new PinoLoggerService({...testConfig, logging: {level: 'info'}}, destination);

    logger.error({error: new Error('database failed'), password: 'private', requestId: 'request-1'}, 'Operation failed');

    const log = JSON.parse(destination.lines[0]) as Record<string, unknown>;
    expect(log).toMatchObject({requestId: 'request-1', password: '[REDACTED]', msg: 'Operation failed'});
    expect(log.err).toMatchObject({type: 'Error', message: 'database failed', stack: expect.any(String)});
    expect(log).not.toHaveProperty('error');
  });
});
