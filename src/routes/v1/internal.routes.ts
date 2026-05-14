import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { botUserSyncBodySchema, userProfileSchema } from '../../modules/users/user.schemas.js';

const syncResponse = z.object({
  success: z.literal(true),
  data: z.object({
    user: userProfileSchema,
  }),
});

export const internalV1Routes: FastifyPluginAsync = async (app) => {
  app.post(
    '/internal/users/sync',
    {
      schema: {
        tags: ['Internal'],
        summary: 'Upsert user from Telegram Bot',
        description:
          'Creates or updates the marketplace user for a Telegram account. In production, restrict this route (private network, API gateway, or mTLS).',
        body: botUserSyncBodySchema,
        response: { 200: syncResponse },
      },
    },
    async (request, reply) => {
      const body = botUserSyncBodySchema.parse(request.body);
      const user = await app.services.users.syncFromBot(body);
      return reply.send({ success: true as const, data: { user } });
    },
  );
};
