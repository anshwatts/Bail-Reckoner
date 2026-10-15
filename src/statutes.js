import { offenseSchema } from './schemas.js';
import { statutesData } from './data/statutesData.js';

function normalizeSection(section) {
  if (typeof section !== 'string') {
    return '';
  }
  return section.replace(/\s+/g, '').toUpperCase();
}

function normalizeCode(code) {
  if (typeof code !== 'string') {
    return '';
  }
  return code.trim().toUpperCase();
}

export function getOffense(code, section) {
  if (!code || !section) {
    return null;
  }
  const normCode = normalizeCode(code);
  const normSection = normalizeSection(section);

  const found = statutesData.find(
    (item) => normalizeCode(item.code) === normCode && normalizeSection(item.section) === normSection
  );
  return found || null;
}

export function mapIpcToBns(ipcSection) {
  if (!ipcSection) {
    return null;
  }
  const sec = typeof ipcSection === 'object' ? ipcSection.section : ipcSection;
  const ipcRecord = getOffense('IPC', sec);
  if (!ipcRecord || !ipcRecord.equivalentSection) {
    return null;
  }
  return getOffense('BNS', ipcRecord.equivalentSection);
}

export function mapBnsToIpc(bnsSection) {
  if (!bnsSection) {
    return null;
  }
  const sec = typeof bnsSection === 'object' ? bnsSection.section : bnsSection;
  const bnsRecord = getOffense('BNS', sec);
  if (!bnsRecord || !bnsRecord.equivalentSection) {
    return null;
  }
  return getOffense('IPC', bnsRecord.equivalentSection);
}

export function searchOffenses(query, limit = 10) {
  if (!query || typeof query !== 'string') {
    return [];
  }
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }
  const stripped = trimmed.replace(/\s+/g, '');

  const matches = statutesData.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(trimmed);
    const secMatch = item.section.toLowerCase().includes(trimmed);
    const strippedSecMatch = normalizeSection(item.section).toLowerCase().includes(stripped);
    const codeMatch = item.code.toLowerCase().includes(trimmed);
    return titleMatch || secMatch || strippedSecMatch || codeMatch;
  });

  return matches.slice(0, limit);
}

export function validateOffenseList(offenses) {
  if (!Array.isArray(offenses)) {
    throw new Error('Offenses must be an array');
  }
  return offenses.map((offense) => offenseSchema.parse(offense));
}
