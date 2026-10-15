import { z } from 'zod';
import prisma from './db.js';
import { createAuditEntry } from './audit.js';

export const offenseInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .refine((val) => ['BNS', 'IPC'].includes(val.toUpperCase()), {
      message: 'Offense code must be BNS or IPC'
    })
    .transform((val) => val.toUpperCase()),
  section: z.string().trim().min(1),
  title: z.string().trim().min(1),
  maxMonths: z.number().int().nonnegative().default(0),
  isLife: z.boolean().default(false),
  isDeath: z.boolean().default(false),
  isBailable: z.boolean()
});

export const accusedInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  inmateNumber: z.string().trim().min(1).nullable().optional(),
  gender: z.string().trim().min(1).default('UNKNOWN'),
  state: z.string().trim().min(1).default('UNKNOWN'),
  district: z.string().trim().min(1).default('UNKNOWN')
});

export const createCaseBaseSchema = z
  .object({
    accusedId: z.string().trim().min(1).optional(),
    accused: accusedInputSchema.optional(),
    firNumber: z.string().trim().min(1),
    policeStation: z.string().trim().min(1),
    district: z.string().trim().min(1),
    arrestDate: z.coerce.date(),
    remandDate: z.coerce.date(),
    chargesheetDate: z.coerce.date().nullable().optional(),
    isFirstTime: z.boolean().default(true),
    hasMultipleCases: z.boolean().default(false),
    offenses: z.array(offenseInputSchema).min(1)
  })
  .refine((data) => Boolean(data.accusedId || data.accused), {
    message: 'Either accusedId or accused details must be provided',
    path: ['accused']
  });

export const createCaseInputSchema = z.preprocess((val) => {
  if (val && typeof val === 'object') {
    const copy = { ...val };
    if (!copy.accused && !copy.accusedId && copy.name) {
      copy.accused = {
        name: copy.name,
        inmateNumber: copy.inmateNumber,
        gender: copy.gender || 'UNKNOWN',
        state: copy.state || 'UNKNOWN',
        district: copy.district || 'UNKNOWN'
      };
    }
    return copy;
  }
  return val;
}, createCaseBaseSchema);

export const assessmentInputSchema = z.object({
  isBailable: z.boolean(),
  sec479Eligible: z.boolean(),
  sec479Fraction: z.string().nullable().optional(),
  defaultBailEligible: z.boolean(),
  summary: z.union([z.record(z.any()), z.string(), z.array(z.any())]).default({})
});

export async function createCase(userId, inputData) {
  const data = createCaseInputSchema.parse(inputData);

  const execute = async (tx) => {
    let accusedId = data.accusedId;

    if (!accusedId && data.accused) {
      if (data.accused.id) {
        accusedId = data.accused.id;
      } else if (data.accused.inmateNumber) {
        const existing = await tx.accused.findUnique({
          where: { inmateNumber: data.accused.inmateNumber }
        });
        if (existing) {
          accusedId = existing.id;
        } else {
          const created = await tx.accused.create({
            data: {
              name: data.accused.name,
              inmateNumber: data.accused.inmateNumber,
              gender: data.accused.gender,
              state: data.accused.state,
              district: data.accused.district
            }
          });
          accusedId = created.id;
        }
      } else {
        const created = await tx.accused.create({
          data: {
            name: data.accused.name,
            inmateNumber: data.accused.inmateNumber ?? null,
            gender: data.accused.gender,
            state: data.accused.state,
            district: data.accused.district
          }
        });
        accusedId = created.id;
      }
    }

    const createdCase = await tx.case.create({
      data: {
        accusedId,
        firNumber: data.firNumber,
        policeStation: data.policeStation,
        district: data.district,
        arrestDate: data.arrestDate,
        remandDate: data.remandDate,
        chargesheetDate: data.chargesheetDate ?? null,
        isFirstTime: data.isFirstTime ?? true,
        hasMultipleCases: data.hasMultipleCases ?? false
      }
    });

    if (data.offenses && data.offenses.length > 0) {
      if (typeof tx.offense.createMany === 'function') {
        await tx.offense.createMany({
          data: data.offenses.map((o) => ({
            caseId: createdCase.id,
            code: o.code,
            section: o.section,
            title: o.title,
            maxMonths: o.maxMonths ?? 0,
            isLife: o.isLife ?? false,
            isDeath: o.isDeath ?? false,
            isBailable: o.isBailable
          }))
        });
      } else {
        for (const o of data.offenses) {
          await tx.offense.create({
            data: {
              caseId: createdCase.id,
              code: o.code,
              section: o.section,
              title: o.title,
              maxMonths: o.maxMonths ?? 0,
              isLife: o.isLife ?? false,
              isDeath: o.isDeath ?? false,
              isBailable: o.isBailable
            }
          });
        }
      }
    }

    await createAuditEntry(
      userId,
      'CREATE_CASE',
      'Case',
      createdCase.id,
      {
        firNumber: createdCase.firNumber,
        district: createdCase.district,
        accusedId
      },
      tx
    );

    if (typeof tx.case.findUnique === 'function') {
      const fullCase = await tx.case.findUnique({
        where: { id: createdCase.id },
        include: {
          accused: true,
          offenses: true
        }
      });
      if (fullCase) {
        return fullCase;
      }
    }

    return createdCase;
  };

  if (typeof prisma.$transaction === 'function') {
    return await prisma.$transaction(execute);
  }
  return await execute(prisma);
}

export async function recordAssessment(userId, caseId, assessmentData) {
  if (!caseId || typeof caseId !== 'string') {
    throw new Error('Valid caseId is required');
  }
  const validated = assessmentInputSchema.parse(assessmentData);

  const execute = async (tx) => {
    const record = await tx.assessment.create({
      data: {
        caseId,
        userId: userId ?? null,
        isBailable: validated.isBailable,
        sec479Eligible: validated.sec479Eligible,
        sec479Fraction: validated.sec479Fraction ?? null,
        defaultBailEligible: validated.defaultBailEligible,
        summary: validated.summary
      }
    });

    await createAuditEntry(
      userId,
      'RECORD_ASSESSMENT',
      'Assessment',
      record.id,
      {
        caseId,
        isBailable: validated.isBailable,
        sec479Eligible: validated.sec479Eligible,
        defaultBailEligible: validated.defaultBailEligible
      },
      tx
    );

    return record;
  };

  if (typeof prisma.$transaction === 'function') {
    return await prisma.$transaction(execute);
  }
  return await execute(prisma);
}

export async function getCaseById(caseId) {
  if (!caseId || typeof caseId !== 'string') {
    throw new Error('Valid caseId is required');
  }

  return await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      accused: true,
      offenses: true,
      assessments: {
        orderBy: { checkedAt: 'desc' }
      }
    }
  });
}
