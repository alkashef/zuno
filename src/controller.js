// @ts-check
/**
 * @module controller
 * The page workflows: applies an action to the page state, asks the injected `api` for the holidays
 * the shown month and the marker's window need, and tells subscribers about every new state
 * (PCK-004, PCK-007, CAL-005, CAL-006, CLK-003, REF-001, REF-002, HOL-001, HOL-004, SET-001, SET-002,
 * SET-004 to SET-014, HIJ-002, HIJ-003, HOL-003, HOL-006 to HOL-009, DEC-007, DEC-016, DEC-017). Pure
 * apart from its injected `api`, `storage`, `holidayStorage` and `clock`. It touches no DOM (the
 * views do) and builds no picker, grid, notices or holiday-list logic itself (domain/* does).
 */
import { buildMonth } from "./domain/calendar.js";
import { cityOf } from "./domain/cities.js";
import {
  holidayOn,
  listRegions,
  placesMissingRegionalData,
  toHolidays,
  unavailableCountries,
} from "./domain/holidays.js";
import { buildPicker, markerOnDate, pickerWindow, shiftMarkerDay } from "./domain/picker.js";
import * as placeList from "./domain/places.js";
import {
  defaultSettings,
  withDisplaySwitch,
  withTheme,
  withWorkingHours,
} from "./domain/settings.js";
import * as userHolidayList from "./domain/user-holidays.js";
import { localDateTime } from "./domain/zones.js";

/** @typedef {import("./domain/calendar.js").DayFacts} DayFacts */
/** @typedef {import("./domain/calendar.js").MonthRef} MonthRef */
/** @typedef {import("./domain/holidays.js").Holiday} Holiday */
/** @typedef {import("./domain/holidays.js").HolidayResult} HolidayResult */
/** @typedef {import("./domain/picker.js").Marker} Marker */
/** @typedef {import("./domain/picker.js").PickerRow} PickerRow */
/** @typedef {import("./domain/places.js").Place} Place */
/** @typedef {import("./domain/places.js").PlaceChanges} PlaceChanges */
/** @typedef {import("./domain/settings.js").Settings} Settings */
/** @typedef {import("./domain/user-holidays.js").HolidayEntry} HolidayEntry */
/** @typedef {import("./domain/user-holidays.js").UserHolidays} UserHolidays */
/** @typedef {import("./domain/weekends.js").CalendarDate} CalendarDate */
/** @typedef {Record<string, Record<string, HolidayResult>>} ResultsByCountryYear Keyed by country code, then year. */

/**
 * @typedef {object} ControllerDeps The outside world, injected so tests can pass fakes.
 * @property {{ getHolidays: (countryCode: string, year: number) => Promise<HolidayResult> }} api
 * @property {{ load: () => Settings | null, save: (settings: Settings) => void }} storage
 * @property {{ load: () => UserHolidays | null, save: (record: UserHolidays) => void }} holidayStorage
 *   The record of the holidays the user added and hid (HOL-009, DEC-017).
 * @property {{ now: () => number }} clock
 * @property {{ start: number, end: number }} defaultHours Working hours (minutes after midnight)
 *   for settings that are not saved yet (SET-005).
 * @property {readonly string[]} defaultCityIds The cities of the default places, in order
 *   (SET-014).
 */

/**
 * @typedef {object} SelectedHoliday The holiday cell whose card is open (CAL-006).
 * @property {string} placeId
 * @property {string} date `YYYY-MM-DD`.
 * @property {string} name
 */

/**
 * @typedef {object} PageState
 * @property {Settings | null} settings The saved settings; `null` when none are saved.
 * @property {number} now The current instant (UTC milliseconds), updated by `tick` (CLK-003).
 * @property {Marker} marker The picker's chosen instant (PCK-004).
 * @property {MonthRef} month The month the grid shows (CAL-005).
 * @property {ResultsByCountryYear} holidayResults Every answer of the holiday service.
 * @property {UserHolidays} userHolidays The holidays the user added and hid (HOL-006 to HOL-008).
 * @property {SelectedHoliday | null} selectedHoliday
 * @property {boolean} noticesOpen
 * @property {boolean} settingsOpen
 */

/**
 * @typedef {object} Notices What the notices card lists (REF-002, HOL-004).
 * @property {string[]} countries Country codes with no holiday data for the shown dates.
 * @property {string[]} placeIds Places whose chosen region has no regional holiday data.
 */

