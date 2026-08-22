import { describe, expect, it } from 'vitest';

import { addOnePeriod, daysUntil, nextRenewalDate } from '../utils/renewal.js';

// Turns a date into text like "2030-01-15" so it is easy to compare
const day = (date) => date.toISOString().slice(0, 10);

describe('addOnePeriod', () => {
    it('adds one day for daily', () => {
        expect(day(addOnePeriod(new Date('2030-01-15'), 'daily'))).toBe('2030-01-16');
    });

    it('adds seven days for weekly', () => {
        expect(day(addOnePeriod(new Date('2030-01-28'), 'weekly'))).toBe('2030-02-04');
    });

    it('adds one month for monthly', () => {
        expect(day(addOnePeriod(new Date('2030-01-15'), 'monthly'))).toBe('2030-02-15');
    });

    it('adds one year for yearly', () => {
        expect(day(addOnePeriod(new Date('2030-01-15'), 'yearly'))).toBe('2031-01-15');
    });

    it('rolls over into the next year', () => {
        expect(day(addOnePeriod(new Date('2030-12-15'), 'monthly'))).toBe('2031-01-15');
    });

    it('uses the last day of a shorter month', () => {
        expect(day(addOnePeriod(new Date('2030-01-31'), 'monthly'))).toBe('2030-02-28');
    });

    it('handles 29 February when the next year is not a leap year', () => {
        expect(day(addOnePeriod(new Date('2028-02-29'), 'yearly'))).toBe('2029-02-28');
    });

    it('does not change the date it was given', () => {
        const original = new Date('2030-01-15');

        addOnePeriod(original, 'monthly');

        expect(day(original)).toBe('2030-01-15');
    });

    it('throws for a frequency it does not know', () => {
        expect(() => addOnePeriod(new Date('2030-01-15'), 'hourly')).toThrow('Unknown frequency: hourly');
    });
});

describe('daysUntil', () => {
    const today = new Date('2030-01-15T09:00:00.000Z');

    it('is 0 for any time today', () => {
        expect(daysUntil(new Date('2030-01-15T00:00:00.000Z'), today)).toBe(0);
        expect(daysUntil(new Date('2030-01-15T23:59:00.000Z'), today)).toBe(0);
    });

    it('is 1 for tomorrow, even when it is only minutes away', () => {
        const lateToday = new Date('2030-01-15T23:55:00.000Z');

        expect(daysUntil(new Date('2030-01-16T00:05:00.000Z'), lateToday)).toBe(1);
    });

    it('counts days across the end of a month', () => {
        expect(daysUntil(new Date('2030-02-05T00:00:00.000Z'), today)).toBe(21);
    });

    it('is negative for a date that has passed', () => {
        expect(daysUntil(new Date('2030-01-12T18:00:00.000Z'), today)).toBe(-3);
    });
});

describe('nextRenewalDate', () => {
    it('is one period after a start date in the future', () => {
        expect(day(nextRenewalDate(new Date('2090-01-15'), 'monthly'))).toBe('2090-02-15');
    });

    it('skips ahead to the future when the start date is long ago', () => {
        const renewalDate = nextRenewalDate(new Date('2020-01-15'), 'monthly');

        expect(renewalDate > new Date()).toBe(true);
        expect(renewalDate.getUTCDate()).toBe(15);
    });

    it('is at most one period away', () => {
        const renewalDate = nextRenewalDate(new Date('2020-01-15'), 'weekly');
        const oneWeekFromNow = addOnePeriod(new Date(), 'weekly');

        expect(renewalDate <= oneWeekFromNow).toBe(true);
    });
});
