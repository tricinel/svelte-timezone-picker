import timezones from './__mocks__/timezones';
import { ungroupZones } from './utils';

const zoneLabels = Object.keys(ungroupZones(timezones));

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

export {
  getZoneLabelAtIndex,
  getTestRegex,
  getTotalZones,
  zoneLabels,
  keyArrowDown,
  keyArrowUp,
  keyEnter,
  keyEscape
};
