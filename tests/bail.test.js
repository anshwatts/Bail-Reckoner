import { describe, it, expect } from 'vitest';
import { addDays, addMonths } from 'date-fns';
import { ZodError } from 'zod';
import { checkBailEligibility } from '../src/bail.js';
import {
  calculateDaysServed,
  calculateThresholdDate,
  calculateMaxSentenceDate,
  calculateDefaultBailDate,
  isDateOnOrAfter,
  isDateBefore
} from '../src/dates.js';
import { offenseSchema, caseRecordSchema } from '../src/schemas.js';

describe('checkBailEligibility - Section 479 BNSS', () => {
  it('identifies first-time offender eligibility when one-third sentence threshold is met', () => {
    const arrestDate = new Date('2024-01-01');
    const underThresholdDate = addMonths(arrestDate, 6);
    const exactThresholdDate = addMonths(arrestDate, 12);
    const overThresholdDate = addMonths(arrestDate, 15);

    const baseRecord = {
      arrestDate,
      isFirstTimeOffender: true,
      chargesheetFiled: true,
      offenses: [
        {
          section: '379',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 36
        }
      ]
    };

    const underResult = checkBailEligibility({
      ...baseRecord,
      calculationDate: underThresholdDate
    });
    expect(underResult.section479.eligible).toBe(false);
    expect(underResult.section479.thresholdFraction).toBe('1/3');
    expect(underResult.section479.thresholdMonths).toBe(12);
    expect(underResult.isEligibleForBail).toBe(false);

    const exactResult = checkBailEligibility({
      ...baseRecord,
      calculationDate: exactThresholdDate
    });
    expect(exactResult.section479.eligible).toBe(true);
    expect(exactResult.isEligibleForBail).toBe(true);
    expect(exactResult.grounds).toContain('section_479');

    const overResult = checkBailEligibility({
      ...baseRecord,
      calculationDate: overThresholdDate
    });
    expect(overResult.section479.eligible).toBe(true);
    expect(overResult.isEligibleForBail).toBe(true);
  });

  it('calculates one-third threshold correctly for 7-year offense', () => {
    const arrestDate = new Date('2024-01-01');
    const thresholdDate = addMonths(arrestDate, 28);
    const beforeThresholdDate = addMonths(arrestDate, 27);

    const record = {
      arrestDate,
      isFirstTimeOffender: true,
      chargesheetFiled: true,
      offenses: [
        {
          section: '420',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 84
        }
      ]
    };

    const beforeResult = checkBailEligibility({
      ...record,
      calculationDate: beforeThresholdDate
    });
    expect(beforeResult.section479.eligible).toBe(false);
    expect(beforeResult.section479.thresholdMonths).toBe(28);

    const eligibleResult = checkBailEligibility({
      ...record,
      calculationDate: thresholdDate
    });
    expect(eligibleResult.section479.eligible).toBe(true);
    expect(eligibleResult.grounds).toContain('section_479');
  });

  it('requires one-half sentence threshold for repeat offenders', () => {
    const arrestDate = new Date('2024-01-01');
    const oneThirdDate = addMonths(arrestDate, 12);
    const oneHalfDate = addMonths(arrestDate, 18);
    const pastOneHalfDate = addMonths(arrestDate, 20);

    const record = {
      arrestDate,
      isFirstTimeOffender: false,
      chargesheetFiled: true,
      offenses: [
        {
          section: '379',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 36
        }
      ]
    };

    const oneThirdResult = checkBailEligibility({
      ...record,
      calculationDate: oneThirdDate
    });
    expect(oneThirdResult.section479.eligible).toBe(false);
    expect(oneThirdResult.section479.thresholdFraction).toBe('1/2');
    expect(oneThirdResult.section479.thresholdMonths).toBe(18);

    const oneHalfResult = checkBailEligibility({
      ...record,
      calculationDate: oneHalfDate
    });
    expect(oneHalfResult.section479.eligible).toBe(true);
    expect(oneHalfResult.grounds).toContain('section_479');

    const pastResult = checkBailEligibility({
      ...record,
      calculationDate: pastOneHalfDate
    });
    expect(pastResult.section479.eligible).toBe(true);
  });

  it('disqualifies Section 479 relief if offense carries life imprisonment', () => {
    const arrestDate = new Date('2020-01-01');
    const calculationDate = addMonths(arrestDate, 60);

    const result = checkBailEligibility({
      arrestDate,
      calculationDate,
      isFirstTimeOffender: true,
      chargesheetFiled: true,
      offenses: [
        {
          section: '307',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 120,
          carriesLifeImprisonment: true
        }
      ]
    });

    expect(result.section479.eligible).toBe(false);
    expect(result.section479.isDisqualified).toBe(true);
    expect(result.section479.thresholdDate).toBeNull();
    expect(result.flags.carriesCapitalOrLifeOffense).toBe(true);
    expect(result.grounds).not.toContain('section_479');
  });

  it('disqualifies Section 479 relief if offense carries death penalty', () => {
    const arrestDate = new Date('2020-01-01');
    const calculationDate = addMonths(arrestDate, 60);

    const result = checkBailEligibility({
      arrestDate,
      calculationDate,
      isFirstTimeOffender: true,
      chargesheetFiled: true,
      offenses: [
        {
          section: '302',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 0,
          carriesLifeImprisonment: true,
          carriesDeathPenalty: true
        }
      ]
    });

    expect(result.section479.eligible).toBe(false);
    expect(result.section479.isDisqualified).toBe(true);
    expect(result.flags.carriesCapitalOrLifeOffense).toBe(true);
  });

  it('disqualifies Section 479 relief if any alleged offense among multiple carries death or life', () => {
    const arrestDate = new Date('2020-01-01');
    const calculationDate = addMonths(arrestDate, 60);

    const result = checkBailEligibility({
      arrestDate,
      calculationDate,
      isFirstTimeOffender: true,
      chargesheetFiled: true,
      offenses: [
        {
          section: '379',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 36
        },
        {
          section: '302',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 0,
          carriesLifeImprisonment: true,
          carriesDeathPenalty: true
        }
      ]
    });

    expect(result.section479.isDisqualified).toBe(true);
    expect(result.section479.eligible).toBe(false);
    expect(result.flags.hasMultipleOffenses).toBe(true);
  });

  it('detects when undertrial detention exceeds the maximum statutory penalty', () => {
    const arrestDate = new Date('2022-01-01');
    const calculationDate = addMonths(arrestDate, 38);

    const result = checkBailEligibility({
      arrestDate,
      calculationDate,
      isFirstTimeOffender: true,
      chargesheetFiled: true,
      offenses: [
        {
          section: '379',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 36
        }
      ]
    });

    expect(result.section479.exceedsMaxSentence).toBe(true);
    expect(result.flags.exceedsMaxSentence).toBe(true);
    expect(result.isEligibleForBail).toBe(true);
    expect(result.grounds).toContain('exceeded_max_sentence');
    expect(result.grounds).toContain('section_479');
  });

  it('flags presence of multiple cases and multiple offenses', () => {
    const arrestDate = new Date('2024-01-01');
    const calculationDate = addMonths(arrestDate, 2);

    const result = checkBailEligibility({
      arrestDate,
      calculationDate,
      isFirstTimeOffender: true,
      hasMultipleCases: true,
      chargesheetFiled: true,
      offenses: [
        {
          section: '323',
          act: 'IPC',
          isBailable: true,
          maxSentenceMonths: 12
        },
        {
          section: '379',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 36
        }
      ]
    });

    expect(result.flags.hasMultipleOffenses).toBe(true);
    expect(result.flags.hasMultipleCases).toBe(true);
    expect(result.section479.hasMultipleOffenses).toBe(true);
    expect(result.section479.hasMultipleCases).toBe(true);
  });
});

