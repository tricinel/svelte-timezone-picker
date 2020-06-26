import { pickZones } from '../utils';
import timezones from '../__mocks__/timezones';

test('It handles incorrect pick options properly', () => {
  expect(pickZones(timezones, [])).toEqual({});
  expect(pickZones(timezones, ['Non existent option'])).toEqual({});
});

test('Should filter the list of timezones to only pick the ones provided by the user', () => {
  expect(pickZones(timezones, ['Australia/Sydney'])).toEqual({
    Australia: {
      Sydney: 'Australia/Sydney'
    }
  });

  expect(
    pickZones(timezones, [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Europe/Berlin'
    ])
  ).toEqual({
    Australia: {
      Sydney: 'Australia/Sydney',
      Melbourne: 'Australia/Melbourne'
    },
    Europe: {
      'Central European Time': 'Europe/Berlin'
    }
  });

  expect(
    pickZones(timezones, [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Europe/Berlin',
      'Europe/Dublin',
      'Europe/London',
      'Europe/Lisbon',
      'UTC'
    ])
  ).toEqual(timezones);
});
