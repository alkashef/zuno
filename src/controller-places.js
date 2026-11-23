// @ts-check
/**
 * @module controller-places
 * The place side of the page workflows that DEC-029 and DEC-030 add: the handler of `addCustomPlace`,
 * which checks the name, the time zone and the country, makes a custom place with a free `place-N`
 * id; and the handlers of `addVacation`, `changeVacation` and `removeVacation`, which change one
 * place's vacations. Each hands the new place list to controller.js, which saves it and asks for its
 * country's holidays (SET-018, VAC-002, VAC-003, VAC-005, VAC-006, SET-004, DEC-022, DEC-029,
 * DEC-030). It keeps no state, saves nothing itself and asks the holiday
 * service for nothing (controller.js does all three, through the `changePlaces` it passes in). The
 * existing place actions stay in controller.js. Only controller.js imports it.
 */
import { addPlace, createCustomPlace, isCustomPlaceEntry } from "./domain/places.js";
import { addVacation, changeVacation, removeVacation } from "./domain/vacations.js";

/** @typedef {import("./domain/places.js").Place} Place */
/** @typedef {import("./domain/vacations.js").Vacation} Vacation */
/** @typedef {{ start: string, end: string, label: string }} VacationFields */

/**
 * @typedef {{ type: "addCustomPlace", name: string, zone: string, countryCode: string }
 *   | ({ type: "addVacation", placeId: string } & VacationFields)
 *   | { type: "changeVacation", placeId: string, original: Vacation, changes: VacationFields }
 *   | { type: "removeVacation", placeId: string, vacation: Vacation }} PlaceAction
 *   The actions this module handles (SET-018, VAC-002, VAC-005).
 */

/**
 * @template Ctx
 * @typedef {(ctx: Ctx, change: (places: Place[]) => Place[] | null) => Promise<void>} ChangePlaces
 *   Applies a change to the place list, saves the settings and asks for the holidays they need
 *   (controller.js). A change that returns `null` is refused: nothing is saved or shown.
 */

/**
 * @param {Place[]} places
 * @returns {string} An id such as `place-3` that no place in the list has.
 */
export function nextPlaceId(places) {
  const taken = new Set(places.map((place) => place.id));
  let number = places.length + 1;
  while (taken.has(`place-${number}`)) number += 1;
  return `place-${number}`;
}

/**
 * @template Ctx
 * @param {ChangePlaces<Ctx>} changePlaces
 * @returns {(ctx: Ctx, action: Extract<PlaceAction, { type: "addCustomPlace" }>) => Promise<void>}
 *   The handler that adds a custom place
 *   at the end of the list (SET-018). An empty name, or a zone or a country outside the tables, is
 *   refused and nothing is saved.
 */
function addCustomPlace(changePlaces) {
  return (ctx, { name, zone, countryCode }) => {
    const entry = { name, zone, countryCode };
    if (!isCustomPlaceEntry(entry)) return Promise.resolve();
    return changePlaces(ctx, (places) =>
      addPlace(places, createCustomPlace(nextPlaceId(places), entry)),
    );
  };
}

/**
 * @param {Place[]} places
 * @param {string} placeId
 * @param {(vacations: Vacation[]) => Vacation[] | null} change
 * @returns {Place[] | null} The list with that place's vacations changed; `null` when the place is
 *   not in the list or the domain refuses the change (VAC-003).
 */
function withVacationsChanged(places, placeId, change) {
  const target = places.find((place) => place.id === placeId);
  const vacations = target === undefined ? null : change(target.vacations);
  if (target === undefined || vacations === null) return null;
  return places.map((place) => (place === target ? { ...place, vacations } : place));
}

/**
 * @template Ctx
 * @param {ChangePlaces<Ctx>} changePlaces
 * @returns {{ [Type in "addVacation" | "changeVacation" | "removeVacation"]: (ctx: Ctx, action: Extract<PlaceAction, { type: Type }>) => Promise<void> }}
 *   The handlers that add, change and remove a whole vacation of a place (VAC-002, VAC-005). A
 *   refused change, or a removal of a vacation that is not there, saves nothing (VAC-003).
 */
function vacationHandlers(changePlaces) {
  return {
    addVacation: (ctx, { placeId, start, end, label }) =>
      changePlaces(ctx, (places) =>
        withVacationsChanged(places, placeId, (list) => addVacation(list, { start, end, label })),
      ),
    changeVacation: (ctx, { placeId, original, changes }) =>
      changePlaces(ctx, (places) =>
        withVacationsChanged(places, placeId, (list) => changeVacation(list, original, changes)),
      ),
    removeVacation: (ctx, { placeId, vacation }) =>
      changePlaces(ctx, (places) =>
        withVacationsChanged(places, placeId, (list) => {
          const kept = removeVacation(list, vacation);
          return kept.length === list.length ? null : kept;
        }),
      ),
  };
}

/**
 * The handlers of the place actions this module owns.
 * @template Ctx
 * @param {ChangePlaces<Ctx>} changePlaces controller.js's commit of a changed place list.
 * @returns {Record<PlaceAction["type"], (ctx: Ctx, action: PlaceAction) => Promise<void>>}
 */
export function placeHandlers(changePlaces) {
  return /** @type {Record<PlaceAction["type"], (ctx: Ctx, action: PlaceAction) => Promise<void>>} */ ({
    addCustomPlace: addCustomPlace(changePlaces),
    ...vacationHandlers(changePlaces),
  });
}
