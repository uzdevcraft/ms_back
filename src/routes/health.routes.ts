import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({
    status: 'ok' as const,
    uptimeSeconds: Math.floor(process.uptime()),
  }));

  app.get('/health/ready', async (_request, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok' as const,
        database: 'connected' as const,
      };
    } catch (err) {
      app.log.error({ err }, 'Readiness check failed');
      return reply.code(503).send({
        status: 'error' as const,
        database: 'disconnected' as const,
      });
    }
  });
};
