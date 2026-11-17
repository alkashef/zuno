// @ts-check
/**
 * @module domain/picker
 * The picker model (PCK-001 to PCK-003, PCK-005 to PCK-007, SET-005): the reference window from
 * midnight to midnight of the marker's date in the first place, one row of segments per place that
 * covers the window exactly, each place's local date and time at the marker, and moving the marker
 * to another day. It reads no clock (the caller passes the marker), makes no request, does not
 * format text (domain/format.js does) and chooses no colours (the view does).
 */
import { holidayOn } from "./holidays.js";
import { isWeekend } from "./weekends.js";
import { instantAtLocal, localDateTime, offsetChange } from "./zones.js";

/** The kinds of time in a picker row (PCK-003, PCK-005). */
export const DayKind = Object.freeze({
  working: "working",
  nonWorking: "nonWorking",
  dayOff: "dayOff",
});

const minutesPerHour = 60;
const msPerMinute = 60 * 1000;
const msPerDay = 24 * 60 * msPerMinute;

/** @typedef {typeof DayKind[keyof typeof DayKind]} DayKindName */
/** @typedef {import("./holidays.js").Holiday} Holiday */
/** @typedef {import("./places.js").Place} Place */
/** @typedef {import("./settings.js").Settings} Settings */
/** @typedef {import("./weekends.js").CalendarDate} CalendarDate */
/** @typedef {import("./zones.js").LocalDateTime} LocalDateTime */

/**
 * @typedef {object} Marker The chosen instant.
 * @property {number} instant UTC milliseconds.
 */

/**
 * @typedef {object} PickerWindow The instants every row covers (PCK-006).
 * @property {number} from UTC milliseconds, included.
 * @property {number} to UTC milliseconds, excluded.
 */

/**
 * @typedef {object} Segment A stretch of one row with one kind of time.
 * @property {number} from UTC milliseconds, included.
 * @property {number} to UTC milliseconds, excluded.
 * @property {DayKindName} kind
 */

/**
 * @typedef {object} PickerRow One place's row.
 * @property {string} placeId
 * @property {LocalDateTime} localDateTime The place's local date and time at the marker (PCK-002).
 * @property {Segment[]} segments In time order; they cover the window exactly.
 */

/**
 * @typedef {object} RowContext What every segment of one place's row needs.
 * @property {Place} place
 * @property {Holiday[]} holidays The holidays of the place's country.
 * @property {number} workStartMinutes
 * @property {number} workEndMinutes
 */

/**
 * @param {CalendarDate} date
 * @param {number} days May be negative.
 * @returns {CalendarDate} The date that many days later.
 */
function addDays(date, days) {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/**
 * @param {CalendarDate} date
 * @param {number} minutes Minutes after midnight; 1440 is the next midnight.
 * @returns {LocalDateTime} The wall-clock time that many minutes into the date.
 */
function atMinutes(date, minutes) {
  const { year, month, day } = date;
  return {
    year,
    month,
    day,
    hour: Math.floor(minutes / minutesPerHour),
    minute: minutes % minutesPerHour,
  };
}

/**
 * @param {CalendarDate} date
 * @returns {string} The date as `YYYY-MM-DD`.
 */
function isoDate(date) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).toISOString().slice(0, 10);
}

/**
 * @param {RowContext} row
 * @param {number} instant UTC milliseconds.
 * @returns {DayKindName} The kind of time in the place at that instant.
 */
function kindAt(row, instant) {
  const { place } = row;
  const local = localDateTime(instant, place.zone);
  const isDayOff =
    isWeekend(place.countryCode, local) ||
    holidayOn(row.holidays, place.region, isoDate(local)) !== null;
  if (isDayOff) return DayKind.dayOff;
  const minutes = local.hour * minutesPerHour + local.minute;
  const isWorking = minutes >= row.workStartMinutes && minutes < row.workEndMinutes;
  return isWorking ? DayKind.working : DayKind.nonWorking;
}

/**
 * @param {string} zone IANA time-zone name.
 * @param {PickerWindow} range
 * @returns {CalendarDate[]} Every local date of the zone that the window touches.
 */
function localDatesIn(zone, range) {
  const first = localDateTime(range.from, zone);
  const last = localDateTime(range.to - 1, zone);
  const span =
    Date.UTC(last.year, last.month - 1, last.day) -
    Date.UTC(first.year, first.month - 1, first.day);
  const count = Math.max(1, Math.round(span / msPerDay) + 1);
  return Array.from({ length: count }, (_, index) => addDays(first, index));
}

