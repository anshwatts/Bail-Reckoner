import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { cleanText, extractTextFromBuffer } from '../src/reader.js';
import { buildExtractionPrompt, parseExtractionResponse } from '../src/extract.js';
import { processDocument } from '../src/pipeline.js';

describe('document extraction pipeline', () => {
  describe('text cleaning and normalization', () => {
    it('normalizes legal abbreviations and messy whitespace', () => {
      const raw = 'F.I.R. No. 45/2026   u/s  303(2) BNS   at  P.S.  Kotwali   dt.  12/01/2026';
      const cleaned = cleanText(raw);
      expect(cleaned).toContain('FIR No. 45/2026');
      expect(cleaned).toContain('under section 303(2) BNS');
      expect(cleaned).toContain('at PS Kotwali');
      expect(cleaned).toContain('dated 12/01/2026');
      expect(cleaned).not.toContain('   ');
    });

    it('strips non-printable control characters', () => {
      const raw = 'State vs Ramesh Kumar\x00\x07\x1F\nRemand Order';
      const cleaned = cleanText(raw);
      expect(cleaned).toBe('State vs Ramesh Kumar\nRemand Order');
    });

    it('handles empty or non-string inputs gracefully', () => {
      expect(cleanText('')).toBe('');
      expect(cleanText(null)).toBe('');
      expect(cleanText(undefined)).toBe('');
    });
  });

  describe('extractTextFromBuffer', () => {
    it('extracts and cleans text from text/plain buffer', async () => {
      const buffer = Buffer.from('FIR registered U/S 379 IPC at P.S. Sadar');
      const text = await extractTextFromBuffer(buffer, 'text/plain');
      expect(text).toContain('FIR registered under section 379 IPC at PS Sadar');
    });

    it('rejects unsupported mime types with clear error', async () => {
      const buffer = Buffer.from('fake data');
      await expect(extractTextFromBuffer(buffer, 'image/jpeg')).rejects.toThrow(
        'Unsupported document format: image/jpeg'
      );
    });

    it('throws error when buffer is invalid or null', async () => {
      await expect(extractTextFromBuffer(null, 'text/plain')).rejects.toThrow('Invalid buffer input');
    });
  });

  describe('buildExtractionPrompt', () => {
    it('constructs prompt with explicit instructions not to guess missing fields', () => {
      const { systemPrompt, userPrompt } = buildExtractionPrompt('Sample legal text');
      expect(systemPrompt).toContain('Do NOT guess or hallucinate any fields');
      expect(systemPrompt).toContain('missingFields');
      expect(userPrompt).toContain('Sample legal text');
    });
  });

  describe('parseExtractionResponse', () => {
    it('safely parses valid LLM JSON response matching schema', () => {
      const validLlmResponse = JSON.stringify({
        accusedName: 'Suresh Patil',
        firNumber: '112/2026',
        policeStation: 'City PS',
        district: 'Pune',
        arrestDate: '2026-02-01',
        remandDate: '2026-02-02',
        chargesheetDate: null,
        rawSections: ['303(2) BNS'],
        confidence: 0.95,
        missingFields: []
      });

      const parsed = parseExtractionResponse(validLlmResponse);
      expect(parsed.accusedName).toBe('Suresh Patil');
      expect(parsed.firNumber).toBe('112/2026');
      expect(parsed.arrestDate).toBe('2026-02-01');
      expect(parsed.remandDate).toBe('2026-02-02');
      expect(parsed.rawSections).toEqual(['303(2) BNS']);
      expect(parsed.missingFields).toEqual([]);
    });

    it('unwraps markdown json code fences safely', () => {
      const fencedResponse = '```json\n{\n  "accusedName": "Amit",\n  "firNumber": "5/2026",\n  "policeStation": "North",\n  "district": "Delhi",\n  "arrestDate": "2026-03-01",\n  "remandDate": "2026-03-02",\n  "chargesheetDate": null,\n  "rawSections": ["Section 379 IPC"],\n  "confidence": 0.9,\n  "missingFields": []\n}\n```';

      const parsed = parseExtractionResponse(fencedResponse);
      expect(parsed.accusedName).toBe('Amit');
      expect(parsed.firNumber).toBe('5/2026');
    });

    it('throws error when LLM response contains invalid JSON', () => {
      const badJson = 'This is an error response from LLM, not JSON';
      expect(() => parseExtractionResponse(badJson)).toThrow(
        'Failed to parse extraction response as JSON'
      );
    });

    it('throws schema violation error when date format is invalid', () => {
      const invalidDateJson = JSON.stringify({
        accusedName: 'Ramesh',
        arrestDate: 'not-a-valid-date',
        remandDate: '2026-01-02'
      });
      expect(() => parseExtractionResponse(invalidDateJson)).toThrow(ZodError);
    });

    it('flags arrestDate and remandDate in missingFields when null or empty', () => {
      const missingDatesJson = JSON.stringify({
        accusedName: 'Ramesh',
        firNumber: '10/2026',
        policeStation: 'Central',
        district: 'Delhi',
        arrestDate: null,
        remandDate: null,
        chargesheetDate: null,
        rawSections: ['303(2) BNS'],
        confidence: 0.5,
        missingFields: []
      });

      const parsed = parseExtractionResponse(missingDatesJson);
      expect(parsed.missingFields).toContain('arrestDate');
      expect(parsed.missingFields).toContain('remandDate');
    });
  });

  describe('pipeline processDocument', () => {
    it('processes document, maps statutory offenses, and approves complete case', async () => {
      const mockLlmCaller = async () =>
        JSON.stringify({
          accusedName: 'Ramesh Kumar',
          firNumber: '101/2026',
          policeStation: 'Kotwali',
          district: 'Central',
          arrestDate: '2026-01-10',
          remandDate: '2026-01-11',
          chargesheetDate: null,
          rawSections: ['303(2) BNS', 'Section 420 IPC'],
          confidence: 0.95,
          missingFields: []
        });

      const documentText = 'FIR No 101/2026 registered at PS Kotwali u/s 303(2) BNS and 420 IPC against Ramesh Kumar';
      const result = await processDocument(documentText, { llmCaller: mockLlmCaller });

      expect(result.extractedData.accusedName).toBe('Ramesh Kumar');
      expect(result.matchedOffenses).toHaveLength(2);
      expect(result.matchedOffenses.map((o) => o.section)).toContain('303(2)');
      expect(result.matchedOffenses.map((o) => o.section)).toContain('420');
      expect(result.unmatchedSections).toHaveLength(0);
      expect(result.requiresManualReview).toBe(false);
    });

    it('flags manual review when an extracted section cannot be mapped to statute database', async () => {
      const mockLlmCaller = async () =>
        JSON.stringify({
          accusedName: 'Suresh',
          firNumber: '102/2026',
          policeStation: 'Kotwali',
          district: 'Central',
          arrestDate: '2026-01-10',
          remandDate: '2026-01-11',
          chargesheetDate: null,
          rawSections: ['303(2) BNS', 'Section 999 Special Act'],
          confidence: 0.85,
          missingFields: []
        });

      const result = await processDocument('Sample document text', { llmCaller: mockLlmCaller });

      expect(result.matchedOffenses).toHaveLength(1);
      expect(result.unmatchedSections).toContain('Section 999 Special Act');
      expect(result.requiresManualReview).toBe(true);
    });

    it('flags manual review when mandatory arrestDate is missing', async () => {
      const mockLlmCaller = async () =>
        JSON.stringify({
          accusedName: 'Suresh',
          firNumber: '103/2026',
          policeStation: 'Kotwali',
          district: 'Central',
          arrestDate: null,
          remandDate: '2026-01-11',
          chargesheetDate: null,
          rawSections: ['303(2) BNS'],
          confidence: 0.6,
          missingFields: ['arrestDate']
        });

      const result = await processDocument('Sample document text', { llmCaller: mockLlmCaller });

      expect(result.extractedData.missingFields).toContain('arrestDate');
      expect(result.requiresManualReview).toBe(true);
    });

    it('throws error when llmCaller is missing in options', async () => {
      await expect(processDocument('Sample text')).rejects.toThrow(
        'A valid llmCaller function must be provided in options'
      );
    });
  });
});
