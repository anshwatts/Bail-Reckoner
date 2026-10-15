import { z } from 'zod';
import { selectPrecedentsForCase } from './precedents.js';
import {
  formatCourtHeading,
  formatMemoOfParties,
  formatStatutoryGrounds,
  formatPrayerClause
} from './templates.js';

export const petitionCaseSchema = z
  .object({
    firNumber: z.string().trim().min(1),
    policeStation: z.string().trim().min(1).default('Local Police Station'),
    district: z.string().trim().min(1).default('District'),
    state: z.string().trim().default('State'),
    accusedName: z.string().trim().min(1).optional(),
    accused: z.object({ name: z.string().trim().min(1) }).optional(),
    parentName: z.string().trim().optional(),
    arrestDate: z.coerce.date().optional(),
    remandDate: z.coerce.date().optional(),
    offenses: z.array(z.any()).default([]),
    isFirstTimeOffender: z.boolean().default(true),
    isFirstTime: z.boolean().optional(),
    isIndigent: z.boolean().default(false),
    indigent: z.boolean().optional()
  })
  .refine((data) => Boolean(data.accusedName || data.accused?.name), {
    message: 'Accused name must be provided',
    path: ['accusedName']
  });

export const petitionEligibilitySchema = z.object({
  isEligibleForBail: z.boolean(),
  section479: z
    .object({
      eligible: z.boolean(),
      thresholdFraction: z.string().optional(),
      thresholdMonths: z.number().optional(),
      daysServed: z.number().nonnegative().optional(),
      isFirstTimeOffender: z.boolean().optional()
    })
    .optional(),
  defaultBail: z
    .object({
      eligible: z.boolean(),
      statutoryPeriodDays: z.number().optional(),
      accrualDay: z.number().optional(),
      daysServed: z.number().nonnegative().optional()
    })
    .optional(),
  bailable: z
    .object({
      isBailableAsOfRight: z.boolean().optional()
    })
    .optional(),
  grounds: z.array(z.string()).optional()
});

export function createBailPetition(caseData, eligibilityResult, courtDetails = {}, options = {}) {
  const validCase = petitionCaseSchema.parse(caseData);
  const validEligibility = petitionEligibilitySchema.parse(eligibilityResult);

  const matchedPrecedents = selectPrecedentsForCase(validEligibility, validCase);
  const citationsUsed = matchedPrecedents.map((p) => p.citation);

  const accusedName = validCase.accusedName || validCase.accused?.name;
  const parentName = courtDetails.parentName || validCase.parentName;
  const district = courtDetails.district || validCase.district;
  const state = courtDetails.state || validCase.state;
  const courtName = courtDetails.courtName || 'COURT OF CHIEF JUDICIAL MAGISTRATE';

  let sectionsInvoked = 'Under Section 480 of the Bharatiya Nagarik Suraksha Sanhita, 2023';
  let reliefType = 'regular bail';

  if (validEligibility.section479?.eligible) {
    sectionsInvoked =
      'Under Section 479 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (Section 436A of Code of Criminal Procedure, 1973)';
    reliefType = 'statutory bail on personal bond under Section 479 BNSS';
  } else if (validEligibility.defaultBail?.eligible) {
    sectionsInvoked =
      'Under Section 187 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (Section 167(2) of Code of Criminal Procedure, 1973)';
    reliefType = 'default statutory bail under Section 187 BNSS';
  } else if (validEligibility.bailable?.isBailableAsOfRight) {
    sectionsInvoked =
      'Under Section 478 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (Section 436 of Code of Criminal Procedure, 1973)';
    reliefType = 'bailable offense bail as a matter of right';
  }

  const title = `APPLICATION FOR REGULAR BAIL ${sectionsInvoked.toUpperCase()}`;

  const headingText = formatCourtHeading(courtName, district, state);
  const partiesText = formatMemoOfParties(accusedName, parentName, state);

  const offensesList = (validCase.offenses || [])
    .map((o) => (typeof o === 'string' ? o : `${o.section || ''} ${o.code || o.act || ''}`.trim()))
    .filter(Boolean)
    .join(', ');

  const caseBanner = `IN THE MATTER OF:
FIR NO.: ${validCase.firNumber}
POLICE STATION: ${validCase.policeStation}
DISTRICT: ${validCase.district}
UNDER SECTION(S): ${offensesList || 'As per record'}`;

  let factsText = `BRIEF FACTS:

1. That the present proceedings arise out of FIR No. ${validCase.firNumber} registered at Police Station ${validCase.policeStation}, District ${validCase.district}.
2. That the Applicant / Accused was taken into custody on or about ${validCase.arrestDate ? new Date(validCase.arrestDate).toISOString().split('T')[0] : 'the date of arrest'} and has been languishing in jail since then.
3. That the investigation against the Applicant has been conducted, and the Applicant has cooperated fully with the investigating agency.`;

  if (typeof options.narrativeGenerator === 'function') {
    const customNarrative = options.narrativeGenerator(validCase, validEligibility);
    if (customNarrative && typeof customNarrative === 'string') {
      factsText = `BRIEF FACTS:\n\n${customNarrative.trim()}`;
    }
  }

  const groundsText = `GROUNDS FOR BAIL:\n\n${formatStatutoryGrounds(validCase, validEligibility, matchedPrecedents)}`;
  const prayerText = formatPrayerClause(reliefType);

  const verificationText = `APPLICANT / ACCUSED
THROUGH COUNSEL

PLACE: ${district}
DATED: ${new Date().toISOString().split('T')[0]}`;

  const fullText = [
    headingText,
    '\n',
    caseBanner,
    '\n',
    partiesText,
    '\n',
    title,
    '\n',
    factsText,
    '\n',
    groundsText,
    '\n',
    prayerText,
    '\n',
    verificationText
  ].join('\n');

  return {
    title,
    sectionsInvoked,
    fullText,
    citationsUsed
  };
}