describe('checkBailEligibility - Section 187 BNSS / Section 167(2) CrPC Default Bail', () => {
  it('triggers default bail on day 61 for offenses under 10 years when chargesheet not filed', () => {
    const arrestDate = new Date('2024-01-01');
    const day60 = addDays(arrestDate, 60);
    const day61 = addDays(arrestDate, 61);

    const baseRecord = {
      arrestDate,
      isFirstTimeOffender: true,
      chargesheetFiled: false,
      offenses: [
        {
          section: '379',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 36
        }
      ]
    };

    const day60Result = checkBailEligibility({
      ...baseRecord,
      calculationDate: day60
    });
    expect(day60Result.defaultBail.eligible).toBe(false);
    expect(day60Result.defaultBail.statutoryPeriodDays).toBe(60);
    expect(day60Result.defaultBail.accrualDay).toBe(61);
    expect(day60Result.defaultBail.daysServed).toBe(60);
    expect(day60Result.grounds).not.toContain('default_bail');

    const day61Result = checkBailEligibility({
      ...baseRecord,
      calculationDate: day61
    });
    expect(day61Result.defaultBail.eligible).toBe(true);
    expect(day61Result.defaultBail.daysServed).toBe(61);
    expect(day61Result.isEligibleForBail).toBe(true);
    expect(day61Result.grounds).toContain('default_bail');
  });

  it('prevents default bail on day 61 if chargesheet is filed', () => {
    const arrestDate = new Date('2024-01-01');
    const day61 = addDays(arrestDate, 61);

    const result = checkBailEligibility({
      arrestDate,
      calculationDate: day61,
      chargesheetFiled: true,
      chargesheetDate: addDays(arrestDate, 45),
      offenses: [
        {
          section: '379',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 36
        }
      ]
    });

    expect(result.defaultBail.eligible).toBe(false);
    expect(result.defaultBail.chargesheetFiled).toBe(true);
    expect(result.grounds).not.toContain('default_bail');
  });

  it('triggers default bail on day 91 for offenses punishable with 10 or more years', () => {
    const arrestDate = new Date('2024-01-01');
    const day90 = addDays(arrestDate, 90);
    const day91 = addDays(arrestDate, 91);

    const baseRecord = {
      arrestDate,
      isFirstTimeOffender: true,
      chargesheetFiled: false,
      offenses: [
        {
          section: '395',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 120
        }
      ]
    };

    const day90Result = checkBailEligibility({
      ...baseRecord,
      calculationDate: day90
    });
    expect(day90Result.defaultBail.eligible).toBe(false);
    expect(day90Result.defaultBail.statutoryPeriodDays).toBe(90);
    expect(day90Result.defaultBail.accrualDay).toBe(91);
    expect(day90Result.defaultBail.daysServed).toBe(90);

    const day91Result = checkBailEligibility({
      ...baseRecord,
      calculationDate: day91
    });
    expect(day91Result.defaultBail.eligible).toBe(true);
    expect(day91Result.defaultBail.daysServed).toBe(91);
    expect(day91Result.isEligibleForBail).toBe(true);
    expect(day91Result.grounds).toContain('default_bail');
  });

  it('triggers default bail on day 91 for offenses punishable with death or life imprisonment', () => {
    const arrestDate = new Date('2024-01-01');
    const day90 = addDays(arrestDate, 90);
    const day91 = addDays(arrestDate, 91);

    const baseRecord = {
      arrestDate,
      isFirstTimeOffender: true,
      chargesheetFiled: false,
      offenses: [
        {
          section: '302',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 0,
          carriesLifeImprisonment: true,
          carriesDeathPenalty: true
        }
      ]
    };

    const day90Result = checkBailEligibility({
      ...baseRecord,
      calculationDate: day90
    });
    expect(day90Result.defaultBail.eligible).toBe(false);
    expect(day90Result.defaultBail.statutoryPeriodDays).toBe(90);

    const day91Result = checkBailEligibility({
      ...baseRecord,
      calculationDate: day91
    });
    expect(day91Result.defaultBail.eligible).toBe(true);
    expect(day91Result.isEligibleForBail).toBe(true);
    expect(day91Result.grounds).toContain('default_bail');
  });

  it('prevents default bail on day 91 if chargesheet is filed', () => {
    const arrestDate = new Date('2024-01-01');
    const day91 = addDays(arrestDate, 91);

    const result = checkBailEligibility({
      arrestDate,
      calculationDate: day91,
      chargesheetFiled: true,
      offenses: [
        {
          section: '395',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 120
        }
      ]
    });

    expect(result.defaultBail.eligible).toBe(false);
  });
});