/**
 * @typedef {object} PageModels What the views draw, derived from the state.
 * @property {boolean} isEmpty No places are saved (SET-007).
 * @property {PickerRow[]} picker
 * @property {DayFacts[][]} grid
 * @property {Notices} notices
 * @property {Record<string, string[]>} regions The region codes of each country's loaded holidays
 *   (SET-006).
 */

/** @typedef {PageState & PageModels} PageView */

/**
 * @typedef {{ type: "open" } | { type: "refresh" } | { type: "tick" }
 *   | { type: "setMarker", instant: number } | { type: "setMarker", date: CalendarDate }
 *   | { type: "shiftMarkerDay", days: number } | { type: "showMonth", offset: number }
 *   | { type: "selectHoliday", cell: { placeId: string, date: string } | null }
 *   | { type: "toggleNotices" } | { type: "openSettings" } | { type: "closeSettings" }
 *   | { type: "addPlace", cityId: string } | { type: "removePlace", placeId: string }
 *   | { type: "movePlace", placeId: string, offset: number }
 *   | { type: "editPlace", placeId: string, changes: PlaceChanges }
 *   | { type: "setWorkingHours", start: number, end: number }
 *   | { type: "setShowCountry", value: boolean } | { type: "setShowHijri", value: boolean }
 *   | { type: "setTheme", value: string }
 *   | ({ type: "addHoliday" | "removeHoliday" | "hideHoliday" | "showHoliday" } & HolidayEntry)} Action
 */

/** @typedef {{ countryCode: string, year: number }} CountryYear */

/**
 * @typedef {object} Context What every action handler uses.
 * @property {ControllerDeps} deps
 * @property {() => PageState} read
 * @property {(changes: Partial<PageState>) => void} update
 * @property {Set<string>} inFlight Country-years requested and not yet answered.
 */

/** @typedef {(ctx: Context, action: Action) => void | Promise<void>} Handler */

/**
 * @param {CountryYear} countryYear
 * @returns {string} A key such as `US-2026`.
 */
function keyOf({ countryCode, year }) {
  return `${countryCode}-${year}`;
}

/**
 * @param {number} instant UTC milliseconds.
 * @param {Settings | null} settings
 * @returns {MonthRef} The month of the instant in the first place, or in UTC with no places.
 */
function monthAt(instant, settings) {
  const { year, month } = localDateTime(instant, settings?.places[0]?.zone ?? "UTC");
  return { year, month };
}

/**
 * @param {MonthRef} month
 * @param {number} offset Months to move; negative for earlier.
 * @returns {MonthRef}
 */
