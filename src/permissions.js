export function hasRole(user, allowedRoles) {
  if (!user || !user.role) {
    return false;
  }
  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(user.role);
  }
  if (typeof allowedRoles === 'string') {
    return user.role === allowedRoles;
  }
  return false;
}

export function canEditCase(user, caseRecord) {
  if (!user || !caseRecord) {
    return false;
  }
  if (!hasRole(user, ['ADMIN', 'ADVOCATE', 'LEGAL_AID'])) {
    return false;
  }
  if (user.role === 'ADMIN') {
    return true;
  }
  if (caseRecord.userId && user.id) {
    return caseRecord.userId === user.id;
  }
  return true;
}

export function canViewAuditLogs(user) {
  return hasRole(user, 'ADMIN');
}
