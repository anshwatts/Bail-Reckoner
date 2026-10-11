# Bail Reconer

Core legal calculation module for undertrial bail eligibility under Indian criminal law (Bharatiya Nagarik Suraksha Sanhita, 2023 and Code of Criminal Procedure, 1973).

## Features

- **Section 479 BNSS (Undertrial detention relief)**:
  - First-time offenders: eligible after completing 1/3 of the maximum statutory penalty.
  - Repeat offenders: eligible after completing 1/2 of the maximum statutory penalty.
  - Exclusions: offenses punishable with death or life imprisonment are disqualified.
  - Multi-case and multi-offense flags.
  - Maximum statutory detention limit detection.
- **Section 187 BNSS / Section 167(2) CrPC (Default bail)**:
  - 90-day statutory period for offenses punishable with death, life imprisonment, or 10+ years imprisonment (accrues on day 91).
  - 60-day statutory period for all other offenses (accrues on day 61).
  - Tracks chargesheet filing status.
- **Bailable offenses right**:
  - Automatically identifies whether bail is available as a matter of right when all offenses in the case are bailable.
- **Strict Validation & Calendar Precision**:
  - Full schema validation with Zod.
  - Calendar math using `date-fns` (leap years, variable month lengths).

## Installation

```bash
npm install
```

## Running Tests

```bash
npm test
```
