import type { Env } from '../config/env.js';
import type { PrismaClient } from '@prisma/client';
import type { UserService } from '../modules/users/user.service.js';
import type { NotificationService } from '../modules/notifications/notification.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
    prisma: PrismaClient;
    services: {
      users: UserService;
      notifications: NotificationService;
    };
  }
}

export {};
