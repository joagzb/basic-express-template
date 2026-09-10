export type AppErrorDetails = Readonly<Record<string, unknown>>;

export class AppError extends Error {
  public readonly timestamp: string;

  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: AppErrorDetails,
  ) {
    super(message);
    this.name = AppError.name;
    this.timestamp = new Date().toISOString();
  }
}
