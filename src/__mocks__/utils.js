const actualUtils = jest.requireActual('../utils');

let idx = 0;

const uid = () => {
  const id = `mock-test-id-${idx}`;
  idx += 1;
  return id;
};

const utils = {
  ...actualUtils,
  uid: jest.fn().mockImplementation(uid)
};

module.exports = utils;
