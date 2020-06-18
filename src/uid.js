/* eslint no-bitwise: "off" */
/* eslint no-plusplus: "off" */

// https://github.com/lukeed/uid/blob/master/src/index.js
let IDX = 36;
let HEX = '';

while (IDX--) {
  HEX += IDX.toString(36);
}

const uid = (len) => {
  let str = '';
  let num = len || 11;

  while (num--) {
    str += HEX[(Math.random() * 36) | 0];
  }

  return str;
};

export default uid;