describe('checkBailEligibility - Bailable offenses check', () => {
  it('marks bail as a matter of right when every alleged offense is bailable', () => {
    const arrestDate = new Date('2024-01-01');

    const result = checkBailEligibility({
      arrestDate,
      calculationDate: arrestDate,
      chargesheetFiled: true,
      offenses: [
        {
          section: '323',
          act: 'IPC',
          isBailable: true,
          maxSentenceMonths: 12
        },
        {
          section: '341',
          act: 'IPC',
          isBailable: true,
          maxSentenceMonths: 1
        }
      ]
    });

    expect(result.bailable.isBailableAsOfRight).toBe(true);
    expect(result.bailable.nonBailableOffensesCount).toBe(0);
    expect(result.isEligibleForBail).toBe(true);
    expect(result.grounds).toContain('bailable_as_of_right');
  });

  it('denies bailable right when at least one offense is non-bailable', () => {
    const arrestDate = new Date('2024-01-01');

    const result = checkBailEligibility({
      arrestDate,
      calculationDate: arrestDate,
      chargesheetFiled: true,
      offenses: [
        {
          section: '323',
          act: 'IPC',
          isBailable: true,
          maxSentenceMonths: 12
        },
        {
          section: '379',
          act: 'IPC',
          isBailable: false,
          maxSentenceMonths: 36
        }
      ]
    });

    expect(result.bailable.isBailableAsOfRight).toBe(false);
    expect(result.bailable.nonBailableOffensesCount).toBe(1);
    expect(result.grounds).not.toContain('bailable_as_of_right');
  });
});

