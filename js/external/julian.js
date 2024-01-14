var DAY = 86400000;
var HALF_DAY = DAY / 2;
var UNIX_EPOCH_JULIAN_DATE = 2440587.5;
var UNIX_EPOCH_JULIAN_DAY = 2440587;

export function toJd(date) {
  return (toJulianDay(date) + (toMillisecondsInJulianDay(date) / DAY)).toFixed(6);
};

export function convertToDate(julian) {
  return new Date((Number(julian) - UNIX_EPOCH_JULIAN_DATE) * DAY);
};

export function toJulianDay(date) {
  return ~~((+date + HALF_DAY) / DAY) + UNIX_EPOCH_JULIAN_DAY;
};

export function toMillisecondsInJulianDay(date) {
  return (+date + HALF_DAY) % DAY;
};

export function fromJulianDayAndMilliseconds(day, ms) {
  return (day - UNIX_EPOCH_JULIAN_DATE) * DAY + ms;
};
