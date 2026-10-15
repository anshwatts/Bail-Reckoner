import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { statutesData } from '../src/data/statutesData.js';
import { offenseSchema } from '../src/schemas.js';
import {
  getOffense,
  mapIpcToBns,
  mapBnsToIpc,
  searchOffenses,
  validateOffenseList
} from '../src/statutes.js';

describe('statutes module', () => {
  describe('seed dataset validation', () => {
    it('validates that all entries in statutesData pass offenseSchema', () => {
      expect(statutesData.length).toBeGreaterThanOrEqual(21);
      for (const entry of statutesData) {
        expect(() => offenseSchema.parse(entry)).not.toThrow();
      }
    });

    it('successfully validates complete list via validateOffenseList', () => {
      const validated = validateOffenseList(statutesData);
      expect(validated).toHaveLength(statutesData.length);
    });

    it('rejects invalid offenses list in validateOffenseList', () => {
      expect(() => validateOffenseList('not-an-array')).toThrow('Offenses must be an array');
      expect(() =>
        validateOffenseList([
          {
            section: '',
            isBailable: false
          }
        ])
      ).toThrow(ZodError);
    });
  });

  describe('exact offense lookups', () => {
    it('accurately looks up BNS 303(2)', () => {
      const offense = getOffense('BNS', '303(2)');
      expect(offense).not.toBeNull();
      expect(offense.code).toBe('BNS');
      expect(offense.section).toBe('303(2)');
      expect(offense.title).toBe('Theft');
      expect(offense.maxMonths).toBe(36);
      expect(offense.isLife).toBe(false);
      expect(offense.isDeath).toBe(false);
      expect(offense.isBailable).toBe(false);
      expect(offense.equivalentSection).toBe('379');
    });

    it('accurately looks up IPC 379', () => {
      const offense = getOffense('IPC', '379');
      expect(offense).not.toBeNull();
      expect(offense.code).toBe('IPC');
      expect(offense.section).toBe('379');
      expect(offense.title).toBe('Theft');
      expect(offense.maxMonths).toBe(36);
      expect(offense.isLife).toBe(false);
      expect(offense.isDeath).toBe(false);
      expect(offense.isBailable).toBe(false);
      expect(offense.equivalentSection).toBe('303(2)');
    });

    it('confirms capital and life flags on murder offense BNS 103(1) and IPC 302', () => {
      const bnsMurder = getOffense('BNS', '103(1)');
      expect(bnsMurder).not.toBeNull();
      expect(bnsMurder.title).toBe('Murder');
      expect(bnsMurder.isLife).toBe(true);
      expect(bnsMurder.isDeath).toBe(true);
      expect(bnsMurder.isBailable).toBe(false);

      const ipcMurder = getOffense('IPC', '302');
      expect(ipcMurder).not.toBeNull();
      expect(ipcMurder.title).toBe('Murder');
      expect(ipcMurder.isLife).toBe(true);
      expect(ipcMurder.isDeath).toBe(true);
      expect(ipcMurder.isBailable).toBe(false);
    });
  });

  describe('code cross-mapping', () => {
    it('maps IPC 420 to BNS 318(4) and vice-versa', () => {
      const bnsFromIpc = mapIpcToBns('420');
      expect(bnsFromIpc).not.toBeNull();
      expect(bnsFromIpc.code).toBe('BNS');
      expect(bnsFromIpc.section).toBe('318(4)');
      expect(bnsFromIpc.title).toBe('Cheating');
      expect(bnsFromIpc.maxMonths).toBe(84);

      const ipcFromBns = mapBnsToIpc('318(4)');
      expect(ipcFromBns).not.toBeNull();
      expect(ipcFromBns.code).toBe('IPC');
      expect(ipcFromBns.section).toBe('420');
      expect(ipcFromBns.title).toBe('Cheating');
      expect(ipcFromBns.maxMonths).toBe(84);
    });

    it('returns null when mapping unmapped offense such as BNS 304 Snatching', () => {
      const mapped = mapBnsToIpc('304');
      expect(mapped).toBeNull();
    });

    it('returns null when mapping non-existent sections or empty inputs', () => {
      expect(mapIpcToBns('9999')).toBeNull();
      expect(mapBnsToIpc('9999')).toBeNull();
      expect(mapIpcToBns(null)).toBeNull();
      expect(mapBnsToIpc(undefined)).toBeNull();
    });
  });

  describe('lookup normalization and edge cases', () => {
    it('normalizes spaces and parenthesis formatting', () => {
      const offense = getOffense('bns', ' 303 ( 2 ) ');
      expect(offense).not.toBeNull();
      expect(offense.section).toBe('303(2)');

      const ipcHurt = getOffense('ipc', ' 323 ');
      expect(ipcHurt).not.toBeNull();
      expect(ipcHurt.section).toBe('323');
    });

    it('returns null for unknown section or missing code', () => {
      expect(getOffense('IPC', '999')).toBeNull();
      expect(getOffense(null, '379')).toBeNull();
      expect(getOffense('IPC', null)).toBeNull();
      expect(getOffense('', '')).toBeNull();
    });
  });

  describe('searchOffenses', () => {
    it('returns expected matches for theft query', () => {
      const results = searchOffenses('theft');
      expect(results.length).toBeGreaterThanOrEqual(2);
      const sections = results.map((r) => r.section);
      expect(sections).toContain('379');
      expect(sections).toContain('303(2)');
    });

    it('returns expected matches for 303 query', () => {
      const results = searchOffenses('303');
      expect(results.some((r) => r.section === '303(2)')).toBe(true);
    });

    it('respects limit parameter', () => {
      const results = searchOffenses('hurt', 1);
      expect(results).toHaveLength(1);
    });

    it('returns empty array for empty, whitespace, or invalid queries', () => {
      expect(searchOffenses('')).toEqual([]);
      expect(searchOffenses('   ')).toEqual([]);
      expect(searchOffenses(null)).toEqual([]);
      expect(searchOffenses(undefined)).toEqual([]);
    });
  });
});
