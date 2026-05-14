import type { Env } from '../config/env.js';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export const createConfigPlugin = (config: Env) =>
  fp(async (fastify: FastifyInstance) => {
    fastify.decorate('config', config);
  });