describe('checkBailEligibility - Validation errors', () => {
  it('throws ZodError on empty offenses list', () => {
    expect(() => {
      checkBailEligibility({
        arrestDate: '2024-01-01',
        offenses: []
      });
    }).toThrow(ZodError);
  });

  it('throws ZodError on negative maximum sentence months', () => {
    expect(() => {
      checkBailEligibility({
        arrestDate: '2024-01-01',
        offenses: [
          {
            section: '379',
            isBailable: false,
            maxSentenceMonths: -5
          }
        ]
      });
    }).toThrow(ZodError);
  });

  it('throws ZodError on missing required fields', () => {
    expect(() => {
      checkBailEligibility({
        offenses: [
          {
            section: '379',
            isBailable: false,
            maxSentenceMonths: 36
          }
        ]
      });
    }).toThrow(ZodError);
  });

  it('throws ZodError on invalid date strings', () => {
    expect(() => {
      checkBailEligibility({
        arrestDate: 'not-a-valid-date',
        offenses: [
          {
            section: '379',
            isBailable: false,
            maxSentenceMonths: 36
          }
        ]
      });
    }).toThrow(ZodError);
  });

  it('throws ZodError when calculationDate is earlier than arrestDate', () => {
    expect(() => {
      checkBailEligibility({
        arrestDate: '2024-06-01',
        calculationDate: '2024-01-01',
        offenses: [
          {
            section: '379',
            isBailable: false,
            maxSentenceMonths: 36
          }
        ]
      });
    }).toThrow(ZodError);
  });

  it('throws ZodError when offense section name is blank', () => {
    expect(() => {
      checkBailEligibility({
        arrestDate: '2024-01-01',
        offenses: [
          {
            section: '   ',
            isBailable: false,
            maxSentenceMonths: 36
          }
        ]
      });
    }).toThrow(ZodError);
  });
});

describe('dates helper functions', () => {
  it('calculates days served across leap year accurately', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-03-01');
    const days = calculateDaysServed(startDate, endDate);
    expect(days).toBe(60);
  });

  it('computes exact calendar threshold dates without 30-day approximations', () => {
    const startDate = new Date('2024-01-15');
    const oneThirdDate = calculateThresholdDate(startDate, 36, 1 / 3);
    expect(oneThirdDate.getFullYear()).toBe(2025);
    expect(oneThirdDate.getMonth()).toBe(0);
    expect(oneThirdDate.getDate()).toBe(15);
  });

  it('computes max sentence date using calendar addition', () => {
    const startDate = new Date('2024-01-01');
    const maxDate = calculateMaxSentenceDate(startDate, 84);
    expect(maxDate.getFullYear()).toBe(2031);
    expect(maxDate.getMonth()).toBe(0);
    expect(maxDate.getDate()).toBe(1);
  });

  it('computes default bail accrual dates correctly', () => {
    const startDate = new Date('2024-01-01');
    const bail60 = calculateDefaultBailDate(startDate, 60);
    expect(calculateDaysServed(startDate, bail60)).toBe(61);

    const bail90 = calculateDefaultBailDate(startDate, 90);
    expect(calculateDaysServed(startDate, bail90)).toBe(91);
  });

  it('compares dates accurately with isDateOnOrAfter and isDateBefore', () => {
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-02');
    expect(isDateOnOrAfter(date2, date1)).toBe(true);
    expect(isDateOnOrAfter(date1, date1)).toBe(true);
    expect(isDateOnOrAfter(date1, date2)).toBe(false);
    expect(isDateBefore(date1, date2)).toBe(true);
    expect(isDateBefore(date2, date1)).toBe(false);
  });
});
