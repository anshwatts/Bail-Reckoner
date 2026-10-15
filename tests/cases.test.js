import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';

const mockPrisma = {
  accused: {
    findUnique: vi.fn(),
    create: vi.fn()
  },
  case: {
    create: vi.fn(),
    findUnique: vi.fn()
  },
  offense: {
    createMany: vi.fn(),
    create: vi.fn()
  },
  auditLog: {
    create: vi.fn()
  },
  assessment: {
    create: vi.fn()
  },
  $transaction: vi.fn((callback) => callback(mockPrisma))
};

vi.mock('../src/db.js', () => ({
  prisma: mockPrisma,
  default: mockPrisma
}));

const { createCase, recordAssessment, getCaseById } = await import('../src/cases.js');

describe('cases service and validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
    mockPrisma.accused.findUnique.mockResolvedValue(null);
    mockPrisma.accused.create.mockResolvedValue({ id: 'accused-uuid-1', name: 'Ramesh' });
    mockPrisma.case.create.mockResolvedValue({
      id: 'case-uuid-1',
      firNumber: '101/2026',
      district: 'Central',
      accusedId: 'accused-uuid-1'
    });
    mockPrisma.case.findUnique.mockResolvedValue({
      id: 'case-uuid-1',
      firNumber: '101/2026',
      district: 'Central',
      accusedId: 'accused-uuid-1',
      accused: { id: 'accused-uuid-1', name: 'Ramesh' },
      offenses: [],
      assessments: []
    });
    mockPrisma.offense.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-uuid-1' });
    mockPrisma.assessment.create.mockResolvedValue({ id: 'assessment-uuid-1', caseId: 'case-uuid-1' });
  });

  describe('createCase validation', () => {
    const validBasePayload = {
      accused: {
        name: 'Ramesh Kumar',
        inmateNumber: 'INM-2026-11',
        gender: 'MALE',
        state: 'Delhi',
        district: 'Central'
      },
      firNumber: '101/2026',
      policeStation: 'Kotwali',
      district: 'Central',
      arrestDate: new Date('2026-01-10'),
      remandDate: new Date('2026-01-11'),
      offenses: [
        {
          code: 'BNS',
          section: '303',
          title: 'Theft',
          maxMonths: 36,
          isLife: false,
          isDeath: false,
          isBailable: false
        }
      ]
    };

    it('rejects payload when arrestDate is missing', async () => {
      const payload = { ...validBasePayload };
      delete payload.arrestDate;
      await expect(createCase('user-1', payload)).rejects.toThrow(ZodError);
    });

    it('rejects payload when arrestDate is invalid', async () => {
      const payload = { ...validBasePayload, arrestDate: 'invalid-date-string' };
      await expect(createCase('user-1', payload)).rejects.toThrow(ZodError);
    });

    it('rejects payload when remandDate is missing', async () => {
      const payload = { ...validBasePayload };
      delete payload.remandDate;
      await expect(createCase('user-1', payload)).rejects.toThrow(ZodError);
    });

    it('rejects payload when remandDate is invalid', async () => {
      const payload = { ...validBasePayload, remandDate: 'not-a-real-date' };
      await expect(createCase('user-1', payload)).rejects.toThrow(ZodError);
    });

    it('rejects payload when offenses is missing', async () => {
      const payload = { ...validBasePayload };
      delete payload.offenses;
      await expect(createCase('user-1', payload)).rejects.toThrow(ZodError);
    });

    it('rejects payload when offenses array is empty', async () => {
      const payload = { ...validBasePayload, offenses: [] };
      await expect(createCase('user-1', payload)).rejects.toThrow(ZodError);
    });

    it('rejects payload when offense is missing required section or isBailable', async () => {
      const payload1 = {
        ...validBasePayload,
        offenses: [{ code: 'BNS', title: 'Theft', isBailable: true }]
      };
      await expect(createCase('user-1', payload1)).rejects.toThrow(ZodError);

      const payload2 = {
        ...validBasePayload,
        offenses: [{ code: 'BNS', section: '303', title: 'Theft' }]
      };
      await expect(createCase('user-1', payload2)).rejects.toThrow(ZodError);
    });

    it('rejects payload when offense code is not BNS or IPC', async () => {
      const payload = {
        ...validBasePayload,
        offenses: [{ code: 'MOTOR_VEHICLE', section: '185', title: 'Drink Driving', isBailable: true }]
      };
      await expect(createCase('user-1', payload)).rejects.toThrow(ZodError);
    });

    it('rejects payload when firNumber, policeStation, or district is missing', async () => {
      const missingFir = { ...validBasePayload, firNumber: '' };
      await expect(createCase('user-1', missingFir)).rejects.toThrow(ZodError);

      const missingPs = { ...validBasePayload, policeStation: '   ' };
      await expect(createCase('user-1', missingPs)).rejects.toThrow(ZodError);

      const missingDist = { ...validBasePayload };
      delete missingDist.district;
      await expect(createCase('user-1', missingDist)).rejects.toThrow(ZodError);
    });

    it('rejects payload when neither accusedId nor accused details are provided', async () => {
      const noAccused = {
        firNumber: '101/2026',
        policeStation: 'Kotwali',
        district: 'Central',
        arrestDate: new Date('2026-01-10'),
        remandDate: new Date('2026-01-11'),
        offenses: [
          {
            code: 'IPC',
            section: '379',
            title: 'Theft',
            isBailable: false
          }
        ]
      };
      await expect(createCase('user-1', noAccused)).rejects.toThrow(ZodError);
    });
  });

  describe('createCase successful execution', () => {
    it('creates accused, case, offenses, and audit log in a transaction', async () => {
      const payload = {
        accused: {
          name: 'Suresh Patil',
          inmateNumber: 'INM-889',
          gender: 'MALE',
          state: 'Maharashtra',
          district: 'Pune'
        },
        firNumber: '202/2026',
        policeStation: 'Shivajinagar',
        district: 'Pune',
        arrestDate: '2026-02-01',
        remandDate: '2026-02-02',
        isFirstTime: true,
        hasMultipleCases: false,
        offenses: [
          {
            code: 'BNS',
            section: '103',
            title: 'Murder',
            maxMonths: 240,
            isLife: true,
            isDeath: true,
            isBailable: false
          }
        ]
      };

      const result = await createCase('user-admin-1', payload);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.accused.create).toHaveBeenCalledWith({
        data: {
          name: 'Suresh Patil',
          inmateNumber: 'INM-889',
          gender: 'MALE',
          state: 'Maharashtra',
          district: 'Pune'
        }
      });
      expect(mockPrisma.case.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firNumber: '202/2026',
            policeStation: 'Shivajinagar',
            district: 'Pune'
          })
        })
      );
      expect(mockPrisma.offense.createMany).toHaveBeenCalledWith({
        data: [
          {
            caseId: 'case-uuid-1',
            code: 'BNS',
            section: '103',
            title: 'Murder',
            maxMonths: 240,
            isLife: true,
            isDeath: true,
            isBailable: false
          }
        ]
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-admin-1',
          action: 'CREATE_CASE',
          entityType: 'Case'
        })
      });
      expect(result).toBeDefined();
    });

    it('connects existing accused by accusedId without creating accused record', async () => {
      const payload = {
        accusedId: 'existing-accused-uuid',
        firNumber: '303/2026',
        policeStation: 'Cyber PS',
        district: 'Bengaluru',
        arrestDate: new Date('2026-03-01'),
        remandDate: new Date('2026-03-02'),
        offenses: [
          {
            code: 'IPC',
            section: '420',
            title: 'Cheating',
            isBailable: false
          }
        ]
      };

      await createCase('user-la-1', payload);

      expect(mockPrisma.accused.create).not.toHaveBeenCalled();
      expect(mockPrisma.case.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accusedId: 'existing-accused-uuid'
          })
        })
      );
    });

    it('connects existing accused when inmateNumber matches existing database record', async () => {
      mockPrisma.accused.findUnique.mockResolvedValueOnce({
        id: 'matched-inmate-accused-id',
        inmateNumber: 'INM-EXISTING-99'
      });

      const payload = {
        accused: {
          name: 'Found Person',
          inmateNumber: 'INM-EXISTING-99'
        },
        firNumber: '404/2026',
        policeStation: 'North PS',
        district: 'Delhi',
        arrestDate: new Date('2026-03-10'),
        remandDate: new Date('2026-03-11'),
        offenses: [
          {
            code: 'BNS',
            section: '303',
            title: 'Theft',
            isBailable: true
          }
        ]
      };

      await createCase('user-adv-1', payload);

      expect(mockPrisma.accused.findUnique).toHaveBeenCalledWith({
        where: { inmateNumber: 'INM-EXISTING-99' }
      });
      expect(mockPrisma.accused.create).not.toHaveBeenCalled();
      expect(mockPrisma.case.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accusedId: 'matched-inmate-accused-id'
          })
        })
      );
    });
  });

  describe('recordAssessment', () => {
    it('validates assessment data, saves record, and creates audit log', async () => {
      const assessmentPayload = {
        isBailable: false,
        sec479Eligible: true,
        sec479Fraction: '1/3',
        defaultBailEligible: false,
        summary: {
          eligible: true,
          reason: 'Completed 1/3 statutory sentence as first-time offender'
        }
      };

      const result = await recordAssessment('user-adv-1', 'case-uuid-1', assessmentPayload);

      expect(mockPrisma.assessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: 'case-uuid-1',
          userId: 'user-adv-1',
          isBailable: false,
          sec479Eligible: true,
          sec479Fraction: '1/3',
          defaultBailEligible: false
        })
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-adv-1',
          action: 'RECORD_ASSESSMENT',
          entityType: 'Assessment',
          entityId: 'assessment-uuid-1'
        })
      });
      expect(result).toHaveProperty('id', 'assessment-uuid-1');
    });

    it('rejects when caseId is invalid or missing', async () => {
      const payload = {
        isBailable: true,
        sec479Eligible: false,
        defaultBailEligible: false
      };
      await expect(recordAssessment('user-1', '', payload)).rejects.toThrow('Valid caseId is required');
      await expect(recordAssessment('user-1', null, payload)).rejects.toThrow('Valid caseId is required');
    });

    it('rejects when required boolean fields are missing in assessmentData', async () => {
      await expect(
        recordAssessment('user-1', 'case-1', {
          isBailable: true
        })
      ).rejects.toThrow(ZodError);
    });
  });

  describe('getCaseById', () => {
    it('retrieves case with accused, offenses, and assessments', async () => {
      const caseRecord = await getCaseById('case-uuid-1');

      expect(mockPrisma.case.findUnique).toHaveBeenCalledWith({
        where: { id: 'case-uuid-1' },
        include: {
          accused: true,
          offenses: true,
          assessments: {
            orderBy: { checkedAt: 'desc' }
          }
        }
      });
      expect(caseRecord).toHaveProperty('id', 'case-uuid-1');
      expect(caseRecord).toHaveProperty('accused');
      expect(caseRecord).toHaveProperty('offenses');
    });

    it('throws error when caseId is missing or empty', async () => {
      await expect(getCaseById('')).rejects.toThrow('Valid caseId is required');
      await expect(getCaseById(null)).rejects.toThrow('Valid caseId is required');
    });
  });
});
