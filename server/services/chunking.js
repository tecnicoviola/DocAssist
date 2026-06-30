/**
 * Chunking Service
 * Handles text extraction from various file formats and splitting text into
 * overlapping chunks for embedding and retrieval.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract plain text from a file buffer based on its MIME type.
 * Supports PDF, DOCX/Word, and plain text formats.
 *
 * @param {Buffer} buffer - The raw file buffer
 * @param {string} mimetype - The MIME type of the file
 * @returns {Promise<string>} The extracted text content
 */
async function extractText(buffer, mimetype) {
  try {
    if (mimetype === 'application/pdf') {
      // Use pdf-parse for PDF files
      const data = await pdfParse(buffer);
      return data.text;
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      // Use mammoth for DOCX/Word files — extract raw text
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    if (mimetype.startsWith('text/')) {
      // Plain text files — decode buffer directly
      return buffer.toString('utf-8');
    }

    throw new Error(`Unsupported file type: ${mimetype}`);
  } catch (error) {
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

/**
 * Split text into overlapping chunks using recursive character splitting.
 * Tries to split on natural boundaries (paragraphs, lines, sentences, words)
 * while keeping chunks under maxChunkSize with overlap for context continuity.
 *
 * @param {string} text - The full text to chunk
 * @param {number} chunkSize - Maximum characters per chunk (default 500)
 * @param {number} overlap - Number of overlapping characters between chunks (default 100)
 * @returns {Array<{content: string, chunkIndex: number}>} Array of chunk objects
 */
function chunkText(text, chunkSize = 500, overlap = 100) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Separators ordered from most to least preferred split points
  const separators = ['\n\n', '\n', '. ', ' '];

  const chunks = [];

  /**
   * Recursively split text using separators in order of preference.
   * Falls back to less ideal separators if chunks are still too large.
   */
  function recursiveSplit(input, separatorIndex) {
    // Base case: text fits in a single chunk or we've exhausted separators
    if (input.length <= chunkSize) {
      return [input];
    }

    if (separatorIndex >= separators.length) {
      // No more separators — hard-split by character count
      const parts = [];
      for (let i = 0; i < input.length; i += chunkSize - overlap) {
        parts.push(input.slice(i, i + chunkSize));
      }
      return parts;
    }

    const separator = separators[separatorIndex];
    const segments = input.split(separator);

    // If this separator didn't actually split anything useful, try the next one
    if (segments.length <= 1) {
      return recursiveSplit(input, separatorIndex + 1);
    }

    const result = [];
    let currentChunk = '';

    for (const segment of segments) {
      const testChunk = currentChunk
        ? currentChunk + separator + segment
        : segment;

      if (testChunk.length <= chunkSize) {
        // Segment fits — accumulate into current chunk
        currentChunk = testChunk;
      } else {
        // Current chunk is full — finalize it
        if (currentChunk) {
          result.push(currentChunk);
        }

        // If the segment itself is too large, recursively split with next separator
        if (segment.length > chunkSize) {
          const subChunks = recursiveSplit(segment, separatorIndex + 1);
          result.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = segment;
        }
      }
    }

    // Don't forget the last accumulated chunk
    if (currentChunk) {
      result.push(currentChunk);
    }

    return result;
  }

  // Perform the recursive split starting from the first (most preferred) separator
  const rawChunks = recursiveSplit(text, 0);

  // Apply overlap: for each chunk after the first, prepend characters from the
  // end of the previous chunk to maintain contextual continuity.
  const overlappedChunks = [];
  for (let i = 0; i < rawChunks.length; i++) {
    let chunkContent = rawChunks[i].trim();

    if (i > 0 && overlap > 0) {
      // Grab the tail of the previous raw chunk as overlap context
      const prevChunk = rawChunks[i - 1];
      const overlapText = prevChunk.slice(-overlap);
      chunkContent = overlapText + chunkContent;
    }

    if (chunkContent.length > 0) {
      overlappedChunks.push({
        content: chunkContent,
        chunkIndex: overlappedChunks.length,
      });
    }
  }

  return overlappedChunks;
}

module.exports = { extractText, chunkText };
