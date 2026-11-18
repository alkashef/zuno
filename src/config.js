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
  storageKey: "zuno.settings",
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
