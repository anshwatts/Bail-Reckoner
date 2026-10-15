export function formatCourtHeading(courtName, district, state) {
  const court = (courtName || 'COURT OF CHIEF JUDICIAL MAGISTRATE').trim().toUpperCase();
  const dist = (district || '').trim().toUpperCase();
  const st = (state || '').trim().toUpperCase();
  const location = [dist, st].filter(Boolean).join(', ');
  return `IN THE ${court}${location ? ` AT ${location}` : ''}`;
}

export function formatMemoOfParties(accusedName, parentName, state) {
  const accused = (accusedName || 'ACCUSED').trim();
  const parent = parentName ? ` S/o / D/o / W/o ${parentName.trim()}` : '';
  const prosecutionState = (state || 'State').trim();
  return `State of ${prosecutionState}\n...Prosecution / Respondent\n\nVERSUS\n\n${accused}${parent}\n...Applicant / Accused (In Judicial Custody)`;
}

export function formatStatutoryGrounds(caseData = {}, eligibilityResult = {}, matchedPrecedents = []) {
  const grounds = [];
  let index = 1;

  const daysServed =
    eligibilityResult?.section479?.daysServed ??
    eligibilityResult?.defaultBail?.daysServed ??
    0;

  grounds.push(
    `${index++}. That the Applicant / Accused has undergone continuous custody and detention for a period of ${daysServed} days as an undertrial prisoner in connection with the subject proceedings.`
  );

  if (eligibilityResult?.section479?.eligible) {
    const fraction = eligibilityResult.section479.thresholdFraction || '1/3';
    const months = eligibilityResult.section479.thresholdMonths ?? 0;
    grounds.push(
      `${index++}. That under Section 479 of the Bharatiya Nagarik Suraksha Sanhita, 2023, the statutory detention threshold is ${fraction} (${fraction === '1/3' ? '33.3%' : '50%'}) of the maximum statutory punishment, corresponding to ${months} months, and the Applicant is entitled as a matter of statutory right to be released on personal bond.`
    );
  } else if (eligibilityResult?.defaultBail?.eligible) {
    const period = eligibilityResult.defaultBail.statutoryPeriodDays || 60;
    const accrual = eligibilityResult.defaultBail.accrualDay || 61;
    grounds.push(
      `${index++}. That under Section 187 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (Section 167(2) of Code of Criminal Procedure, 1973), the statutory period of ${period} days for completing the investigation expired without filing of the chargesheet, and an indefeasible right to default bail accrued in favor of the Applicant on day ${accrual}.`
    );
  }

  const isFirstTime = Boolean(
    caseData?.isFirstTimeOffender ??
    caseData?.isFirstTime ??
    eligibilityResult?.section479?.isFirstTimeOffender ??
    true
  );
  if (isFirstTime) {
    grounds.push(
      `${index++}. That the Applicant is a first-time offender with clean antecedents, is not involved in any other criminal case, and has deep roots in the community.`
    );
  }

  for (const precedent of matchedPrecedents) {
    grounds.push(
      `${index++}. That in "${precedent.title}", ${precedent.citation}, the Hon'ble ${precedent.court} laid down the settled principle that: "${precedent.summary}"`
    );
  }

  grounds.push(
    `${index++}. That the Applicant undertakes to abide by all terms and conditions as may be imposed by this Hon'ble Court and will not tamper with evidence or influence witnesses.`
  );

  return grounds.join('\n\n');
}

export function formatPrayerClause(reliefType = 'regular statutory bail') {
  return `PRAYER

Wherefore, in the light of the facts and statutory grounds stated hereinabove, it is most respectfully prayed that this Hon'ble Court may graciously be pleased to:

a) Direct the release of the Applicant / Accused on ${reliefType} / personal bond in connection with the present case;
b) Impose such reasonable and non-onerous terms and conditions as this Hon'ble Court may deem fit and proper in the interest of justice;
c) Pass such other or further order(s) as this Hon'ble Court may deem fit and proper in the circumstances of the case.`;
}
