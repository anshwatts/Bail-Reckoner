import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { selectPrecedentsForCase, getPrecedentsByTag } from '../src/precedents.js';
import { createBailPetition } from '../src/draft.js';
import { precedentsData } from '../src/data/precedentsData.js';

describe('precedent injection and petition drafting', () => {
  describe('precedents data and lookup', () => {
    it('contains all required landmark precedents', () => {
      expect(precedentsData.length).toBeGreaterThanOrEqual(4);
      const titles = precedentsData.map((p) => p.title);
      expect(titles).toContain('In Re: Inhuman Conditions in 1382 Prisons');
      expect(titles).toContain('Bikramjit Singh v. State of Punjab');
      expect(titles).toContain('Satender Kumar Antil v. Central Bureau of Investigation');
      expect(titles).toContain('Hussainara Khatoon (I) v. Home Secretary, State of Bihar');
    });

    it('retrieves precedents by tag correctly', () => {
      const sec479Precedents = getPrecedentsByTag('SEC_479_BNSS');
      expect(sec479Precedents).toHaveLength(1);
      expect(sec479Precedents[0].title).toBe('In Re: Inhuman Conditions in 1382 Prisons');

      const defaultBailPrecedents = getPrecedentsByTag('DEFAULT_BAIL');
      expect(defaultBailPrecedents).toHaveLength(1);
      expect(defaultBailPrecedents[0].title).toBe('Bikramjit Singh v. State of Punjab');

      expect(getPrecedentsByTag('UNKNOWN_TAG')).toEqual([]);
      expect(getPrecedentsByTag(null)).toEqual([]);
    });
  });

  describe('selectPrecedentsForCase', () => {
    it('injects In Re: Inhuman Conditions in 1382 Prisons for Section 479 eligibility', () => {
      const eligibilityResult = {
        isEligibleForBail: true,
        section479: {
          eligible: true,
          thresholdFraction: '1/3',
          thresholdMonths: 12,
          daysServed: 125,
          isFirstTimeOffender: true
        }
      };

      const matched = selectPrecedentsForCase(eligibilityResult, { isFirstTimeOffender: true });
      const titles = matched.map((p) => p.title);
      const citations = matched.map((p) => p.citation);

      expect(titles).toContain('In Re: Inhuman Conditions in 1382 Prisons');
      expect(citations).toContain(
        'Writ Petition (Civil) No. 406/2013, Supreme Court of India (Order dated August 23, 2024)'
      );
    });

    it('injects Bikramjit Singh for Default Bail eligibility', () => {
      const eligibilityResult = {
        isEligibleForBail: true,
        defaultBail: {
          eligible: true,
          statutoryPeriodDays: 60,
          accrualDay: 61,
          daysServed: 65
        }
      };

      const matched = selectPrecedentsForCase(eligibilityResult, {});
      const titles = matched.map((p) => p.title);
      const citations = matched.map((p) => p.citation);

      expect(titles).toContain('Bikramjit Singh v. State of Punjab');
      expect(citations).toContain('(2020) 10 SCC 616');
    });

    it('injects Satender Kumar Antil when case is bailable or accused is first-time offender', () => {
      const eligibilityResult = {
        isEligibleForBail: true,
        bailable: { isBailableAsOfRight: true }
      };

      const matched = selectPrecedentsForCase(eligibilityResult, { isFirstTimeOffender: false });
      const titles = matched.map((p) => p.title);
      expect(titles).toContain('Satender Kumar Antil v. Central Bureau of Investigation');
    });

    it('injects Hussainara Khatoon when accused is indigent or custody is prolonged', () => {
      const eligibilityResult = {
        isEligibleForBail: false,
        section479: {
          eligible: false,
          daysServed: 210
        }
      };

      const matched = selectPrecedentsForCase(eligibilityResult, { isIndigent: true });
      const titles = matched.map((p) => p.title);
      expect(titles).toContain('Hussainara Khatoon (I) v. Home Secretary, State of Bihar');
    });
  });

  describe('createBailPetition generation and formatting', () => {
    const validCaseData = {
      firNumber: '101/2026',
      policeStation: 'Kotwali',
      district: 'Central',
      state: 'Delhi',
      accusedName: 'Ramesh Kumar',
      parentName: 'Suresh Kumar',
      arrestDate: '2026-01-01',
      isFirstTimeOffender: true,
      offenses: [{ section: '303(2)', code: 'BNS' }]
    };

    const validEligibility = {
      isEligibleForBail: true,
      section479: {
        eligible: true,
        thresholdFraction: '1/3',
        thresholdMonths: 12,
        daysServed: 120
      },
      grounds: ['section_479']
    };

    const courtDetails = {
      courtName: 'COURT OF CHIEF JUDICIAL MAGISTRATE',
      district: 'Central',
      state: 'Delhi',
      parentName: 'Suresh Kumar'
    };

    it('generates complete structured petition text for Section 479 case with exact attributes', () => {
      const petition = createBailPetition(validCaseData, validEligibility, courtDetails);

      expect(petition.title).toContain('APPLICATION FOR REGULAR BAIL');
      expect(petition.sectionsInvoked).toContain('Section 479 of the Bharatiya Nagarik Suraksha Sanhita, 2023');

      expect(petition.fullText).toContain('IN THE COURT OF CHIEF JUDICIAL MAGISTRATE AT CENTRAL, DELHI');
      expect(petition.fullText).toContain('Ramesh Kumar');
      expect(petition.fullText).toContain('Suresh Kumar');
      expect(petition.fullText).toContain('101/2026');
      expect(petition.fullText).toContain('Kotwali');
      expect(petition.fullText).toContain('120 days');
      expect(petition.fullText).toContain('1/3');
      expect(petition.fullText).toContain('33.3%');
      expect(petition.fullText).toContain(
        'Writ Petition (Civil) No. 406/2013, Supreme Court of India (Order dated August 23, 2024)'
      );
      expect(petition.fullText).toContain('PRAYER');
      expect(petition.fullText).toContain('Direct the release of the Applicant / Accused');

      expect(petition.citationsUsed).toContain(
        'Writ Petition (Civil) No. 406/2013, Supreme Court of India (Order dated August 23, 2024)'
      );
    });

    it('generates petition for default bail invoking Section 187 BNSS and Bikramjit Singh', () => {
      const defaultBailEligibility = {
        isEligibleForBail: true,
        defaultBail: {
          eligible: true,
          statutoryPeriodDays: 60,
          accrualDay: 61,
          daysServed: 62
        },
        grounds: ['default_bail']
      };

      const petition = createBailPetition(validCaseData, defaultBailEligibility, courtDetails);
      expect(petition.sectionsInvoked).toContain('Section 187 of the Bharatiya Nagarik Suraksha Sanhita, 2023');
      expect(petition.fullText).toContain('(2020) 10 SCC 616');
      expect(petition.fullText).toContain('day 61');
    });

    it('incorporates custom narrative generator without overwriting statutory grounds', () => {
      const options = {
        narrativeGenerator: (c) =>
          `The applicant ${c.accusedName} was running an eatery when an altercation took place without his involvement.`
      };

      const petition = createBailPetition(validCaseData, validEligibility, courtDetails, options);
      expect(petition.fullText).toContain('running an eatery when an altercation took place');
      expect(petition.fullText).toContain('Writ Petition (Civil) No. 406/2013');
      expect(petition.fullText).toContain('PRAYER');
    });

    it('rejects invalid calculation inputs or missing mandatory fields with ZodError', () => {
      const invalidEligibility = {
        isEligibleForBail: 'not-a-boolean'
      };
      expect(() => createBailPetition(validCaseData, invalidEligibility)).toThrow(ZodError);

      const invalidCase = {
        ...validCaseData,
        firNumber: ''
      };
      expect(() => createBailPetition(invalidCase, validEligibility)).toThrow(ZodError);

      const missingAccusedCase = {
        firNumber: '101/2026',
        policeStation: 'Kotwali',
        district: 'Central'
      };
      expect(() => createBailPetition(missingAccusedCase, validEligibility)).toThrow(ZodError);
    });
  });
});
