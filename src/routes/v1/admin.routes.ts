import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../http/guards/auth.guard.js';
import { userProfileSchema } from '../../modules/users/user.schemas.js';

const adminUserListResponse = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(userProfileSchema),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});

const roleBody = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export const adminV1Routes: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/users',
    {
      preHandler: requireAdmin,
      schema: {
        tags: ['Admin'],
        summary: 'List users',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
          page_size: z.coerce.number().int().positive().max(100).default(20),
        }),
        response: { 200: adminUserListResponse },
      },
    },
    async (request, reply) => {
      const { page, page_size } = request.query as { page: number; page_size: number };
      const data = await app.services.users.listUsersForAdmin(page, page_size);
      return reply.send({ success: true as const, data });
    },
  );

  app.patch(
    '/admin/users/:userId/role',
    {
      preHandler: requireAdmin,
      schema: {
        tags: ['Admin'],
        summary: 'Change user role',
        security: [{ bearerAuth: [] }],
        params: z.object({ userId: z.string().uuid() }),
        body: roleBody,
        response: {
          200: z.object({ success: z.literal(true), data: z.object({ user: userProfileSchema }) }),
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const { role } = roleBody.parse(request.body);
      const user = await app.services.users.setRole(userId, role);
      return reply.send({ success: true as const, data: { user } });
    },
  );
};
