import 'reflect-metadata';
import {bootstrapServer} from './server';

void bootstrapServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  process.stderr.write(`Application startup failed: ${message}\n`);
  process.exitCode = 1;
});
