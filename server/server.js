const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const redis = require('./src/config/redis');
const prisma = require('./src/config/db');

async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected');

    // Test Redis connection
    await redis.connect();
    logger.info('Redis connected');

    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, `Server running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled promise rejection');
});

start();