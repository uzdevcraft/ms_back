import 'dotenv/config';
import { loadEnv } from './config/env.js';
import { buildApp } from './app.js';

async function main() {
  const env = loadEnv();
  const app = await buildApp(env);

  const close = async () => {
    try {
      await app.close();
    } catch (err) {
      app.log.error({ err }, 'Error while closing server');
    }
  };

  process.on('SIGINT', close);
  process.on('SIGTERM', close);

  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Listening on ${env.HOST}:${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
