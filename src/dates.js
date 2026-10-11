import { addMonths, addDays, differenceInCalendarDays, isAfter, isBefore, isEqual } from 'date-fns';

export function calculateDaysServed(startDate, endDate) {
  return differenceInCalendarDays(endDate, startDate);
}

export function calculateThresholdDate(startDate, maxSentenceMonths, fraction) {
  const targetMonths = maxSentenceMonths * fraction;
  const wholeMonths = Math.floor(targetMonths);
  const remainderFraction = targetMonths - wholeMonths;
  let resultDate = addMonths(startDate, wholeMonths);
  if (remainderFraction > 0) {
    const nextMonthDate = addMonths(resultDate, 1);
    const daysInMonth = differenceInCalendarDays(nextMonthDate, resultDate);
    const extraDays = Math.ceil(remainderFraction * daysInMonth);
    resultDate = addDays(resultDate, extraDays);
  }
  return resultDate;
}

export function calculateMaxSentenceDate(startDate, maxSentenceMonths) {
  return addMonths(startDate, maxSentenceMonths);
}

export function calculateDefaultBailDate(startDate, statutoryPeriodDays) {
  return addDays(startDate, statutoryPeriodDays + 1);
}

export function isDateOnOrAfter(firstDate, secondDate) {
  return isEqual(firstDate, secondDate) || isAfter(firstDate, secondDate);
}

export function isDateBefore(firstDate, secondDate) {
  return isBefore(firstDate, secondDate);
}
