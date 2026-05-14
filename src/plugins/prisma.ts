import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

export default fp(async (fastify: FastifyInstance) => {
  const prisma = new PrismaClient({
    log:
      fastify.config.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });
  fastify.decorate("prisma", prisma);
  fastify.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
});
