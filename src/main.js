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
import { dayMenuChoices, monthWeeks } from "./domain/calendar.js";
import { countryName, listAllCountries, listCities } from "./domain/cities.js";
import { importCounts, importRemovalPlan } from "./domain/holidays-file.js";
import { isTableCountry, tableHolidays } from "./domain/holiday-table.js";
import { holidayCountries, placeFacts, placeName, placePin } from "./domain/places.js";
import { parseSettings } from "./domain/settings.js";
import { parseUserHolidays } from "./domain/user-holidays.js";
import { checkVacation } from "./domain/vacations.js";
import { countryWeekendDays, placeWeekendDays } from "./domain/weekends.js";
import { localDateTime, zoneOffset } from "./domain/zones.js";
import { listZones } from "./domain/zone-table.js";
import { createFiles } from "./files.js";
import { log } from "./log.js";
import { createStorage } from "./storage.js";
import { bindActions } from "./views/actions.js";
import { createCellCard } from "./views/cell-card.js";
import { createDayDialog } from "./views/day-dialog.js";
import { createDayMenu } from "./views/day-menu.js";
import { createEmptyPage } from "./views/empty.js";
import { createDaySelector } from "./views/day-selector.js";
import { createErrorScreen } from "./views/error-screen.js";
import { createHeader } from "./views/header.js";
import { createHijriNote } from "./views/hijri-note.js";
import { createLegend } from "./views/legend.js";
import { createMap } from "./views/map.js";
import { createMapResize } from "./views/map-resize.js";
import { createMonthGrid } from "./views/month-grid.js";
import { createNotices } from "./views/notices.js";
import { createPicker } from "./views/picker.js";
import { createPickerHover } from "./views/picker-hover.js";
import { createPickerResize } from "./views/picker-resize.js";
import { createCustomPlaceForm } from "./views/settings-custom-place.js";
import { createFileSection } from "./views/settings-file.js";
import { createImportDialog } from "./views/import-dialog.js";
import { createHolidaysSection } from "./views/settings-holidays.js";
import { createPlaceList } from "./views/settings-places.js";
import { setUpSettingsTabs } from "./views/settings-tabs.js";
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
const mapLimits = { minHeight: config.mapMinHeight, maxHeight: config.mapMaxHeight };
const controller = createController({
  api: { getHolidays },
  holidayTable: { isTableCountry, tableHolidays },
  storage: createStorage({
    store: localStorage,
    parse: (value) => parseSettings(value, { ...pickerLimits, mapLimits }),
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
  mapLimits,
});
const lookup = {
  cities: listCities(),
  placeFacts,
  offsetAt: zoneOffset,
  placeWeekendDays,
  countryWeekendDays,
};
const importDialog = createImportDialog(document, {
  dispatch: controller.dispatch,
  removalPlanOf: importRemovalPlan,
});
const views = [
  createTheme(document),
  createHeader(document),
  createEmptyPage(document),
  createNotices(document, { dispatch: controller.dispatch, placeName, countryName }),
  createMap(document, { placeName, pinOf: placePin }),
  createMapResize(document, {
    dispatch: controller.dispatch,
    limits: { ...mapLimits, stepPx: config.mapHeightStepPx },
  }),
  createMonthGrid(document, {
    dispatch: controller.dispatch,
    placeFacts,
    makeHijriNote: createHijriNote,
    makeCellCard: createCellCard,
    makeDayMenu: (doc, root, lookup) =>
      createDayMenu(doc, root, {
        ...lookup,
        choicesOf: dayMenuChoices,
        dispatch: controller.dispatch,
        dialog: createDayDialog(doc, { dispatch: controller.dispatch, checkVacation }),
      }),
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
    makeResize: (handle) =>
      createPickerResize(handle, {
        dispatch: controller.dispatch,
        limits: { minHours: config.pickerMinHours, maxHours: config.pickerMaxHours },
      }),
    makeHover: (rows) =>
      createPickerHover(rows, { localAt: localDateTime, stepMinutes: config.pickerStepMinutes }),
  }),
  createLegend(document),
  importDialog,
  createSettingsPanel(document, {
    defaultHours: { start: config.defaultWorkStartMinutes, end: config.defaultWorkEndMinutes },
    hoursStepMinutes: config.workingHoursStepMinutes,
    dispatch: controller.dispatch,
    lookup,
    setUpTabs: setUpSettingsTabs,
    makeList: (list) => createPlaceList(document, list, { dispatch: controller.dispatch, lookup }),
    makeHolidays: (section) =>
      createHolidaysSection(document, section, {
        dispatch: controller.dispatch,
        countriesOf: holidayCountries,
        countryName,
      }),
    makeFile: (card) =>
      createFileSection(document, card, {
        dispatch: controller.dispatch,
        askRemove: importDialog.askRemove,
        countsOf: importCounts,
      }),
    makeCustomPlace: (card) =>
      createCustomPlaceForm(card, {
        dispatch: controller.dispatch,
        zones: listZones(),
        countries: listAllCountries(),
        offsetAt: zoneOffset,
      }),
  }),
];

controller.subscribe((view) => views.forEach((part) => part.render(view)));
bindActions(document, controller.dispatch);
setInterval(() => controller.dispatch({ type: "tick" }), config.clockTickMs);
void controller.dispatch({ type: "open" });
