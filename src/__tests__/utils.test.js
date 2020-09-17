import { filter, pick, ungroup } from '../utils';
import timezones from '../__mocks__/timezones';

test('It handles incorrect pick options properly', () => {
  expect(pick(timezones, [])).toEqual({});
  expect(pick(timezones, ['Non existent option'])).toEqual({});
});

test('Should filter the list of timezones to only pick the ones provided by the user', () => {
  const ungroupedZones = ungroup(timezones);

  expect(pick(ungroupedZones, ['Australia/Sydney'])).toEqual({
    'Australia/Sydney': ['Sydney', '+10:00', '+11:00']
  });

  expect(
    pick(ungroupedZones, [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Europe/Berlin'
    ])
  ).toEqual({
    'Australia/Sydney': ['Sydney', '+10:00', '+11:00'],
    'Australia/Melbourne': ['Melbourne', '+10:00', '+11:00'],
    'Europe/Berlin': ['Berlin', '+01:00', '+02:00']
  });

  expect(
    pick(ungroupedZones, [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Europe/Berlin',
      'Europe/Dublin',
      'Europe/London',
      'Europe/Lisbon',
      'UTC'
    ])
  ).toEqual(ungroupedZones);
});

test('Should filter the list of timezones based on a search string', () => {
  const ungroupedZones = ungroup(timezones);

  expect(filter('s', ungroupedZones)).toHaveLength(2);
  expect(filter('mel', ungroupedZones)).toEqual(['Australia/Melbourne']);
});
