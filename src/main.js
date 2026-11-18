// @ts-check
/**
 * @module main
 * Entry point: creates the controller and the views, connects them, starts the clock tick and
 * registers the top-level error handler. It holds no other logic (DEC-007).
 */
import { getHolidays } from "./api.js";
import * as clock from "./clock.js";
import { config } from "./config.js";
import { createController } from "./controller.js";
import { monthWeeks } from "./domain/calendar.js";
import { countryName, listCities, listCountries } from "./domain/cities.js";
import { placeFacts, placeName, placePin } from "./domain/places.js";
import { parseSettings } from "./domain/settings.js";
import { isAddedHoliday, parseUserHolidays } from "./domain/user-holidays.js";
import { countryWeekendDays, placeWeekendDays } from "./domain/weekends.js";
import { localDateTime, zoneOffset } from "./domain/zones.js";
import { createFiles } from "./files.js";
import { log } from "./log.js";
import { createStorage } from "./storage.js";
import { bindActions } from "./views/actions.js";
import { createEmptyPage } from "./views/empty.js";
import { createDaySelector } from "./views/day-selector.js";
import { createErrorScreen } from "./views/error-screen.js";
import { createHeader } from "./views/header.js";
import { createHijriNote } from "./views/hijri-note.js";
import { createLegend } from "./views/legend.js";
import { createMap } from "./views/map.js";
import { createMonthGrid } from "./views/month-grid.js";
import { createNotices } from "./views/notices.js";
import { createPicker } from "./views/picker.js";
import { createHolidaysSection } from "./views/settings-holidays.js";
import { createPlaceList } from "./views/settings-places.js";
import { createSettingsPanel } from "./views/settings.js";
import { createTheme } from "./views/theme.js";

const errorScreen = createErrorScreen(document);

/** @param {unknown} failure An unexpected error: logged and shown on screen with its stack. */
function reportFailure(failure) {
  log.error("Unexpected error", failure);
  errorScreen.show(failure);
}

window.addEventListener("error", (event) => reportFailure(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => reportFailure(event.reason));

const pickerLimits = {
  defaultHours: config.pickerDefaultHours,
  minHours: config.pickerMinHours,
  maxHours: config.pickerMaxHours,
};
const controller = createController({
  api: { getHolidays },
  storage: createStorage({
    store: localStorage,
    parse: (value) => parseSettings(value, pickerLimits),
  }),
  holidayStorage: createStorage({
    store: localStorage,
    parse: parseUserHolidays,
    key: config.holidaysStorageKey,
  }),
  files: createFiles({ doc: document, urls: URL }),
  holidaysFileName: config.holidaysFileName,
  clock,
  defaultHours: { start: config.defaultWorkStartMinutes, end: config.defaultWorkEndMinutes },
  defaultCityIds: config.defaultCityIds,
  pickerLimits,
});
const lookup = {
  cities: listCities(),
  placeFacts,
  offsetAt: zoneOffset,
  placeWeekendDays,
  countryWeekendDays,
};
const views = [
  createTheme(document),
  createHeader(document),
  createEmptyPage(document),
  createLegend(document),
  createNotices(document, { dispatch: controller.dispatch, placeName, countryName }),
  createMap(document, { placeName, pinOf: placePin }),
  createMonthGrid(document, {
    dispatch: controller.dispatch,
    placeFacts,
    isAddedHoliday,
    makeHijriNote: createHijriNote,
  }),
  createPicker(document, {
    dispatch: controller.dispatch,
    localAt: localDateTime,
    offsetAt: zoneOffset,
    placeFacts,
    steps: {
      stepMinutes: config.pickerStepMinutes,
      axisLabelEveryHours: config.pickerAxisLabelEveryHours,
    },
    makeDaySelector: (slot) =>
      createDaySelector(document, slot, { dispatch: controller.dispatch, monthWeeks }),
  }),
  createSettingsPanel(document, {
    defaultHours: { start: config.defaultWorkStartMinutes, end: config.defaultWorkEndMinutes },
    hoursStepMinutes: config.workingHoursStepMinutes,
    dispatch: controller.dispatch,
    lookup,
    makeList: (list) => createPlaceList(document, list, { dispatch: controller.dispatch, lookup }),
    makeHolidays: (section) =>
      createHolidaysSection(document, section, {
        dispatch: controller.dispatch,
        countries: listCountries(),
      }),
  }),
];

controller.subscribe((view) => views.forEach((part) => part.render(view)));
bindActions(document, controller.dispatch);
setInterval(() => controller.dispatch({ type: "tick" }), config.clockTickMs);
void controller.dispatch({ type: "open" });
