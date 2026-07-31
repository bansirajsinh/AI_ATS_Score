const { Queue } = require('bullmq');
const env = require('../config/env');

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

const scoringQueue = new Queue('resume-scoring', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/**
 * Enqueue a scoring job. Returns the BullMQ job object.
 */
async function enqueueScoringJob(resumeId, jobId = null) {
  const job = await scoringQueue.add('score-resume', {
    resumeId,
    jobId,
  }, {
    jobId: `score-${resumeId}-${Date.now()}`,
  });

  return job;
}

module.exports = { scoringQueue, enqueueScoringJob };