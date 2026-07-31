const pdfParse = require('pdf-parse');
const logger = require('../../utils/logger');

/**
 * Extracts plain text from a PDF buffer.
 * Returns { text, pageCount, error? }
 */
async function parsePdf(buffer) {
  try {
    const data = await pdfParse(buffer, {
      max: 20, // Max pages to parse
    });

    const text = (data.text || '').trim();

    if (!text || text.length < 10) {
      return {
        text: '',
        pageCount: data.numpages || 0,
        error: 'No extractable text found. This may be a scanned/image-based PDF.',
      };
    }

    return {
      text,
      pageCount: data.numpages || 0,
    };
  } catch (err) {
    logger.error({ err }, 'PDF parsing failed');
    return {
      text: '',
      pageCount: 0,
      error: `Failed to parse PDF: ${err.message}`,
    };
  }
}

module.exports = { parsePdf };