function shiftMonth(month, offset) {
  const index = month.year * 12 + month.month - 1 + offset;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * The country-years the shown month and the marker's window need (design section 2.5).
 * @param {PageState} state
 * @returns {CountryYear[]} Without repeats.
 */
function neededCountryYears(state) {
  const { settings, marker, month } = state;
  if (settings === null) return [];
  const span = pickerWindow(settings, marker);
  const instants = span === null ? [] : [span.from, span.to - 1];
  const wanted = settings.places.flatMap((place) =>
    [month.year, ...instants.map((instant) => localDateTime(instant, place.zone).year)].map(
      (year) => ({ countryCode: place.countryCode, year }),
    ),
  );
  return [...new Map(wanted.map((countryYear) => [keyOf(countryYear), countryYear])).values()];
}

/**
 * @param {Record<string, HolidayResult>} byYear
 * @returns {Holiday[]} The public holidays of every loaded year.
 */
function loadedHolidays(byYear) {
  return Object.values(byYear).flatMap((result) =>
    result.status === "loaded" ? toHolidays(result.holidays) : [],
  );
}

/**
 * @param {PageState} state
 * @param {string} countryCode
 * @returns {Holiday[]} The country's holidays as the page uses them: the loaded ones without those
 *   the user hid, plus those the user added (HOL-003).
 */
function countryHolidays(state, countryCode) {
  const loaded = loadedHolidays(state.holidayResults[countryCode] ?? {});
  return userHolidayList.effectiveHolidays(loaded, state.userHolidays, countryCode);
}

/**
 * @param {PageState} state
 * @param {Settings} settings The state's settings, known not to be `null`.
 * @returns {Record<string, Holiday[]>} The holidays of every loaded country and of every place's
 *   country, by country code (HOL-003, REF-002).
 */
function holidaysByCountry(state, settings) {
  const codes = new Set([
    ...Object.keys(state.holidayResults),
    ...settings.places.map((place) => place.countryCode),
  ]);
  return Object.fromEntries([...codes].map((code) => [code, countryHolidays(state, code)]));
}

/**
 * @param {Record<string, Holiday[]>} holidays Every loaded holiday by country code.
 * @returns {Record<string, string[]>} The region codes of each country (SET-006).
 */
function regionsByCountry(holidays) {
  return Object.fromEntries(
    Object.entries(holidays).map(([countryCode, list]) => [countryCode, listRegions(list)]),
  );
}

/**
 * @param {Record<string, HolidayResult>} byYear
 * @returns {HolidayResult} `unavailable` when any year failed, else every year's records together.
 */
function mergeYears(byYear) {
  const results = Object.values(byYear);
  const failed = results.find((result) => result.status === "unavailable");
  if (failed !== undefined) return failed;
  const holidays = results.flatMap((result) => (result.status === "loaded" ? result.holidays : []));
  return { status: "loaded", holidays };
}

/**
 * @param {PageState} state
 * @returns {Record<string, HolidayResult>} One answer per country, from the needed years only.
 */
function neededResultsByCountry(state) {
  /** @type {ResultsByCountryYear} */
  const needed = {};
  for (const { countryCode, year } of neededCountryYears(state)) {
    const result = state.holidayResults[countryCode]?.[year];
    if (result !== undefined) needed[countryCode] = { ...needed[countryCode], [year]: result };
  }
  return Object.fromEntries(
    Object.entries(needed).map(([countryCode, byYear]) => [countryCode, mergeYears(byYear)]),
  );
}

/**
 * @param {PageState} state
 * @param {Settings} settings The state's settings, known not to be `null`.
 * @returns {Notices}
 */
function noticesOf(state, settings) {
  const byCountry = neededResultsByCountry(state);
  return {
    countries: unavailableCountries(byCountry),
    placeIds: placesMissingRegionalData(settings.places, byCountry).map((place) => place.id),
  };
}

/**
 * @param {PageState} state
 * @returns {PageView} The state with empty models (SET-007).
 */
function emptyView(state) {
  const notices = { countries: [], placeIds: [] };
  return { ...state, isEmpty: true, picker: [], grid: [], notices, regions: {} };
}

/**
 * @param {PageState} state
 * @returns {PageView} The state with the models the views draw.
 */
function derive(state) {
  const { settings } = state;
  if (settings === null || settings.places.length === 0) return emptyView(state);
  const holidays = holidaysByCountry(state, settings);
  return {
    ...state,
    isEmpty: false,
    regions: regionsByCountry(holidays),
    picker: buildPicker(settings, state.marker, holidays),
    grid: buildMonth(settings, state.month, holidays, state.now),
    notices: noticesOf(state, settings),
  };
}

/**
 * Stores an answer. A failed answer does not replace a loaded one, so holidays already loaded stay
 * shown (REF-002).
 * @param {ResultsByCountryYear} results
 * @param {CountryYear} countryYear
 * @param {HolidayResult} result
 * @returns {ResultsByCountryYear}
 */
function withResult(results, { countryCode, year }, result) {
  const byYear = results[countryCode] ?? {};
  const previous = byYear[year];
  const kept = result.status === "unavailable" && previous?.status === "loaded" ? previous : result;
  return { ...results, [countryCode]: { ...byYear, [year]: kept } };
}

/**
 * Asks for one country-year and stores the answer (HOL-001).
 * @param {Context} ctx
 * @param {CountryYear} countryYear
 * @returns {Promise<void>}
 */
async function requestOne(ctx, countryYear) {
  ctx.inFlight.add(keyOf(countryYear));
  const result = await ctx.deps.api.getHolidays(countryYear.countryCode, countryYear.year);
  ctx.inFlight.delete(keyOf(countryYear));
  ctx.update({ holidayResults: withResult(ctx.read().holidayResults, countryYear, result) });
}

/**
 * Asks for each country-year not already on its way.
 * @param {Context} ctx
 * @param {CountryYear[]} wanted
 * @returns {Promise<void>} Settles when every answer is stored.
 */
async function requestCountryYears(ctx, wanted) {
  const fresh = wanted.filter((countryYear) => !ctx.inFlight.has(keyOf(countryYear)));
  await Promise.all(fresh.map((countryYear) => requestOne(ctx, countryYear)));
}

/**
 * Asks for the needed country-years that have no answer yet, so each is requested once (HOL-001).
 * @param {Context} ctx
 * @returns {Promise<void>}
 */
function requestMissing(ctx) {
  const state = ctx.read();
  const missing = neededCountryYears(state).filter(
    ({ countryCode, year }) => state.holidayResults[countryCode]?.[year] === undefined,
  );
  return requestCountryYears(ctx, missing);
}

/**
 * @param {ControllerDeps} deps
 * @returns {Settings} The defaults, with the default places (SET-005, SET-014).
 */
function defaultsOf({ defaultHours, defaultCityIds }) {
  return defaultSettings(defaultHours.start, defaultHours.end, defaultCityIds);
}

/**
 * Loads the settings and the user's holidays, and puts the marker and the grid at now (PCK-004,
 * SET-007, SET-014, HOL-009). No valid holiday record means no added and no hidden holidays.
 * @param {Context} ctx
 * @returns {Promise<void>}
 */
function open(ctx) {
  const settings = ctx.deps.storage.load() ?? defaultsOf(ctx.deps);
  const userHolidays = ctx.deps.holidayStorage.load() ?? userHolidayList.emptyUserHolidays();
  const now = ctx.deps.clock.now();
  const month = monthAt(now, settings);
  ctx.update({ settings, userHolidays, now, marker: { instant: now }, month });
  return requestMissing(ctx);
}

/**
 * Recomputes the times and fetches every needed country-year again (REF-001).
 * @param {Context} ctx
 * @returns {Promise<void>}
 */
function refresh(ctx) {
  ctx.update({ now: ctx.deps.clock.now() });
  return requestCountryYears(ctx, neededCountryYears(ctx.read()));
}

/**
 * Updates the current time; the marker stays (CLK-003).
 * @param {Context} ctx
 * @returns {void}
 */
function tick(ctx) {
  ctx.update({ now: ctx.deps.clock.now() });
}

/**
 * Moves the marker and asks for any year its new window needs (PCK-002, PCK-007).
 * @param {Context} ctx
 * @param {(settings: Settings, marker: Marker) => Marker} move
 * @returns {Promise<void>}
 */
function moveMarker(ctx, move) {
  const { settings, marker } = ctx.read();
  if (settings === null) return Promise.resolve();
  ctx.update({ marker: move(settings, marker) });
  return requestMissing(ctx);
}

/**
 * Puts the marker at an instant, or on a date keeping its time of day in the first place (PCK-007).
 * @param {Context} ctx
 * @param {Extract<Action, { type: "setMarker" }>} action
 * @returns {Promise<void>}
 */
function setMarker(ctx, action) {
  return moveMarker(ctx, (settings, marker) =>
    "date" in action ? markerOnDate(settings, marker, action.date) : { instant: action.instant },
  );
}

/**
 * Moves the marker by whole days in the first place (PCK-007).
 * @param {Context} ctx
 * @param {Extract<Action, { type: "shiftMarkerDay" }>} action
 * @returns {Promise<void>}
 */
function shiftDay(ctx, action) {
  return moveMarker(ctx, (settings, marker) => shiftMarkerDay(settings, marker, action.days));
}

/**
 * Shows an earlier or later month and closes any holiday card (CAL-005).
 * @param {Context} ctx
 * @param {Extract<Action, { type: "showMonth" }>} action
 * @returns {Promise<void>}
 */
function showMonth(ctx, action) {
  ctx.update({ month: shiftMonth(ctx.read().month, action.offset), selectedHoliday: null });
  return requestMissing(ctx);
}

/**
 * @param {PageState} state
 * @param {{ placeId: string, date: string }} cell
 * @returns {SelectedHoliday | null} The cell's holiday, or `null` when the cell is not a holiday.
 */
function holidayAt(state, { placeId, date }) {
  const place = state.settings?.places.find((candidate) => candidate.id === placeId);
  if (place === undefined) return null;
  const holiday = holidayOn(countryHolidays(state, place.countryCode), place.region, date);
  return holiday === null ? null : { placeId, date, name: holiday.name };
}

/**
 * Opens the card of a holiday cell, or closes it when the cell is `null` (CAL-006).
 * @param {Context} ctx
 * @param {Extract<Action, { type: "selectHoliday" }>} action
 * @returns {void}
 */
function selectHoliday(ctx, { cell }) {
  ctx.update({ selectedHoliday: cell === null ? null : holidayAt(ctx.read(), cell) });
}

/**
 * @param {Place[]} places
 * @returns {string} An id such as `place-3` that no place in the list has.
 */
function nextPlaceId(places) {
  const taken = new Set(places.map((place) => place.id));
  let number = places.length + 1;
  while (taken.has(`place-${number}`)) number += 1;
  return `place-${number}`;
}

/**
 * @param {Context} ctx
 * @returns {Settings} The shown settings, or the defaults before the page is open (SET-005, SET-014).
 */
function currentSettings(ctx) {
  return ctx.read().settings ?? defaultsOf(ctx.deps);
}

/**
 * @param {ResultsByCountryYear} results
 * @param {Place[]} places
 * @returns {ResultsByCountryYear} The answers of the countries some place still uses.
 */
function keepUsedCountries(results, places) {
  const used = new Set(places.map((place) => place.countryCode));
  return Object.fromEntries(Object.entries(results).filter(([code]) => used.has(code)));
}

/**
 * Saves new settings, shows them, and asks for the holidays they need (SET-004). `null` is a
 * refused change: nothing is saved or shown.
 * @param {Context} ctx
 * @param {Settings | null} next
 * @returns {Promise<void>}
 */
function commitSettings(ctx, next) {
  if (next === null) return Promise.resolve();
  const { holidayResults, selectedHoliday } = ctx.read();
  ctx.deps.storage.save(next);
  const shown = next.places.some((place) => place.id === selectedHoliday?.placeId);
  ctx.update({
    settings: next,
    holidayResults: keepUsedCountries(holidayResults, next.places),
    selectedHoliday: shown ? selectedHoliday : null,
  });
  return requestMissing(ctx);
}

/**
 * @param {Context} ctx
 * @param {(places: Place[]) => Place[]} change
 * @returns {Promise<void>} Commits the settings with the changed place list.
 */
function changePlaces(ctx, change) {
  const settings = currentSettings(ctx);
  return commitSettings(ctx, { ...settings, places: change(settings.places) });
}

/**
 * Adds a place for a city of the list, with its name, country and zone (SET-001, SET-002). A city
 * that is not in the list is refused and nothing is saved (SET-013).
 * @param {Context} ctx
 * @param {Extract<Action, { type: "addPlace" }>} action
 * @returns {Promise<void>}
 */
function addPlace(ctx, { cityId }) {
  if (cityOf(cityId) === null) return Promise.resolve();
  return changePlaces(ctx, (places) =>
    placeList.addPlace(places, placeList.createPlace(nextPlaceId(places), cityId)),
  );
}

/**
 * @param {Context} ctx
 * @param {Extract<Action, { type: "removePlace" }>} action
 * @returns {Promise<void>} Removes a place (SET-001).
 */
function removePlace(ctx, { placeId }) {
  return changePlaces(ctx, (places) => placeList.removePlace(places, placeId));
}

/**
 * @param {Context} ctx
 * @param {Extract<Action, { type: "movePlace" }>} action
 * @returns {Promise<void>} Moves a place up or down in both views (SET-008).
 */
function movePlace(ctx, { placeId, offset }) {
  return changePlaces(ctx, (places) => placeList.movePlace(places, placeId, offset));
}

/**
 * Changes the display name, region, weekend days or Hijri choices of a place (SET-006, SET-009,
 * SET-016, HIJ-002, HIJ-003). A change that makes the place invalid is refused and nothing is saved.
 * @param {Context} ctx
 * @param {Extract<Action, { type: "editPlace" }>} action
 * @returns {Promise<void>}
 */
function editPlace(ctx, { placeId, changes }) {
  const { places } = currentSettings(ctx);
  const edited = placeList.editPlace(places, placeId, changes);
  const refused = edited.every((place, index) => place === places[index]);
  return refused ? Promise.resolve() : changePlaces(ctx, () => edited);
}

/**
 * @param {Context} ctx
 * @param {Extract<Action, { type: "setWorkingHours" }>} action
 * @returns {Promise<void>} Sets the working hours; a start not before the end is refused (SET-005).
 */
function setWorkingHours(ctx, { start, end }) {
  return commitSettings(ctx, withWorkingHours(currentSettings(ctx), start, end));
}

/**
 * @param {"showCountry" | "showHijri"} name The display switch.
 * @returns {Handler} The handler that turns the switch on or off (SET-010, SET-011).
 */
function displaySwitch(name) {
  return (ctx, action) =>
    commitSettings(
      ctx,
      withDisplaySwitch(
        currentSettings(ctx),
        name,
        /** @type {{ value: unknown }} */ (action).value,
      ),
    );
}

/**
 * @param {Context} ctx
 * @param {Extract<Action, { type: "setTheme" }>} action
 * @returns {Promise<void>} Chooses the theme; a value that is not a theme choice is refused (SET-012).
 */
function setTheme(ctx, { value }) {
  return commitSettings(ctx, withTheme(currentSettings(ctx), value));
}

/**
 * @returns {Partial<Record<Action["type"], Handler>>} The handlers of the settings workflows.
 */
function settingsHandlers() {
  return /** @type {Partial<Record<Action["type"], Handler>>} */ ({
    addPlace,
    removePlace,
    movePlace,
    editPlace,
    setWorkingHours,
    setShowCountry: displaySwitch("showCountry"),
    setShowHijri: displaySwitch("showHijri"),
    setTheme,
  });
}

/**
 * Saves a change of the user's holidays and shows it; a holiday card whose holiday is gone closes
 * (HOL-006 to HOL-009). `null` is a refused change: nothing is saved or shown.
 * @param {Context} ctx
 * @param {UserHolidays | null} next
 * @returns {void}
 */
function commitUserHolidays(ctx, next) {
  if (next === null) return;
  ctx.deps.holidayStorage.save(next);
  const state = { ...ctx.read(), userHolidays: next };
  const selected = state.selectedHoliday;
  ctx.update({
    userHolidays: next,
    selectedHoliday: selected === null ? null : holidayAt(state, selected),
  });
}

/**
 * @param {(record: UserHolidays, entry: HolidayEntry) => UserHolidays | null} change
 * @returns {Handler} The handler that applies the change to the action's country, date and name.
 */
function holidayChange(change) {
  return (ctx, action) => {
    const { countryCode, date, name } = /** @type {HolidayEntry} */ (action);
    commitUserHolidays(ctx, change(ctx.read().userHolidays, { countryCode, date, name }));
  };
}

/**
 * @returns {Partial<Record<Action["type"], Handler>>} The handlers of the holiday workflows
 *   (HOL-006 to HOL-008).
 */
function holidayHandlers() {
  return {
    addHoliday: holidayChange(userHolidayList.addHoliday),
    removeHoliday: holidayChange(userHolidayList.removeHoliday),
    hideHoliday: holidayChange(userHolidayList.hideHoliday),
    showHoliday: holidayChange(userHolidayList.showHoliday),
  };
}

/**
 * @returns {Record<Action["type"], Handler>} The handler of each action type.
 */
function handlers() {
  return /** @type {Record<Action["type"], Handler>} */ ({
    open,
    refresh,
    tick,
    setMarker,
    shiftMarkerDay: shiftDay,
    showMonth,
    selectHoliday,
    ...settingsHandlers(),
    ...holidayHandlers(),
    toggleNotices: (ctx) => ctx.update({ noticesOpen: !ctx.read().noticesOpen }),
    openSettings: (ctx) => ctx.update({ settingsOpen: true }),
    closeSettings: (ctx) => ctx.update({ settingsOpen: false }),
  });
}

/**
 * @param {number} now UTC milliseconds.
 * @returns {PageState} The state before `open`: no settings, the marker and the grid at now.
 */
function initialState(now) {
  return {
    settings: null,
    now,
    marker: { instant: now },
    month: monthAt(now, null),
    holidayResults: {},
    userHolidays: userHolidayList.emptyUserHolidays(),
    selectedHoliday: null,
    noticesOpen: false,
    settingsOpen: false,
  };
}

/**
 * Holds the page state; every update hands the new view to `onChange`.
 * @param {ControllerDeps} deps
 * @param {(view: PageView) => void} onChange
 * @returns {Context}
 */
function createContext(deps, onChange) {
  let state = initialState(deps.clock.now());
  return {
    deps,
    inFlight: new Set(),
    read: () => state,
    update(changes) {
      state = { ...state, ...changes };
      onChange(derive(state));
    },
  };
}

/**
 * Creates the controller of the page workflows.
 * @param {ControllerDeps} deps The holiday api, the settings and holiday storages and the clock.
 * @returns {{ getState: () => PageView, dispatch: (action: Action) => Promise<void>, subscribe: (listener: (view: PageView) => void) => () => void }}
 *   `dispatch` settles when the action's holiday requests are answered; `subscribe` returns a
 *   function that unsubscribes. A rejected `api` call rejects `dispatch` (top-level handler).
 */
export function createController(deps) {
  /** @type {Set<(view: PageView) => void>} */
  const listeners = new Set();
  const ctx = createContext(deps, (next) => {
    view = next;
    listeners.forEach((listener) => listener(next));
  });
  let view = derive(ctx.read());
  const table = handlers();
  return {
    getState: () => view,
    dispatch: async (action) => table[action.type](ctx, action),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
