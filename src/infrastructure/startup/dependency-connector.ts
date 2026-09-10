import {LoggerService} from '../../application/shared/logger.service';

export interface ConnectionRequest {
  readonly name: string;
  readonly endpoint: string;
  readonly retries: number;
  readonly retryDelayMs: number;
  readonly connect: () => Promise<void>;
}

export class DependencyConnector {
  public constructor(private readonly logger: LoggerService) {}

  public async connect(request: ConnectionRequest): Promise<void> {
    const maxAttempts = request.retries + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await request.connect();
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          const cause = error instanceof Error ? error.message : 'Unknown connection error';
          throw new Error(`${request.name} connection to ${request.endpoint} failed after ${maxAttempts} attempt(s): ${cause}`, {cause: error});
        }
        this.logger.warn({dependency: request.name, endpoint: request.endpoint, attempt, maxAttempts, error}, 'Dependency connection failed; retrying');
        await new Promise(resolve => setTimeout(resolve, request.retryDelayMs));
      }
    }
  }
}
