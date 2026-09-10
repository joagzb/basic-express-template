import {HealthService} from '../application/health/health.service';

describe('HealthService', () => {
  test('constructs the health response DTO', () => {
    expect(new HealthService().getStatus()).toEqual({status: 'ok'});
  });
});
