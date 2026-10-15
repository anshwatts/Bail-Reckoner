import { describe, it, expect } from 'vitest';
import { hasRole, canEditCase, canViewAuditLogs } from '../src/permissions.js';

describe('permissions', () => {
  describe('hasRole', () => {
    it('returns true when user role matches a single string role', () => {
      const user = { id: 'u1', role: 'ADMIN' };
      expect(hasRole(user, 'ADMIN')).toBe(true);
    });

    it('returns false when user role does not match string role', () => {
      const user = { id: 'u1', role: 'ADVOCATE' };
      expect(hasRole(user, 'ADMIN')).toBe(false);
    });

    it('returns true when user role is in allowed roles array', () => {
      const user = { id: 'u2', role: 'LEGAL_AID' };
      expect(hasRole(user, ['ADVOCATE', 'LEGAL_AID'])).toBe(true);
    });

    it('returns false when user role is not in allowed roles array', () => {
      const user = { id: 'u3', role: 'ADVOCATE' };
      expect(hasRole(user, ['ADMIN', 'LEGAL_AID'])).toBe(false);
    });

    it('returns false for null or undefined user', () => {
      expect(hasRole(null, ['ADMIN'])).toBe(false);
      expect(hasRole(undefined, ['ADMIN'])).toBe(false);
    });

    it('returns false when user has no role property', () => {
      expect(hasRole({ id: 'u4' }, ['ADMIN'])).toBe(false);
    });

    it('returns false when allowedRoles is null, undefined, or empty', () => {
      const user = { id: 'u5', role: 'ADMIN' };
      expect(hasRole(user, null)).toBe(false);
      expect(hasRole(user, undefined)).toBe(false);
      expect(hasRole(user, [])).toBe(false);
    });
  });

  describe('canEditCase', () => {
    it('allows ADMIN to edit any case record regardless of ownership', () => {
      const admin = { id: 'admin-1', role: 'ADMIN' };
      const caseRecord = { id: 'case-1', userId: 'user-2' };
      expect(canEditCase(admin, caseRecord)).toBe(true);
    });

    it('allows ADMIN to edit case without userId property', () => {
      const admin = { id: 'admin-1', role: 'ADMIN' };
      const caseRecord = { id: 'case-1' };
      expect(canEditCase(admin, caseRecord)).toBe(true);
    });

    it('allows ADVOCATE to edit case with no specific userId set', () => {
      const advocate = { id: 'adv-1', role: 'ADVOCATE' };
      const caseRecord = { id: 'case-1' };
      expect(canEditCase(advocate, caseRecord)).toBe(true);
    });

    it('allows ADVOCATE to edit their own case', () => {
      const advocate = { id: 'adv-1', role: 'ADVOCATE' };
      const caseRecord = { id: 'case-1', userId: 'adv-1' };
      expect(canEditCase(advocate, caseRecord)).toBe(true);
    });

    it('disallows ADVOCATE from editing a case owned by another user', () => {
      const advocate = { id: 'adv-1', role: 'ADVOCATE' };
      const caseRecord = { id: 'case-1', userId: 'adv-2' };
      expect(canEditCase(advocate, caseRecord)).toBe(false);
    });

    it('allows LEGAL_AID to edit case with matching userId or unassigned', () => {
      const legalAid = { id: 'la-1', role: 'LEGAL_AID' };
      expect(canEditCase(legalAid, { id: 'case-1' })).toBe(true);
      expect(canEditCase(legalAid, { id: 'case-1', userId: 'la-1' })).toBe(true);
    });

    it('disallows LEGAL_AID from editing another users assigned case', () => {
      const legalAid = { id: 'la-1', role: 'LEGAL_AID' };
      const caseRecord = { id: 'case-1', userId: 'la-2' };
      expect(canEditCase(legalAid, caseRecord)).toBe(false);
    });

    it('disallows unauthorized roles from editing cases', () => {
      const user = { id: 'u-1', role: 'VIEWER' };
      const caseRecord = { id: 'case-1' };
      expect(canEditCase(user, caseRecord)).toBe(false);
    });

    it('returns false when user or caseRecord is null or undefined', () => {
      const admin = { id: 'admin-1', role: 'ADMIN' };
      const caseRecord = { id: 'case-1' };
      expect(canEditCase(null, caseRecord)).toBe(false);
      expect(canEditCase(admin, null)).toBe(false);
      expect(canEditCase(null, null)).toBe(false);
    });
  });

  describe('canViewAuditLogs', () => {
    it('returns true for ADMIN', () => {
      const admin = { id: 'admin-1', role: 'ADMIN' };
      expect(canViewAuditLogs(admin)).toBe(true);
    });

    it('returns false for ADVOCATE', () => {
      const advocate = { id: 'adv-1', role: 'ADVOCATE' };
      expect(canViewAuditLogs(advocate)).toBe(false);
    });

    it('returns false for LEGAL_AID', () => {
      const legalAid = { id: 'la-1', role: 'LEGAL_AID' };
      expect(canViewAuditLogs(legalAid)).toBe(false);
    });

    it('returns false for unknown roles, null, or undefined users', () => {
      expect(canViewAuditLogs({ id: 'u-1', role: 'GUEST' })).toBe(false);
      expect(canViewAuditLogs(null)).toBe(false);
      expect(canViewAuditLogs(undefined)).toBe(false);
    });
  });
});
