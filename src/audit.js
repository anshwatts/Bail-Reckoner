import prisma from './db.js';

export async function createAuditEntry(userId, action, entityType, entityId, details = {}, client = prisma) {
  const db = client || prisma;
  return await db.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      entityType,
      entityId: String(entityId),
      details: details ?? {}
    }
  });
}
