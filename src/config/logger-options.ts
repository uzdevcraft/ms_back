import type { Env } from './env.js';
import type { LoggerOptions } from 'pino';

export function getLoggerOptions(env: Env): LoggerOptions {
  const isDev = env.NODE_ENV === 'development';
  return {
    level: env.LOG_LEVEL,
    ...(isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        }
      : {}),
  };
}
