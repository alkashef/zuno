// @ts-check
/**
 * @module controller
 * The page workflows: applies an action to the page state, asks the injected `holidayTable` or `api` for the holidays
 * the shown month and the marker's window need, and tells subscribers about every new state
 * (PCK-004, PCK-006, PCK-007, PCK-009, LAY-003, CAL-005, CAL-006, CLK-003, REF-001, REF-002, HOL-001, HOL-004, SET-001, SET-002,
 * SET-004 to SET-014, SET-018, HIJ-002, HIJ-003, HOL-003, HOL-006 to HOL-013, DEC-007, DEC-016 to DEC-019, DEC-022,
 * DEC-029).
 * Pure apart from its injected `api`, `storage`, `holidayStorage`, `files` and `clock`. It touches no DOM (the
 * views do) and builds no picker, grid, notices or holiday-list logic itself (domain/* does). The
 * user's holiday actions, the holidays the page uses and the notices are in controller-holidays.js;
 * adding a custom place is in controller-places.js.
 */
import {
  holidayAt,
  holidayHandlers,
  holidaysByCountry,
  loadUserHolidays,
  noticesOf,
  regionsByCountry,
  tableAnswer,
} from "./controller-holidays.js";
import { nextPlaceId, placeHandlers } from "./controller-places.js";
import { buildMonth } from "./domain/calendar.js";
import { cityOf } from "./domain/cities.js";
import {
  buildPicker,
  chooseDay,
  keepMarkerInWindow,
  markerInWindow,
  pickerWindow,
  shiftDay,
  windowDates,
} from "./domain/picker.js";
import * as placeList from "./domain/places.js";
import {
  defaultSettings,
  withDisplaySwitch,
  withMapHeight,
  withPickerHours,
  withTheme,
  withWorkingHours,
} from "./domain/settings.js";
import { emptyUserHolidays } from "./domain/user-holidays.js";
import { localDateTime } from "./domain/zones.js";

/** @typedef {import("./controller-holidays.js").CountryYear} CountryYear */
/** @typedef {import("./controller-holidays.js").FileRead} FileRead */
/** @typedef {import("./controller-holidays.js").HolidayAction} HolidayAction */
/** @typedef {import("./controller-holidays.js").HolidayTable} HolidayTable */
/** @typedef {import("./controller-holidays.js").Notices} Notices */
/** @typedef {import("./controller-holidays.js").ResultsByCountryYear} ResultsByCountryYear */
/** @typedef {import("./controller-holidays.js").SelectedHoliday} SelectedHoliday */
/** @typedef {import("./controller-places.js").PlaceAction} PlaceAction */
/** @typedef {import("./domain/calendar.js").DayFacts} DayFacts */
/** @typedef {import("./domain/calendar.js").MonthRef} MonthRef */
/** @typedef {import("./domain/holidays.js").HolidayResult} HolidayResult */
/** @typedef {import("./domain/picker.js").DayChoice} DayChoice */
/** @typedef {import("./domain/picker.js").Marker} Marker */
/** @typedef {import("./domain/picker.js").PickerWindow} PickerWindow */
/** @typedef {import("./domain/picker.js").WindowDates} WindowDates */
/** @typedef {import("./domain/picker.js").PickerRow} PickerRow */
/** @typedef {import("./domain/places.js").Place} Place */
/** @typedef {import("./domain/places.js").PlaceChanges} PlaceChanges */
/** @typedef {import("./domain/settings.js").MapLimits} MapLimits */
/** @typedef {import("./domain/settings.js").PickerLimits} PickerLimits */
/** @typedef {import("./domain/settings.js").Settings} Settings */
/** @typedef {import("./domain/user-holidays.js").UserHolidays} UserHolidays */
/** @typedef {import("./domain/weekends.js").CalendarDate} CalendarDate */

/**
 * @typedef {object} ControllerDeps The outside world, injected so tests can pass fakes.
 * @property {{ getHolidays: (countryCode: string, year: number) => Promise<HolidayResult> }} api
 * @property {HolidayTable} holidayTable The built-in holiday table's reader: a table country's
 *   holidays come from it, not from `api` (HOL-013, DEC-024).
 * @property {{ load: () => Settings | null, save: (settings: Settings) => void }} storage
 * @property {{ load: () => UserHolidays | null, save: (record: UserHolidays) => void }} holidayStorage
 *   The record of the holidays the user added and hid (HOL-009, DEC-017).
 * @property {{ saveJson: (fileName: string, value: unknown) => void, readJson: (file: Blob) => Promise<FileRead> }} files
 *   Saves the holidays file and reads a picked one (HOL-010 to HOL-012, DEC-018).
 * @property {string} holidaysFileName The name of the exported holidays file.
 * @property {{ now: () => number }} clock
 * @property {{ start: number, end: number }} defaultHours Working hours (minutes after midnight)
 *   for settings that are not saved yet (SET-005).
 * @property {readonly string[]} defaultCityIds The cities of the default places, in order
 *   (SET-014).
 * @property {PickerLimits} pickerLimits The hour slots the picker may show (LAY-003, DEC-019).
 * @property {MapLimits} mapLimits The map heights the user may set (LAY-004, DEC-028).
 */

