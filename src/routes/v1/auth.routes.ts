import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { validateTelegramInitData } from '../../common/telegram/init-data.js';
import { webAppAuthBodySchema, fullUserResponseSchema } from '../../modules/users/user.schemas.js';

const authResponse = z.object({
  success: z.literal(true),
  data: z.object({
    access_token: z.string(),
    token_type: z.literal('Bearer'),
    user: fullUserResponseSchema,
  }),
});

export const authV1Routes: FastifyPluginAsync = async (app) => {
  app.post(
    '/auth/webapp',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['Auth'],
        summary: 'Authenticate Telegram WebApp (initData)',
        description:
          'Validates Telegram WebApp `initData`, upserts the user, and returns a JWT for subsequent API calls.',
        body: webAppAuthBodySchema,
        response: { 200: authResponse },
      },
    },
    async (request, reply) => {
      const { initData } = webAppAuthBodySchema.parse(request.body);
      const parsed = validateTelegramInitData(initData, app.config.TELEGRAM_BOT_TOKEN);

      await app.services.users.upsertFromWebAppUser({
        telegramUserId: parsed.user.id,
        first_name: parsed.user.first_name,
        last_name: parsed.user.last_name,
        username: parsed.user.username,
        language_code: parsed.user.language_code,
      });

      const user = await app.services.users.getFullProfileByTelegramId(String(parsed.user.id));
      const access_token = app.jwt.sign({
        sub: user.profile.id,
        tid: user.profile.telegram_id,
        role: user.profile.role,
      });

      return reply.send({
        success: true as const,
        data: {
          access_token,
          token_type: 'Bearer' as const,
          user,
        },
      });
    },
  );
};
