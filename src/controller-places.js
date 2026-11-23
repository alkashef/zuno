// @ts-check
/**
 * @module controller-places
 * The place side of the page workflows that DEC-029 adds: the handler of `addCustomPlace`, which
 * checks the name, the time zone and the country, makes a custom place with a free `place-N` id and
 * hands the new place list to controller.js, which saves it and asks for its country's holidays
 * (SET-018, SET-004, DEC-022, DEC-029). It keeps no state, saves nothing itself and asks the holiday
 * service for nothing (controller.js does all three, through the `changePlaces` it passes in). The
 * existing place actions stay in controller.js. Only controller.js imports it.
 */
import { addPlace, createCustomPlace, isCustomPlaceEntry } from "./domain/places.js";

/** @typedef {import("./domain/places.js").Place} Place */

/**
 * @typedef {{ type: "addCustomPlace", name: string, zone: string, countryCode: string }} PlaceAction
 *   The actions this module handles (SET-018).
 */

/**
 * @template Ctx
 * @typedef {(ctx: Ctx, change: (places: Place[]) => Place[]) => Promise<void>} ChangePlaces
 *   Applies a change to the place list, saves the settings and asks for the holidays they need
 *   (controller.js).
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
 * @returns {(ctx: Ctx, action: PlaceAction) => Promise<void>} The handler that adds a custom place
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
 * The handlers of the place actions this module owns.
 * @template Ctx
 * @param {ChangePlaces<Ctx>} changePlaces controller.js's commit of a changed place list.
 * @returns {Record<PlaceAction["type"], (ctx: Ctx, action: PlaceAction) => Promise<void>>}
 */
export function placeHandlers(changePlaces) {
  return { addCustomPlace: addCustomPlace(changePlaces) };
}
