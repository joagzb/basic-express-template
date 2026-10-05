import {CommonValidator} from '../application/shared/validators/common.validator';

describe('CommonValidator', () => {
  const validator = new CommonValidator();

  test('accepts only real calendar dates in the existing YYYY-MM-DD format', () => {
    expect(validator.isDate('2000-02-29')).toBe(true);
    expect(validator.isDate('2001-02-29')).toBe(false);
    expect(validator.isDate('2000-2-29')).toBe(false);
    expect(validator.isDate('not-a-date')).toBe(false);
  });

  test('validates email addresses with the emailregex.com JavaScript pattern', () => {
    expect(validator.isEmail('test.name+tag@example.co.uk')).toBe(true);
    expect(validator.isEmail('"quoted"@example.com')).toBe(true);
    expect(validator.isEmail('test@example.c')).toBe(false);
    expect(validator.isEmail('test..name@example.com')).toBe(false);
    expect(validator.isEmail('test @example.com')).toBe(false);
  });
});
