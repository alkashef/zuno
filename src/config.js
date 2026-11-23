// @ts-check
/**
 * @module config
 * Behaviour values of the page, as one frozen object (docs/design.md section 2.3). Holds no logic.
 */
export const config = Object.freeze({
  holidayServiceBaseUrl: "https://nagerholidays.com/api/v4",
  holidayRequestTimeoutMs: 10000,
  clockTickMs: 60000,
  pickerStepMinutes: 15,
  pickerAxisLabelEveryHours: 6,
  pickerDefaultHours: 24,
  pickerMinHours: 24,
  pickerMaxHours: 48,
  mapMinHeight: 240,
  mapMaxHeight: 900,
  mapHeightStepPx: 20,
  storageKey: "zuno.settings",
  holidaysStorageKey: "zuno.holidays",
  holidaysFileName: "zuno-holidays-and-vacations.csv",
  defaultWorkStartMinutes: 540,
  defaultWorkEndMinutes: 1020,
  workingHoursStepMinutes: 60,
  defaultCityIds: Object.freeze([
    "tokyo",
    "cairo",
    "new-delhi",
    "madrid",
    "bogota",
    "riyadh",
    "islamabad",
  ]),
  logLevel: "warn",
});
