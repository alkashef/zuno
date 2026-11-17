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
import { listCountries } from "./domain/countries.js";
import { placeClock, placeName, zonesOf } from "./domain/places.js";
import { parseSettings } from "./domain/settings.js";
import { log } from "./log.js";
import { createStorage } from "./storage.js";
import { bindActions } from "./views/actions.js";
import { createEmptyPage } from "./views/empty.js";
import { createErrorScreen } from "./views/error-screen.js";
import { createHeader } from "./views/header.js";
import { createPlaceList } from "./views/settings-places.js";
import { createSettingsPanel } from "./views/settings.js";

const errorScreen = createErrorScreen(document);

/** @param {unknown} failure An unexpected error: logged and shown on screen with its stack. */
function reportFailure(failure) {
  log.error("Unexpected error", failure);
  errorScreen.show(failure);
}

window.addEventListener("error", (event) => reportFailure(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => reportFailure(event.reason));

const controller = createController({
  api: { getHolidays },
  storage: createStorage({ store: localStorage, parse: parseSettings }),
  clock,
  defaultHours: { start: config.defaultWorkStartMinutes, end: config.defaultWorkEndMinutes },
});
const lookup = { countries: listCountries(), zonesOf, placeName, clockOf: placeClock };
const views = [
  createHeader(document),
  createEmptyPage(document),
  createSettingsPanel(document, {
    defaultHours: { start: config.defaultWorkStartMinutes, end: config.defaultWorkEndMinutes },
    dispatch: controller.dispatch,
    lookup,
    makeList: (list) => createPlaceList(document, list, { dispatch: controller.dispatch, lookup }),
  }),
];

controller.subscribe((view) => views.forEach((part) => part.render(view)));
bindActions(document, controller.dispatch);
setInterval(() => controller.dispatch({ type: "tick" }), config.clockTickMs);
void controller.dispatch({ type: "open" });
