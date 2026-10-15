import { cleanText, extractTextFromBuffer } from './reader.js';
import { buildExtractionPrompt, parseExtractionResponse } from './extract.js';
import { getOffense, searchOffenses } from './statutes.js';

function resolveSection(rawSection) {
  if (typeof rawSection !== 'string') {
    return null;
  }

  const str = rawSection.trim();
  const isBns = /\bBNS\b/i.test(str);
  const isIpc = /\bIPC\b/i.test(str);

  const sectionCandidates = str.match(/\d+(?:\s*\(\s*\d+\s*\))?/g) || [];

  for (const cand of sectionCandidates) {
    const cleanCand = cand.replace(/\s+/g, '');
    if (isBns) {
      const match = getOffense('BNS', cleanCand);
      if (match) {
        return match;
      }
    }
    if (isIpc) {
      const match = getOffense('IPC', cleanCand);
      if (match) {
        return match;
      }
    }
  }

  for (const cand of sectionCandidates) {
    const cleanCand = cand.replace(/\s+/g, '');
    const bnsMatch = getOffense('BNS', cleanCand);
    if (bnsMatch) {
      return bnsMatch;
    }
    const ipcMatch = getOffense('IPC', cleanCand);
    if (ipcMatch) {
      return ipcMatch;
    }
  }

  const searchResults = searchOffenses(str, 1);
  if (searchResults.length > 0) {
    const candidate = searchResults[0];
    const candSec = candidate.section.replace(/\s+/g, '');
    if (str.includes(candSec)) {
      return candidate;
    }
  }

  return null;
}

export async function processDocument(textOrBuffer, options = {}) {
  let text = '';
  if (typeof textOrBuffer === 'string') {
    text = cleanText(textOrBuffer);
  } else if (Buffer.isBuffer(textOrBuffer) || textOrBuffer instanceof Uint8Array) {
    const mimeType = options.mimeType || 'application/pdf';
    const raw = await extractTextFromBuffer(textOrBuffer, mimeType);
    text = cleanText(raw);
  } else {
    throw new Error('Input must be a string, Buffer, or Uint8Array');
  }

  if (typeof options.llmCaller !== 'function') {
    throw new Error('A valid llmCaller function must be provided in options');
  }

  const prompt = buildExtractionPrompt(text);
  const rawResponse = await options.llmCaller(prompt);
  const extractedData = parseExtractionResponse(rawResponse);

  const matchedOffenses = [];
  const unmatchedSections = [];
  const seenIds = new Set();

  for (const rawSec of extractedData.rawSections || []) {
    const matched = resolveSection(rawSec);
    if (matched) {
      const key = `${matched.code}-${matched.section}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        matchedOffenses.push(matched);
      }
    } else {
      unmatchedSections.push(rawSec);
    }
  }

  const hasMissingFields = Boolean(
    extractedData.missingFields && extractedData.missingFields.length > 0
  );
  const hasUnmatched = unmatchedSections.length > 0;
  const hasNoMatchedOffenses = matchedOffenses.length === 0;

  const requiresManualReview = Boolean(hasMissingFields || hasUnmatched || hasNoMatchedOffenses);

  return {
    extractedData,
    matchedOffenses,
    unmatchedSections,
    requiresManualReview
  };
}
