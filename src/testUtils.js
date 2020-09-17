import timezones from './__mocks__/timezones';
import { ungroup } from './utils';

const zoneLabels = Object.values(ungroup(timezones)).map((zone) => zone[0]);
const ungroupedZones = ungroup(timezones);

const getZoneLabelAtIndex = (index) => zoneLabels[index];

const getTestRegex = (string) => new RegExp(string, 'i');

const getTotalZones = () => zoneLabels.length;

const keyArrowDown = {
  key: 'ArrowDown',
  keyCode: 40,
  code: 'ArrowDown'
};

const keyArrowUp = {
  key: 'ArrowUp',
  keyCode: 38,
  code: 'ArrowUp'
};

const keyEnter = {
  key: 'Enter',
  keyCode: 13,
  code: 'Enter'
};

const keyEscape = {
  key: 'Escape',
  keyCode: 27,
  code: 'Escape'
};

const keyLetter = {
  key: 'h',
  keyCode: 72,
  code: 'KeyH'
};

export {
  getZoneLabelAtIndex,
  getTestRegex,
  getTotalZones,
  zoneLabels,
  keyArrowDown,
  keyArrowUp,
  keyEnter,
  keyEscape,
  keyLetter,
  ungroupedZones
};
