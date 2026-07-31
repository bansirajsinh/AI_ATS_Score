const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

module.exports = redis;