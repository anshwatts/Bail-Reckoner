import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';

describe('server api routes', () => {
  describe('GET /api/offenses', () => {
    it('returns 200 and relevant matches for theft query', async () => {
      const res = await request(app).get('/api/offenses?q=theft');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const titles = res.body.map((o) => o.title.toLowerCase());
      expect(titles.some((t) => t.includes('theft'))).toBe(true);
    });

    it('returns empty array or all offenses on blank query', async () => {
      const res = await request(app).get('/api/offenses');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/check', () => {
    it('returns correct section 479 eligibility with valid payload', async () => {
      const validPayload = {
        arrestDate: '2024-01-01',
        calculationDate: '2025-01-01',
        isFirstTimeOffender: true,
        chargesheetFiled: true,
        offenses: [
          {
            section: '379',
            code: 'IPC',
            maxMonths: 36,
            isLife: false,
            isDeath: false,
            isBailable: false
          }
        ]
      };

      const res = await request(app).post('/api/check').send(validPayload);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isEligibleForBail', true);
      expect(res.body.section479).toHaveProperty('eligible', true);
      expect(res.body.section479).toHaveProperty('thresholdFraction', '1/3');
      expect(res.body.grounds).toContain('section_479');
    });

    it('returns 400 when sent invalid date or missing offenses', async () => {
      const invalidDatePayload = {
        arrestDate: 'invalid-date',
        offenses: [{ section: '379', isBailable: false }]
      };
      const res1 = await request(app).post('/api/check').send(invalidDatePayload);
      expect(res1.status).toBe(400);
      expect(res1.body).toHaveProperty('error', 'Validation error');

      const missingOffensesPayload = {
        arrestDate: '2026-01-01',
        offenses: []
      };
      const res2 = await request(app).post('/api/check').send(missingOffensesPayload);
      expect(res2.status).toBe(400);
      expect(res2.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('POST /api/petition', () => {
    it('generates a draft petition from calculation and case data', async () => {
      const payload = {
        caseData: {
          firNumber: '99/2026',
          policeStation: 'Kotwali',
          district: 'Central',
          accusedName: 'Ramesh',
          isFirstTimeOffender: true
        },
        eligibilityResult: {
          isEligibleForBail: true,
          section479: {
            eligible: true,
            thresholdFraction: '1/3',
            thresholdMonths: 12,
            daysServed: 130
          }
        },
        courtDetails: {
          courtName: 'COURT OF CHIEF JUDICIAL MAGISTRATE',
          district: 'Central'
        }
      };

      const res = await request(app).post('/api/petition').send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('sectionsInvoked');
      expect(res.body).toHaveProperty('fullText');
      expect(res.body.fullText).toContain('Ramesh');
      expect(res.body.fullText).toContain('99/2026');
    });

    it('returns 400 when petition input data is invalid', async () => {
      const res = await request(app).post('/api/petition').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/upload', () => {
    it('returns 400 when no file is uploaded', async () => {
      const res = await request(app).post('/api/upload');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'No file uploaded');
    });

    it('processes uploaded text file buffer and returns extracted fields', async () => {
      const fakeFileContent = 'FIR No. 44/2026 registered at PS Kotwali District Delhi u/s 303(2) BNS against Ramesh Kumar. Date of arrest: 2026-01-01';
      const res = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from(fakeFileContent), 'fir.txt');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('extractedData');
      expect(res.body).toHaveProperty('matchedOffenses');
      expect(res.body).toHaveProperty('requiresManualReview');
    });
  });
});
