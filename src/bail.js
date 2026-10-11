import { caseRecordSchema, bailStatusResultSchema } from './schemas.js';
import {
  calculateDaysServed,
  calculateThresholdDate,
  calculateMaxSentenceDate,
  calculateDefaultBailDate,
  isDateOnOrAfter
} from './dates.js';

export function checkBailEligibility(caseRecordInput) {
  const record = caseRecordSchema.parse(caseRecordInput);
  const {
    offenses,
    arrestDate,
    calculationDate,
    isFirstTimeOffender,
    hasMultipleCases,
    chargesheetFiled,
    chargesheetDate
  } = record;

  const daysServed = calculateDaysServed(arrestDate, calculationDate);

  const totalOffenses = offenses.length;
  const bailableOffensesCount = offenses.filter((offense) => offense.isBailable).length;
  const nonBailableOffensesCount = totalOffenses - bailableOffensesCount;
  const isBailableAsOfRight = totalOffenses > 0 && nonBailableOffensesCount === 0;
  const bailableDetails = isBailableAsOfRight
    ? 'All offenses are bailable; bail is available as a matter of right'
    : `Case contains ${nonBailableOffensesCount} non-bailable offense(s); bail is not available as a matter of right`;

  const bailable = {
    isBailableAsOfRight,
    totalOffenses,
    bailableOffensesCount,
    nonBailableOffensesCount,
    details: bailableDetails
  };

  const carriesCapitalOrLifeOffense = offenses.some(
    (offense) => offense.carriesDeathPenalty || offense.carriesLifeImprisonment
  );
  const hasMultipleOffenses = offenses.length > 1;
  const thresholdFraction = isFirstTimeOffender ? '1/3' : '1/2';
  const fractionValue = isFirstTimeOffender ? 1 / 3 : 1 / 2;

  let section479;
  if (carriesCapitalOrLifeOffense) {
    const maxSentenceMonths = Math.max(...offenses.map((offense) => offense.maxSentenceMonths), 0);
    section479 = {
      eligible: false,
      isDisqualified: true,
      disqualificationReason: 'Offense carrying death penalty or life imprisonment is excluded from Section 479 relief',
      isFirstTimeOffender,
      thresholdFraction,
      thresholdMonths: 0,
      thresholdDate: null,
      daysServed,
      maxSentenceMonths,
      maxSentenceDate: null,
      exceedsMaxSentence: false,
      hasMultipleOffenses,
      hasMultipleCases,
      details: 'Disqualified from Section 479 relief because offense carries death penalty or life imprisonment'
    };
  } else {
    const maxSentenceMonths = Math.max(...offenses.map((offense) => offense.maxSentenceMonths));
    const thresholdMonths = maxSentenceMonths * fractionValue;
    const thresholdDate = calculateThresholdDate(arrestDate, maxSentenceMonths, fractionValue);
    const maxSentenceDate = calculateMaxSentenceDate(arrestDate, maxSentenceMonths);
    const isThresholdMet = isDateOnOrAfter(calculationDate, thresholdDate);
    const exceedsMaxSentence = maxSentenceMonths > 0 && isDateOnOrAfter(calculationDate, maxSentenceDate);
    const eligible = isThresholdMet;

    let details = `Not eligible under Section 479 BNSS (${thresholdFraction} threshold not met)`;
    if (exceedsMaxSentence) {
      details = 'Detention exceeds maximum statutory sentence; undertrial must be released';
    } else if (eligible) {
      details = `Eligible under Section 479 BNSS (${thresholdFraction} threshold met)`;
    }

    section479 = {
      eligible,
      isDisqualified: false,
      disqualificationReason: null,
      isFirstTimeOffender,
      thresholdFraction,
      thresholdMonths,
      thresholdDate,
      daysServed,
      maxSentenceMonths,
      maxSentenceDate,
      exceedsMaxSentence,
      hasMultipleOffenses,
      hasMultipleCases,
      details
    };
  }

  const carriesTenYearsOrMore = offenses.some((offense) => offense.maxSentenceMonths >= 120);
  const statutoryPeriodDays = (carriesCapitalOrLifeOffense || carriesTenYearsOrMore) ? 90 : 60;
  const accrualDay = statutoryPeriodDays === 90 ? 91 : 61;
  const accrualDate = calculateDefaultBailDate(arrestDate, statutoryPeriodDays);

  const isChargesheetFiledBeforeCalculation = Boolean(
    chargesheetFiled && (!chargesheetDate || isDateOnOrAfter(calculationDate, chargesheetDate))
  );

  const isDefaultBailTriggered = !isChargesheetFiledBeforeCalculation && daysServed >= accrualDay;

  let defaultBailDetails = `Default bail has not accrued; ${daysServed} of ${statutoryPeriodDays} days served`;
  if (isChargesheetFiledBeforeCalculation) {
    defaultBailDetails = 'Chargesheet filed; default bail not available';
  } else if (isDefaultBailTriggered) {
    defaultBailDetails = `Default bail accrued on day ${accrualDay} as chargesheet was not filed within ${statutoryPeriodDays} days`;
  }

  const defaultBail = {
    eligible: isDefaultBailTriggered,
    statutoryPeriodDays,
    accrualDay,
    accrualDate,
    daysServed,
    chargesheetFiled: isChargesheetFiledBeforeCalculation,
    chargesheetDate: chargesheetDate ?? null,
    details: defaultBailDetails
  };

  const grounds = [];
  if (bailable.isBailableAsOfRight) {
    grounds.push('bailable_as_of_right');
  }
  if (section479.eligible) {
    grounds.push('section_479');
  }
  if (defaultBail.eligible) {
    grounds.push('default_bail');
  }
  if (section479.exceedsMaxSentence) {
    grounds.push('exceeded_max_sentence');
  }

  const isEligibleForBail = grounds.length > 0;

  const flags = {
    hasMultipleOffenses,
    hasMultipleCases,
    exceedsMaxSentence: section479.exceedsMaxSentence,
    carriesCapitalOrLifeOffense
  };

  const result = {
    isEligibleForBail,
    grounds,
    bailable,
    section479,
    defaultBail,
    flags
  };

  return bailStatusResultSchema.parse(result);
}