/**
 * The instants where the row's kind may change: local midnight, the start and end of working
 * hours, and a clock change.
 * @param {RowContext} row
 * @param {PickerWindow} range
 * @returns {number[]} Sorted instants, from the window's start to its end, without repeats.
 */
function cutsOf(row, range) {
  const { zone } = row.place;
  const thresholds = [0, row.workStartMinutes, row.workEndMinutes];
  const crossings = localDatesIn(zone, range).flatMap((date) =>
    thresholds.map((minutes) => instantAtLocal(zone, atMinutes(date, minutes))),
  );
  const change = offsetChange(zone, range.from, range.to) ?? range.from;
  const inside = [...crossings, change].filter((cut) => cut > range.from && cut < range.to);
  return [...new Set([range.from, ...inside, range.to])].sort((a, b) => a - b);
}

/**
 * @param {RowContext} row
 * @param {PickerWindow} range
 * @returns {Segment[]} The row's segments; neighbours always differ in kind.
 */
function rowSegments(row, range) {
  const cuts = cutsOf(row, range);
  /** @type {Segment[]} */
  const segments = [];
  for (let index = 1; index < cuts.length; index += 1) {
    const kind = kindAt(row, cuts[index - 1]);
    const last = segments.at(-1);
    if (last !== undefined && last.kind === kind) last.to = cuts[index];
    else segments.push({ from: cuts[index - 1], to: cuts[index], kind });
  }
  return segments;
}

/**
 * The window from midnight to the next midnight of the marker's date in the first place. It is
 * 23 or 25 hours long on a day that place's clock changes (PCK-006).
 * @param {Settings} settings The places, in display order.
 * @param {Marker} marker
 * @returns {PickerWindow | null} The window, or `null` when there are no places.
 */
export function pickerWindow(settings, marker) {
  const first = settings.places[0];
  if (first === undefined) return null;
  const local = localDateTime(marker.instant, first.zone);
  return {
    from: instantAtLocal(first.zone, atMinutes(local, 0)),
    to: instantAtLocal(first.zone, atMinutes(addDays(local, 1), 0)),
  };
}

/**
 * The picker rows (PCK-001): for each place its local date and time at the marker (PCK-002) and
 * the segments of working, non-working and day-off time over the window (PCK-003, PCK-005).
 * @param {Settings} settings The places, in display order, and the working hours (SET-005).
 * @param {Marker} marker
 * @param {Record<string, Holiday[]>} holidays Holidays by country code; a missing country has none.
 * @returns {PickerRow[]} One row per place, in display order; empty when there are no places.
 */
export function buildPicker(settings, marker, holidays) {
  const range = pickerWindow(settings, marker);
  if (range === null) return [];
  return settings.places.map((place) => {
    const row = {
      place,
      holidays: holidays[place.countryCode] ?? [],
      workStartMinutes: settings.workStartMinutes,
      workEndMinutes: settings.workEndMinutes,
    };
    return {
      placeId: place.id,
      localDateTime: localDateTime(marker.instant, place.zone),
      segments: rowSegments(row, range),
    };
  });
}

/**
 * Moves the marker to a date and keeps its time of day in the first place (PCK-007). A time the
 * clock skips on that date gives the instant the clock jumps forward; a repeated time gives its
 * first occurrence.
 * @param {Settings} settings The places, in display order.
 * @param {Marker} marker
 * @param {CalendarDate} date The chosen date in the first place.
 * @returns {Marker} The moved marker, or the same marker when there are no places.
 */
export function markerOnDate(settings, marker, date) {
  const first = settings.places[0];
  if (first === undefined) return marker;
  const local = localDateTime(marker.instant, first.zone);
  const withinMinute = marker.instant - Math.floor(marker.instant / msPerMinute) * msPerMinute;
  const wall = { ...date, hour: local.hour, minute: local.minute };
  return { instant: instantAtLocal(first.zone, wall) + withinMinute };
}

/**
 * Moves the marker by whole days in the first place and keeps its time of day there (PCK-007).
 * @param {Settings} settings The places, in display order.
 * @param {Marker} marker
 * @param {number} days For example -1 for the previous day and 1 for the next.
 * @returns {Marker} The moved marker, or the same marker when there are no places.
 */
export function shiftMarkerDay(settings, marker, days) {
  const first = settings.places[0];
  if (first === undefined) return marker;
  const local = localDateTime(marker.instant, first.zone);
  return markerOnDate(settings, marker, addDays(local, days));
}
