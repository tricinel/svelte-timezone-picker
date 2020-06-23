import timezones from './__mocks__/timezones';

const ungroupedZones = Object.values(timezones).reduce(
  (values, zone) => ({ ...values, ...zone }),
  {}
);

const zoneLabels = Object.keys(ungroupedZones);

const getZoneLabelAtIndex = (index) => zoneLabels[index];

const getTestRegex = (string) => new RegExp(string, 'i');

const getTotalZones = () => zoneLabels.length;

const filterZones = (search) =>
  zoneLabels.filter((zoneLabel) =>
    zoneLabel.toLowerCase().includes(search.toLowerCase())
  );

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
  filterZones,
  keyArrowDown,
  keyArrowUp,
  keyEnter,
  keyEscape
};
