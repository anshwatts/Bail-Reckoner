import { z } from 'zod';

export const offenseSchema = z
  .object({
    section: z.string().trim().min(1),
    act: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    isBailable: z.boolean(),
    maxSentenceMonths: z.number().int().nonnegative().optional(),
    maxMonths: z.number().int().nonnegative().optional(),
    carriesLifeImprisonment: z.boolean().optional(),
    isLife: z.boolean().optional(),
    carriesDeathPenalty: z.boolean().optional(),
    isDeath: z.boolean().optional(),
    equivalentSection: z.string().nullable().optional()
  })
  .transform((val) => {
    const act = val.act || val.code;
    const code = val.code || val.act;
    const maxMonths = val.maxMonths ?? val.maxSentenceMonths ?? 0;
    const maxSentenceMonths = val.maxSentenceMonths ?? val.maxMonths ?? 0;
    const isLife = val.isLife ?? val.carriesLifeImprisonment ?? false;
    const carriesLifeImprisonment = val.carriesLifeImprisonment ?? val.isLife ?? false;
    const isDeath = val.isDeath ?? val.carriesDeathPenalty ?? false;
    const carriesDeathPenalty = val.carriesDeathPenalty ?? val.isDeath ?? false;

    return {
      section: val.section,
      act,
      code,
      title: val.title,
      isBailable: val.isBailable,
      maxMonths,
      maxSentenceMonths,
      isLife,
      carriesLifeImprisonment,
      isDeath,
      carriesDeathPenalty,
      equivalentSection: val.equivalentSection ?? null
    };
  });

export const caseRecordSchema = z
  .object({
    caseNumber: z.string().trim().min(1).optional(),
    offenses: z.array(offenseSchema).min(1),
    arrestDate: z.coerce.date(),
    calculationDate: z.coerce.date().default(() => new Date()),
    isFirstTimeOffender: z.boolean().default(true),
    hasMultipleCases: z.boolean().default(false),
    chargesheetFiled: z.boolean().default(false),
    chargesheetDate: z.coerce.date().nullable().optional()
  })
  .refine((data) => data.calculationDate >= data.arrestDate, {
    message: 'Calculation date cannot be earlier than arrest date',
    path: ['calculationDate']
  });

export const bailableResultSchema = z.object({
  isBailableAsOfRight: z.boolean(),
  totalOffenses: z.number().int().nonnegative(),
  bailableOffensesCount: z.number().int().nonnegative(),
  nonBailableOffensesCount: z.number().int().nonnegative(),
  details: z.string()
});

export const section479ResultSchema = z.object({
  eligible: z.boolean(),
  isDisqualified: z.boolean(),
  disqualificationReason: z.string().nullable(),
  isFirstTimeOffender: z.boolean(),
  thresholdFraction: z.enum(['1/3', '1/2']),
  thresholdMonths: z.number().nonnegative(),
  thresholdDate: z.date().nullable(),
  daysServed: z.number().int().nonnegative(),
  maxSentenceMonths: z.number().int().nonnegative(),
  maxSentenceDate: z.date().nullable(),
  exceedsMaxSentence: z.boolean(),
  hasMultipleOffenses: z.boolean(),
  hasMultipleCases: z.boolean(),
  details: z.string()
});

export const defaultBailResultSchema = z.object({
  eligible: z.boolean(),
  statutoryPeriodDays: z.union([z.literal(60), z.literal(90)]),
  accrualDay: z.union([z.literal(61), z.literal(91)]),
  accrualDate: z.date(),
  daysServed: z.number().int().nonnegative(),
  chargesheetFiled: z.boolean(),
  chargesheetDate: z.date().nullable(),
  details: z.string()
});

export const flagsSchema = z.object({
  hasMultipleOffenses: z.boolean(),
  hasMultipleCases: z.boolean(),
  exceedsMaxSentence: z.boolean(),
  carriesCapitalOrLifeOffense: z.boolean()
});

export const bailStatusResultSchema = z.object({
  isEligibleForBail: z.boolean(),
  grounds: z.array(z.string()),
  bailable: bailableResultSchema,
  section479: section479ResultSchema,
  defaultBail: defaultBailResultSchema,
  flags: flagsSchema
});

export const bailResultSchema = bailStatusResultSchema;
