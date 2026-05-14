import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../common/errors/app-error.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';

export async function requireJwt(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid or expired token');
  }
}

export async function requireAdmin(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  await requireJwt(request, _reply);
  if (request.user.role !== 'ADMIN') {
    throw new AppError(403, ErrorCodes.FORBIDDEN, 'Admin access required');
  }
}
