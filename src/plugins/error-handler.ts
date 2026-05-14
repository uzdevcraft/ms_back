import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';
import { AppError } from '../common/errors/app-error.js';
import { ErrorCodes } from '../common/errors/error-codes.js';

function formatZodError(err: ZodError) {
  return err.flatten();
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler(
    (error: FastifyError | AppError | ZodError, request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Request validation failed',
            details: formatZodError(error),
          },
        });
      }

      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
          },
        });
      }

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2021') {
          request.log.error({ err: error }, 'Prisma: table missing — migrations not applied?');
          return reply.code(503).send({
            success: false,
            error: {
              code: ErrorCodes.DATABASE_NOT_READY,
              message:
                'Database schema is missing (e.g. `users` table). Apply migrations: `npx prisma migrate deploy` (or `pnpm exec prisma migrate deploy`) against this DATABASE_URL.',
            },
          });
        }
      }

      const fastifyErr = error as FastifyError & { validation?: unknown };
      if (fastifyErr.code === 'FST_ERR_VALIDATION') {
        return reply.code(400).send({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: fastifyErr.message,
            details: fastifyErr.validation,
          },
        });
      }

      const statusCode = fastifyErr.statusCode ?? 500;
      const isClient = statusCode >= 400 && statusCode < 500;

      if (!isClient) {
        request.log.error({ err: error }, 'Unhandled error');
      } else {
        request.log.warn({ err: error }, 'Request error');
      }

      return reply.code(statusCode).send({
        success: false,
        error: {
          code: isClient ? ErrorCodes.VALIDATION_ERROR : ErrorCodes.INTERNAL,
          message: isClient ? fastifyErr.message : 'Internal Server Error',
        },
      });
    },
  );
});
