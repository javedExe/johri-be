export const pick = (obj, keys) =>
  keys.reduce((acc, k) => (obj && Object.prototype.hasOwnProperty.call(obj, k) ? (acc[k] = obj[k], acc) : acc), {});

export const omit = (obj, keys) =>
  Object.keys(obj).reduce((acc, k) => (!keys.includes(k) && (acc[k] = obj[k]), acc), {});

export const randomString = (len = 16) =>
  [...Array(len)].map(() => Math.random().toString(36)[2]).join('');
