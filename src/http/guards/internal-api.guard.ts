import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../common/errors/app-error.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';

export async function requireInternalApiKey(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const { config } = request.server;
  if (config.NODE_ENV !== 'production') {
    return;
  }

  const provided = request.headers['x-internal-api-key'];
  const expected = config.INTERNAL_API_KEY;
  if (typeof provided !== 'string' || !expected || provided !== expected) {
    throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid or missing internal API key');
  }
}
