import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireJwt } from '../../http/guards/auth.guard.js';
import { fullUserResponseSchema, telegramDigitsId } from '../../modules/users/user.schemas.js';
import { AppError } from '../../common/errors/app-error.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';

export const usersV1Routes: FastifyPluginAsync = async (app) => {
  app.get(
    '/users/me',
    {
      preHandler: requireJwt,
      schema: {
        tags: ['Users'],
        summary: 'Full profile for authenticated WebApp user',
        security: [{ bearerAuth: [] }],
        response: { 200: z.object({ success: z.literal(true), data: fullUserResponseSchema }) },
      },
    },
    async (request, reply) => {
      const user = await app.services.users.getFullProfileByUserId(request.user.sub);
      return reply.send({ success: true as const, data: user });
    },
  );

  app.get(
    '/users/by-telegram/:telegram_id',
    {
      preHandler: requireJwt,
      schema: {
        tags: ['Users'],
        summary: 'Fetch user by telegram id (self or admin)',
        security: [{ bearerAuth: [] }],
        params: z.object({ telegram_id: telegramDigitsId }),
        response: { 200: z.object({ success: z.literal(true), data: fullUserResponseSchema }) },
      },
    },
    async (request, reply) => {
      const { telegram_id } = request.params as { telegram_id: string };
      if (request.user.role !== 'ADMIN' && request.user.tid !== telegram_id) {
        throw new AppError(403, ErrorCodes.FORBIDDEN, 'Cannot access another user');
      }
      const user = await app.services.users.getFullProfileByTelegramId(telegram_id);
      return reply.send({ success: true as const, data: user });
    },
  );
};