/**
 * @typedef {object} PageState
 * @property {Settings | null} settings The saved settings; `null` when none are saved.
 * @property {number} now The current instant (UTC milliseconds), updated by `tick` (CLK-003).
 * @property {Marker} marker The picker's chosen instant (PCK-004); always inside the window.
 * @property {CalendarDate} selectedDay The day the picker window starts on, in the first place
 *   (PCK-006, DEC-019).
 * @property {MonthRef} month The month the grid shows (CAL-005).
 * @property {ResultsByCountryYear} holidayResults Every answer of the holiday service.
 * @property {UserHolidays} userHolidays The holidays the user added and hid (HOL-006 to HOL-008).
 * @property {SelectedHoliday | null} selectedHoliday
 * @property {boolean} noticesOpen
 * @property {boolean} settingsOpen
 * @property {"refused" | null} holidayImport `refused` while the last imported file was refused (HOL-012).
 */

/**
 * @typedef {object} PageModels What the views draw, derived from the state.
 * @property {boolean} isEmpty No places are saved (SET-007).
 * @property {PickerRow[]} picker
 * @property {PickerWindow | null} pickerWindow The instants every picker row covers (PCK-006).
 * @property {WindowDates | null} windowDates The window's first and last date in the first place
 *   (PCK-009).
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
 *   | { type: "setTheme", value: string } | { type: "setPickerHours", hours: number }
 *   | { type: "setMapHeight", px: number | null } | HolidayAction | PlaceAction} Action
 */

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
 * @param {number} instant UTC milliseconds.
 * @param {Settings | null} settings
 * @returns {CalendarDate} The date of the instant in the first place, or in UTC with no places.
 */
