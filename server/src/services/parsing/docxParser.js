const mammoth = require('mammoth');
const logger = require('../../utils/logger');

/**
 * Extracts plain text from a DOCX buffer.
 * Returns { text, error? }
 */
async function parseDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });

    const text = (result.value || '').trim();

    if (!text || text.length < 10) {
      return {
        text: '',
        error: 'No extractable text found in this DOCX file.',
      };
    }

    // Log any warnings from mammoth
    if (result.messages && result.messages.length > 0) {
      logger.warn({ messages: result.messages }, 'DOCX parsing warnings');
    }

    return { text };
  } catch (err) {
    logger.error({ err }, 'DOCX parsing failed');
    return {
      text: '',
      error: `Failed to parse DOCX: ${err.message}`,
    };
  }
}

module.exports = { parseDocx };