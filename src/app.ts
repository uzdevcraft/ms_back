import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from '@fastify/jwt';
import { randomUUID } from 'node:crypto';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Env } from './config/env.js';
import { getLoggerOptions } from './config/logger-options.js';
import { createConfigPlugin } from './plugins/config.js';
import errorHandler from './plugins/error-handler.js';
import prismaPlugin from './plugins/prisma.js';
import servicesPlugin from './plugins/services.js';
import { internalV1Routes } from './routes/v1/internal.routes.js';
import { authV1Routes } from './routes/v1/auth.routes.js';
import { usersV1Routes } from './routes/v1/users.routes.js';
import { adminV1Routes } from './routes/v1/admin.routes.js';

export async function buildApp(env: Env) {
  const app = Fastify({
    trustProxy: env.trustProxy,
    logger: getLoggerOptions(env),
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(createConfigPlugin(env));
  await app.register(errorHandler);
  await app.register(helmet, { global: true, contentSecurityPolicy: false });
  await app.register(cors, {
    credentials: true,
    origin: (origin, cb) => {
      const allowed = env.CORS_ORIGINS;
      if (!origin) {
        cb(null, true);
        return;
      }
      if (allowed.length > 0) {
        cb(null, allowed.includes(origin));
        return;
      }
      if (env.NODE_ENV === 'development') {
        cb(null, true);
        return;
      }
      cb(new Error('CORS origin not allowed'), false);
    },
  });
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });
  await app.register(prismaPlugin);
  await app.register(servicesPlugin);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Telegram Marketplace — Main API',
        version: '1.0.0',
        description:
          'REST API for the Telegram Marketplace. The Telegram Bot calls internal endpoints; the WebApp authenticates with `initData`.',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  if (env.docsEnabled) {
    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  app.get('/health', async () => ({ status: 'ok' as const }));

  app.get('/', async () => ({
    name: 'Telegram Marketplace — Main API',
    version: '1.0.0',
    links: {
      health: '/health',
      api: '/api/v1',
      ...(env.docsEnabled ? { docs: '/docs' } : {}),
    },
  }));

  await app.register(internalV1Routes, { prefix: '/api/v1' });
  await app.register(authV1Routes, { prefix: '/api/v1' });
  await app.register(usersV1Routes, { prefix: '/api/v1' });
  await app.register(adminV1Routes, { prefix: '/api/v1' });

  return app;
}
