import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      sub: string;
      tid: string;
      role: 'USER' | 'ADMIN';
    };
  }
}

export {};