function dayAt(instant, settings) {
  const { year, month, day } = localDateTime(instant, settings?.places[0]?.zone ?? "UTC");
  return { year, month, day };
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
 * The country-years the shown month and the picker window need (design section 2.5).
 * @param {PageState} state
 * @returns {CountryYear[]} Without repeats.
 */
function neededCountryYears(state) {
  const { settings, selectedDay, month } = state;
  if (settings === null) return [];
  const span = pickerWindow(settings, selectedDay);
  const instants = span === null ? [] : [span.from, span.to - 1];
  const wanted = settings.places.flatMap((place) =>
    [month.year, ...instants.map((instant) => localDateTime(instant, place.zone).year)].map(
      (year) => ({ countryCode: place.countryCode, year }),
    ),
  );
  return [...new Map(wanted.map((countryYear) => [keyOf(countryYear), countryYear])).values()];
}

/**
 * @param {PageState} state
 * @returns {PageView} The state with empty models (SET-007).
 */
function emptyView(state) {
  const notices = { countries: [], placeIds: [] };
  const models = { picker: [], pickerWindow: null, windowDates: null, grid: [], notices };
  return { ...state, ...models, isEmpty: true, regions: {} };
}

/**
 * @param {PageState} state
 * @returns {PageView} The state with the models the views draw.
 */
function derive(state) {
  const { settings } = state;
  if (settings === null || settings.places.length === 0) return emptyView(state);
  const holidays = holidaysByCountry(state, settings);
  const needed = neededCountryYears(state);
  return {
    ...state,
    isEmpty: false,
    regions: regionsByCountry(holidays),
    picker: buildPicker(settings, state.marker, holidays, state.selectedDay),
    pickerWindow: pickerWindow(settings, state.selectedDay),
    windowDates: windowDates(settings, state.selectedDay),
    grid: buildMonth(settings, state.month, holidays, state.now),
    notices: noticesOf(state.holidayResults, needed, settings.places, state.userHolidays),
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
 * @param {Context} ctx
 * @param {CountryYear} countryYear
 * @returns {Promise<HolidayResult>} The answer from the built-in table for a table country, else
 *   from the holiday service (HOL-001, HOL-013).
 */
async function answerOf(ctx, countryYear) {
  const { api, holidayTable } = ctx.deps;
  if (holidayTable.isTableCountry(countryYear.countryCode)) {
    return tableAnswer(holidayTable, countryYear);
  }
  return api.getHolidays(countryYear.countryCode, countryYear.year);
}

/**
 * Gets the answer for one country-year and stores it (HOL-001, HOL-013).
 * @param {Context} ctx
 * @param {CountryYear} countryYear
 * @returns {Promise<void>}
 */
async function requestOne(ctx, countryYear) {
  ctx.inFlight.add(keyOf(countryYear));
  const result = await answerOf(ctx, countryYear);
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
function defaultsOf({ defaultHours, defaultCityIds, pickerLimits }) {
  const { start, end } = defaultHours;
  return defaultSettings(start, end, defaultCityIds, pickerLimits.defaultHours);
}

/**
 * Loads the settings and the user's holidays, and puts the marker and the grid at now and the
 * selected day at today in the first place (PCK-004, SET-007, SET-014, HOL-009). No valid holiday record means no added and no hidden holidays.
 * @param {Context} ctx
 * @returns {Promise<void>}
 */
function open(ctx) {
  const settings = ctx.deps.storage.load() ?? defaultsOf(ctx.deps);
  const userHolidays = loadUserHolidays(ctx.deps.holidayStorage);
  const now = ctx.deps.clock.now();
  const month = monthAt(now, settings);
  const selectedDay = dayAt(now, settings);
  ctx.update({ settings, userHolidays, now, marker: { instant: now }, selectedDay, month });
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
 * Moves the marker, and the selected day when a day is chosen, and asks for any year the window
 * needs (PCK-002, PCK-006, PCK-007).
 * @param {Context} ctx
 * @param {(settings: Settings, choice: DayChoice) => Partial<DayChoice>} move
 * @returns {Promise<void>}
 */
function moveMarker(ctx, move) {
  const { settings, selectedDay, marker } = ctx.read();
  if (settings === null) return Promise.resolve();
  ctx.update(move(settings, { selectedDay, marker }));
  return requestMissing(ctx);
}

/**
 * Puts the marker at an instant inside the window, which stays (PCK-006), or chooses a date and
 * moves the marker to it at its time of day in the first place (PCK-007).
 * @param {Context} ctx
 * @param {Extract<Action, { type: "setMarker" }>} action
 * @returns {Promise<void>}
 */
function setMarker(ctx, action) {
  return moveMarker(ctx, (settings, choice) =>
    "date" in action
      ? chooseDay(settings, choice, action.date)
      : { marker: markerInWindow(settings, choice, action.instant) },
  );
}

/**
 * Chooses the day that many days after the selected day (PCK-007).
 * @param {Context} ctx
 * @param {Extract<Action, { type: "shiftMarkerDay" }>} action
 * @returns {Promise<void>}
 */
function shiftMarkerDay(ctx, action) {
  return moveMarker(ctx, (settings, choice) => shiftDay(settings, choice, action.days));
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
 * Opens the card of a holiday cell, or closes it when the cell is `null` (CAL-006).
 * @param {Context} ctx
 * @param {Extract<Action, { type: "selectHoliday" }>} action
 * @returns {void}
 */
function selectHoliday(ctx, { cell }) {
  ctx.update({ selectedHoliday: cell === null ? null : holidayAt(ctx.read(), cell) });
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
 * @param {PageState} state
 * @param {Settings} next
 * @returns {DayChoice} The selected day and the marker under the new settings: the marker stays
 *   inside the window (DEC-019); with no places before, the selected day is the marker's date in
 *   the new first place.
 */
function settleDay(state, next) {
  const hadPlaces = (state.settings?.places.length ?? 0) > 0;
  const selectedDay = hadPlaces ? state.selectedDay : dayAt(state.marker.instant, next);
  return { selectedDay, marker: keepMarkerInWindow(next, { selectedDay, marker: state.marker }) };
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
  const state = ctx.read();
  const { holidayResults, selectedHoliday } = state;
  ctx.deps.storage.save(next);
  const shown = next.places.some((place) => place.id === selectedHoliday?.placeId);
  ctx.update({
    settings: next,
    ...settleDay(state, next),
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
 * @param {Context} ctx
 * @param {Extract<Action, { type: "setPickerHours" }>} action
 * @returns {Promise<void>} Sets the picker's hour slots; hours outside the limits are refused
 *   (LAY-003, DEC-019).
 */
function setPickerHours(ctx, { hours }) {
  return commitSettings(ctx, withPickerHours(currentSettings(ctx), hours, ctx.deps.pickerLimits));
}

/**
 * @param {Context} ctx
 * @param {Extract<Action, { type: "setMapHeight" }>} action
 * @returns {Promise<void>} Sets the map's height; a height outside the limits is refused (LAY-004,
 *   LAY-005, DEC-028).
 */
function setMapHeight(ctx, { px }) {
  return commitSettings(ctx, withMapHeight(currentSettings(ctx), px, ctx.deps.mapLimits));
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
    setPickerHours,
    setMapHeight,
  });
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
    shiftMarkerDay,
    showMonth,
    selectHoliday,
    ...settingsHandlers(),
    ...holidayHandlers(),
    ...placeHandlers(changePlaces),
    toggleNotices: (ctx) => ctx.update({ noticesOpen: !ctx.read().noticesOpen }),
    openSettings: (ctx) => ctx.update({ settingsOpen: true }),
    closeSettings: (ctx) => ctx.update({ settingsOpen: false }),
  });
}

/**
 * @param {number} now UTC milliseconds.
 * @returns {PageState} The state before `open`: no settings, the marker, the selected day and the
 *   grid at now.
 */
function initialState(now) {
  return {
    settings: null,
    now,
    marker: { instant: now },
    selectedDay: dayAt(now, null),
    month: monthAt(now, null),
    holidayResults: {},
    userHolidays: emptyUserHolidays(),
    selectedHoliday: null,
    noticesOpen: false,
    settingsOpen: false,
    holidayImport: null,
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
 * @param {ControllerDeps} deps The holiday api, the settings and holiday storages, the files, the
 *   clock and the default settings values.
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
