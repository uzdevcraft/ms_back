import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { UserRepository } from '../modules/users/user.repository.js';
import { UserService } from '../modules/users/user.service.js';
import { NotificationService } from '../modules/notifications/notification.service.js';

export default fp(async (fastify: FastifyInstance) => {
  const users = new UserService(new UserRepository(fastify.prisma), fastify.config);
  const notifications = new NotificationService();
  fastify.decorate('services', { users, notifications });
});
