import { precedentsData } from './data/precedentsData.js';

export function getPrecedentsByTag(tag) {
  if (!tag || typeof tag !== 'string') {
    return [];
  }
  const targetTag = tag.trim().toUpperCase();
  return precedentsData.filter((item) =>
    item.tags.some((t) => t.toUpperCase() === targetTag)
  );
}

export function selectPrecedentsForCase(eligibilityResult = {}, caseData = {}) {
  const selected = [];

  const isSec479Eligible = Boolean(
    eligibilityResult?.section479?.eligible ||
    eligibilityResult?.sec479BNSS?.eligible
  );
  if (isSec479Eligible) {
    selected.push(...getPrecedentsByTag('SEC_479_BNSS'));
  }

  const isDefaultBailEligible = Boolean(
    eligibilityResult?.defaultBail?.eligible
  );
  if (isDefaultBailEligible) {
    selected.push(...getPrecedentsByTag('DEFAULT_BAIL'));
  }

  const isFirstTime = Boolean(
    caseData?.isFirstTimeOffender ??
    caseData?.isFirstTime ??
    eligibilityResult?.section479?.isFirstTimeOffender ??
    false
  );
  const isBailable = Boolean(
    eligibilityResult?.bailable?.isBailableAsOfRight ??
    false
  );
  if (isFirstTime || isBailable) {
    selected.push(...getPrecedentsByTag('SPEEDY_TRIAL'));
  }

  const daysServed =
    eligibilityResult?.section479?.daysServed ??
    eligibilityResult?.defaultBail?.daysServed ??
    0;
  const isIndigent = Boolean(caseData?.isIndigent || caseData?.indigent);
  const isProlonged = Boolean(daysServed >= 180 || caseData?.prolongedCustody);

  if (isIndigent || isProlonged) {
    selected.push(...getPrecedentsByTag('INDIGENT_SURETY'));
  }

  const unique = [];
  const seenIds = new Set();
  for (const item of selected) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      unique.push(item);
    }
  }

  return unique;
}
