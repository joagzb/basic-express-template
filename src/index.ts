import 'reflect-metadata';
import {server} from './server';

void server.startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  process.stderr.write(`Application startup failed: ${message}\n`);
  process.exitCode = 1;
});
