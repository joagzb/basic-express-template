import {HealthDto} from './health.dto';

export class HealthService {
  public getStatus(): HealthDto {
    return {status: 'ok'};
  }
}
