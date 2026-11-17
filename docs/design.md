# Design — Zuno

How to build what `spec.md` says. If this file and the spec disagree, the spec wins.

Review state: Draft. The user approved DEC-002, DEC-005, DEC-008 and DEC-011 in chat on
2026-11-17. The design as a whole is not yet approved: the open items in section 5 remain.
Spec baseline: `docs/spec.md`, Approved 2026-11-17, with the changes the user approved that day
(MAP-001, SET-009 to SET-011, PCK-007, LAY-001, THM-001, and the changes to HIJ-001 to HIJ-003 and
CAL-006).
Visual reference (not code to copy): the "Zuno UI" canvas,
https://claude.ai/artifact/2GmNVHXyaLzy3E5XxUJPRB (light and dark Main page, Settings panel and
empty state). The app is called Zuno. The canvas and the code still show the working title "Global
Timer" until the user locks the UI; the repo rename and the title and subtitle in the UI come then.

## 1. Decisions

One current decision per topic. Replaced decisions live in Git history.

| ID | Decision | Why and references |
| --- | --- | --- |
| DEC-001 | Plain JavaScript (ES modules, JSDoc types checked by `tsc`), plain HTML and CSS. No framework, no runtime dependency. All time, weekend and Hijri maths use the browser's built-in `Intl`. | PKG-001, NFR-002, project rules. A page this size needs no framework. |
| DEC-002 | Source is many small files; a build script bundles them into one HTML file. The build uses esbuild as a dev-only tool. | PKG-001 needs one file; the rules need small separate files. Deviates from the rule "no build step". Approved by the user 2026-11-17. |
| DEC-003 | Weekends come from `Intl.Locale.getWeekInfo()`. Hijri dates come from `Intl.DateTimeFormat` with `islamic-umalqura` (Umm al-Qura) and `islamic-civil` (tabular). | CAL-002, HIJ-001 to HIJ-003, EX-002, EX-010. Closes the open weekend-source item in spec section 7. |
| DEC-004 | A built-in country table (`data/countries.js`) gives each country's code, capital zone, other zones and map coordinates. Country and month names come from `Intl`. | SET-002, SET-003, NFR-003, map. The browser has no country-to-time-zone data. |
| DEC-005 | Public holidays come from the Nager.Date public-holiday service. The page sends it only a country code and a year. | HOL-001 to HOL-004, REF-002, NFR-001. Outside data flow approved by the user 2026-11-17. Checked 2026-11-17: both API versions answer with `access-control-allow-origin: *`. Terms of service still unread (section 5). |
| DEC-006 | `api.js` returns an expected service failure as data (`HolidayResult`), not as a thrown error. Unexpected errors still reach the top-level handler. | REF-002, HOL-004. The rules say catch only in `api.js`; this is the one case where the spec defines the recovery. |
| DEC-007 | Layers: pure domain logic, one pure controller, DOM views, and three leaf modules for the outside world (`api.js`, `storage.js`, `clock.js`). `main.js` only wires them. | Project architecture rules; makes every workflow testable with fakes. |
| DEC-008 | Settings are saved in `localStorage` as one versioned record. Holiday data is kept in memory only. | SET-004. The rule says app data never goes in `localStorage`; settings are treated as user preferences. Approved by the user 2026-11-17. |
| DEC-009 | All colours and shapes are CSS custom properties in `theme.css`. Light and dark themes follow `prefers-color-scheme`. There is no on-page toggle. Every box, button and control has square corners. | THM-001. User decisions 2026-11-17 (Lagoon light, Midnight dark, square corners). |
| DEC-010 | The world map is a static SVG of simplified outlines inside `index.html`. Each place is a pin positioned by CSS custom properties. | MAP-001. The user chose on 2026-11-17 to keep the hand-drawn outlines for the first release; better data (for example Natural Earth) can replace them later without a layout change. |
| DEC-011 | Unit tests use `node --test`. Browser tests use Playwright (Chromium, Firefox, WebKit, and Edge through the `msedge` channel) with the holiday service faked by request routing. | NFR-002, NFR-001, CLAUDE.md testing rules. New dev dependency approved by the user 2026-11-17. |
| DEC-012 | The build adds a Content-Security-Policy `<meta>` tag with hashes of the inline script and style. It allows requests only to the holiday host. | NFR-001. A browser-enforced backstop for the automated request check. |
| DEC-013 | The built file is meant to be hosted on the user's GitHub Pages as a static site, and can also be opened as a file. | User suggestion 2026-11-17. PKG-001. Pages serves the page over `https`, so its origin is never `null`. |

### Detail

**DEC-001.** Alternative: a framework (React or similar). Rejected: it adds a build and dependency
for a page with few views, and the rules forbid a framework unless the design chooses one.
Consequence: DOM updates are written by hand in view modules. Validation: `npm run typecheck`,
`npm run lint`. Revisit when views need shared reactive state that hand-written updates cannot keep
simple.

**DEC-002.** Alternatives: (a) one hand-written 3,000-line HTML file, rejected: it breaks the file
and function size limits and cannot be checked per module; (b) a build script with no dependency
that joins modules, rejected: it would have to rewrite `import` lines and is easy to break;
(c) esbuild, chosen: it bundles modules and CSS reliably. The build script
`scripts/build.mjs` runs esbuild, then writes `dist/zuno.html` with the CSS in one `<style>`
and the JavaScript in one `<script>`. Consequences: one new dev dependency; `dist/` is generated and
not committed; ESLint and Prettier must ignore `dist/` (editing their configs asks the user).
Evidence: esbuild documents `build()` with `bundle` and `write: false` (esbuild.github.io/api,
checked 2026-11-17). Verified at install (2026-11-17): licence MIT, one install script. `styles.css` is a second esbuild
entry point, so `main.js` imports no CSS.
Validation: `tests/unit/build.test.js` builds the file and asserts it has no `src=`, `href=` or
`import` to another file (PKG-001).

**DEC-003.** `getWeekInfo()` returns the weekend days (1 = Monday to 7 = Sunday). MDN marks it
Baseline 2026, newly available since July 2026, so the latest Chrome, Edge, Firefox and Safari have
it (developer.mozilla.org, checked 2026-11-17). Alternative: an embedded table of weekends. Rejected:
more data to keep right, and the browser already carries CLDR data. Hijri: "tabular" is
`islamic-civil`; `islamic-tbla` differs only by epoch day. The adjustment (-1, 0, +1) shifts the
place's local calendar date before conversion. Risk: browsers can lag CLDR when a country changes
its weekend. Validation: browser tests for EX-002 and EX-010 in all four browsers, plus a
differing-variant example (spec section 7). Planned.

**DEC-004.** The table has one row per country: ISO code, capital label, capital zone, other zones
with city labels, and latitude and longitude for each zone. Source: the IANA time-zone database
`zone.tab` (zones, coordinates, public domain) with the capital chosen per country. Country names
use `Intl.DisplayNames`; month and weekday names use `Intl` in English (NFR-003). Validation:
a unit test checks every zone is valid for `Intl.DateTimeFormat` and every country has a capital
row. Planned.

**DEC-005.** Alternatives: (a) OpenHolidays, rejected: it lists 36 countries and has none of the
United States, the United Kingdom, Saudi Arabia or Japan (openholidaysapi.org, checked 2026-11-17);
(b) a paid keyed service, rejected: a key cannot live in a shared single file (secrets rule);
(c) an embedded holiday dataset, rejected: HOL-001 and the binding constraint require a service.
Nager.Date: free, no key, "No Rate Limits" and "CORS Enabled" per its own page, more than 200
countries. The site moved from `date.nager.at` to `nagerholidays.com`; the current page documents
`GET /api/v4/Holidays/{CountryCode}/{Year}` returning `date`, `name`, `countryCode`,
`subdivisionCodes`, `nationalHoliday` and `holidayTypes` (`Public`, `Bank`, `School`,
`Authorities`, `Optional`, `Observance`). Older sources describe `/api/v3/PublicHolidays/{year}/{code}`
with `counties`, `global` and `types`. One third-party directory reports a browser CORS error. So
the contract and CORS are unverified (section 5). Holidays of type `Public` count; the other types
do not (HOL-003). The page sends nothing else: no user data, no settings (HOL-002).

**DEC-006.** `HolidayResult` is `{ status: "loaded", holidays }` or `{ status: "unavailable",
reason }`. A network failure, a non-success HTTP status, or a body that is not the documented shape
all give `unavailable` with the reason. A call with a bad argument (a programming error) throws.
Consequence: the controller can show REF-002 without a `try/catch`. Validation: unit tests for
`api.js` with a fake `fetch`.

**DEC-008.** Alternatives: cookies (rejected: sent to servers), IndexedDB (rejected: more code for
one small record). The record holds places, working hours, and the display switches, never holiday
data. If the stored record is missing or fails validation, the page treats it as "no saved
settings" and shows the empty page (SET-007) and logs a warning. Revisit when settings need to be
shared between browsers (a spec exclusion today).

**DEC-009.** Square corners everywhere, 1 px lines, 44 px minimum height for buttons and inputs.
Type is a rounded system stack (`ui-rounded`, then `system-ui`); no web fonts (NFR-001). The
semantic colours differ in lightness as well as hue (the accepted colour-blind risk in spec
section 7 stays). Palette (hex) until `theme.css` exists:

| Token | Light | Dark |
| --- | --- | --- |
| page, card | `#EAF6F6`, `#FFFFFF` | `#07090D`, `#10131A` |
| text, muted text, secondary text | `#0E2A33`, `#4F6F78`, `#1F4450` | `#EAEEF5`, `#9BA4B5`, `#C3CBD8` |
| card line, hairline, control line, input line | `#D5EAEA`, `#E3F1F1`, `#B6D4D6`, `#6B979D` | `#1E2433`, `#1B2030`, `#363E52`, `#5A647C` |
| working hours, non-working hours, day off (picker) | `#12B886`, `#E4F1F1`, `#0F4C5C` | `#1FD1A5`, `#1A2030`, `#6E5BE6` |
| weekend, public holiday (month grid) | `#FFD166`, `#FF6B6B` | `#F2B63D`, `#FF4F8B` |
| today outline, Hijri text, reference row | `#6C5CE7`, `#C0267C`, `#DFF3F3` | `#5BC8FF`, `#C7AEFF`, `#161B2A` |
| map sea, map land, danger | `#BFE9F2`, `#FFE6B8`, `#C9344A` | `#0B0F18`, `#222B40`, `#FF7A9E` |

Validation: browser tests check the text contrast of every text token on its background (4.5:1).
Planned.

**DEC-011.** Alternative: Cypress, or a hand-driven browser. Rejected: Playwright drives Chromium,
Firefox and WebKit from one test suite and covers Edge through the `msedge` channel, which does not
ship with Playwright (playwright.dev/docs/browsers, checked 2026-11-17). Consequence: browsers
download on first setup. The holiday service is faked in every test; no test touches a live server
(testing rules). Coverage on `src/` has a floor of 80%; the Node coverage flags are to be verified
at implementation.

## 2. Architecture

### 2.1 Components

| Component | Responsibility and owned state | Allowed dependencies | References |
| --- | --- | --- | --- |
| `main.js` | Creates the state object, the controller and the views, connects them, starts the clock tick, and holds the top-level error handler. Holds no logic. | everything | DEC-007 |
| `config.js` | One frozen object of behaviour values (section 2.3). | none | |
| `log.js` | The only user of `console`. | `config.js` | |
| `api.js` | The only user of `fetch`. Gets one country-year of holidays and returns a `HolidayResult`. | `config.js`, `log.js` | HOL-001, HOL-002, DEC-006 |
| `storage.js` | The only user of `localStorage`. Reads and writes the settings record. | `config.js`, `log.js` | SET-004, DEC-008 |
| `clock.js` | The only reader of the current time and of the colour-scheme query. | none | CLK-001, CLK-003 |
| `domain/zones.js` | Local date and time of an instant in a time zone, with DST. | none | CLK-002, EX-001 |
| `domain/format.js` | Formats dates, times and Hijri dates. | `domain/hijri.js` types | DSP-001 to DSP-003 |
| `domain/hijri.js` | Hijri date of a local date for a variant and an adjustment. | none | HIJ-001 to HIJ-003, EX-010 |
| `domain/weekends.js` | Weekend days of a country. | none | CAL-002 |
| `domain/countries.js` | Country list, names, capital zone and other zones. | `data/countries.js` | SET-002, SET-003 |
| `domain/holidays.js` | Turns a `HolidayResult` into per-day facts for a place; lists regions; reports missing data. | none | HOL-003, HOL-004, REF-002 |
| `domain/places.js` | Adds, removes, moves, relabels and edits places; applies defaults. | `domain/countries.js` | SET-001 to SET-003, SET-006, SET-008, SET-009 |
| `domain/settings.js` | Settings shape, defaults and validation. | `domain/places.js` | SET-005, SET-007, SET-010, SET-011 |
| `domain/calendar.js` | The month-grid model: one row per place, one cell per day. | `zones`, `hijri`, `weekends`, `holidays` | CAL-001 to CAL-007 |
| `domain/picker.js` | The picker model: the reference window, one row of segments per place, and local times at the marker. | `zones`, `weekends`, `holidays` | PCK-001 to PCK-006, PCK-007 |
| `controller.js` | The workflows. Applies an action to the state, asks `api.js` for holidays, saves settings. Pure apart from its injected `api`, `storage` and `clock`. | `domain/*` | all workflows |
| `views/*.js` | One view per screen part (header, notices, map, picker, day selector, month grid, legend, settings, empty page). Each owns its own DOM, clones `<template>` elements, and sends events up. | `domain/format.js` types | |

Import rules: `domain/*` imports only other `domain/*` modules and `data/*`. `controller.js`
imports `domain/*` only. Views import `domain/format.js` and receive everything else as arguments.
`api.js`, `storage.js` and `clock.js` import `config.js` and `log.js` only. Only `main.js` imports
across layers. A unit test (planned) walks the imports and fails on a broken rule.

### 2.2 Directory structure

Create a folder only when it is listed here.

| Path | Purpose and owner |
| --- | --- |
| `src/` | Source. Holds `index.html`, `main.js`, `config.js`, `log.js`, `api.js`, `storage.js`, `clock.js`, `controller.js` and the sheets `theme.css`, `base.css`, `layout.css` plus one sheet per view. |
| `src/assets/` | Images the page uses. Holds `zuno-logo.jpg`, the app logo (290 by 292 pixels, 24 KB; the user shrank it by hand on 2026-11-17, so the one-file page stays small). |
| `src/domain/` | Pure logic modules from section 2.1. |
| `src/views/` | View modules, one per screen part. |
| `data/` | `countries.js` (the country table). Input data, read by `domain/countries.js`. |
| `dist/` | The built one-file page. Generated by `scripts/build.mjs`; not committed. |
| `tests/unit/` | `node --test` tests, one file per source module. |
| `tests/e2e/` | Workflow tests through `controller.js` with fakes for `api`, `storage` and `clock`. |
| `tests/e2e/ui/` | Playwright tests of the built file. |
| `scripts/` | Adds `build.mjs`. The other scripts are unchanged. |
| `docs/`, `config/`, `.claude/`, `.githooks/`, `.vscode/` | Unchanged. `config/.env` stays unused: the page has no secrets and no environment. |

### 2.3 Settings

All values live in `config.js` as one frozen object. The page has no environment, so
`config/.env.example` stays empty.

| Setting | Default | Meaning and references |
| --- | --- | --- |
| `holidayServiceBaseUrl` | `https://nagerholidays.com/api/v4` | Base URL of the holiday service. Unverified; see section 5. HOL-001 |
| `holidayRequestTimeoutMs` | 10000 | Time to wait for one holiday request. A proposed value, not from the spec. |
| `clockTickMs` | 60000 | How often the current times update. CLK-003 |
| `storageKey` | `zuno.settings` | Key of the saved settings record. SET-004 |
| `defaultWorkStartMinutes`, `defaultWorkEndMinutes` | 540, 1020 | 9:00 AM and 5:00 PM. SET-005 |
| `logLevel` | `warn` | Lowest level `log.js` prints. |

Fixed vocabularies are frozen objects in the owning module: the Hijri variants
(`umalqura`, `tabular`) in `domain/hijri.js`, the Hijri adjustment range (-1 to +1, HIJ-003) in
`domain/hijri.js`, the holiday types in `domain/holidays.js`, and the day kinds
(`working`, `nonWorking`, `dayOff`) in `domain/picker.js`.

### 2.4 Technology choices

Exact versions of installed packages are in `package.json`.

| Technology | Role | Decision | State and constraint | Source, date checked |
| --- | --- | --- | --- | --- |
| JavaScript, `Intl` | Time zones, weekends, Hijri, names | DEC-001, DEC-003 | Existing. Needs the latest desktop browsers (NFR-002). | MDN `getWeekInfo`, 2026-11-17 |
| TypeScript compiler, ESLint, Prettier, Stylelint | Checks | Existing in `package.json` | Existing | |
| `node --test` | Unit and workflow tests | DEC-011 | Existing | |
| esbuild | Bundles modules and CSS for the one-file build | DEC-002 | Installed 0.28.2, dev-only. Licence MIT; one install script (`postinstall: node install.js`), checked at npm on 2026-11-17. | esbuild.github.io/api, 2026-11-17 |
| Playwright | Browser tests | DEC-011 | Proposed, dev-only. Needs approval. | playwright.dev/docs/browsers, 2026-11-17 |
| Nager.Date | Public holidays | DEC-005 | Proposed. Needs approval. Contract and CORS unverified. | nagerholidays.com/Api, 2026-11-17 |
| IANA `zone.tab` | Zones and coordinates for `data/countries.js` | DEC-004 | Proposed data source. | iana.org/time-zones |
| Database, server, LLM, framework | none | | The page is local with one outside service. | |

### 2.5 Critical flows and operations

**Open the page (PCK-004, CLK-001, SET-007, HOL-001).** `main.js` reads the settings through
`storage.js`. With no saved places it shows the empty page and stops (SET-007). Otherwise it sets
the marker to the current instant (PCK-004), draws every view from the zones, weekends and any
holidays already in memory, and asks `api.js` for each needed country and year. A country-year is
requested once, however many places share the country. The years needed are those of the shown
month and of the marker's window. Each answer redraws the month grid and the picker. A failed
answer is kept as `unavailable` and shown in the notices (REF-002).

**Move the marker or choose a day (PCK-002, PCK-006, PCK-007).** The controller sets the marker
instant. `domain/picker.js` returns the window from local midnight to the next local midnight of the
first place, one row per place, and each place's local date and time. If the new window needs a
year not yet loaded, the controller requests it. The window is the real elapsed time, so on a
daylight-saving change day it is 23 or 25 hours (user decision 2026-11-17; PCK-006).

**Refresh (REF-001).** The controller clears every `HolidayResult`, requests all needed country-years
again, and redraws. Times need no refresh, as the clock tick covers them.

**Clock tick (CLK-003).** Every `clockTickMs`, `main.js` calls the controller with the new current
instant; only the map labels and the "Updated" time change. The marker does not move.

**Change settings (SET-001 to SET-011).** The controller validates the change through
`domain/settings.js`, saves it through `storage.js`, and redraws. A new place asks for holidays for
its country if they are missing. A removed place drops no data that another place still uses.

**Notices (REF-002, HOL-004).** `domain/holidays.js` lists the countries whose result is
`unavailable` and the places whose chosen region cannot be served because the country's loaded
result has no regional holiday for any region (user decision 2026-11-17; HOL-004). The
notices view shows both lists in the card behind the information button, with a count badge.

**Failures.** The holiday service down or slow: `unavailable`, the page stays useful (REF-002).
Stored settings invalid: the empty page and a logged warning (DEC-008). A thrown error anywhere
else: the top-level handler shows the error and the stack and logs it (project rule).

**External data flow.** One flow leaves the machine: a `GET` to the holiday service with a country
code and a year (HOL-002, DEC-005). Nothing else is sent, no cookie, no header with user data. The
Content-Security-Policy tag (DEC-012) blocks any other request.

## 3. Data model

All types are JSDoc `@typedef`s in the module that owns them.

| Type | Fields | Owner and rules |
| --- | --- | --- |
| `Place` | `id` (string, unique), `countryCode` (ISO 3166-1 alpha-2), `zone` (IANA name), `label` (display name, empty means the city name), `region` (code, empty means national only), `hijriVariant` (`umalqura` or `tabular`), `hijriAdjust` (-1, 0 or 1) | `domain/places.js`. The list order is the display order; the first place is the picker's reference (PCK-006). A new place gets the capital zone (SET-002). |
| `Settings` | `version`, `places` (list of `Place`), `workStartMinutes`, `workEndMinutes`, `showCountry` (false by default), `showHijri` (false by default) | `domain/settings.js`. Saved as one JSON record. Start must be before end. |
| `Country` | `code`, `capital` (label, zone, latitude, longitude), `zones` (list of label, zone, latitude, longitude) | `data/countries.js`. A country with one zone has an empty `zones` list beyond the capital. SET-003 applies when it has more than one. |
| `Holiday` | `date` (`YYYY-MM-DD`), `name`, `regions` (list of codes, or empty for national) | `domain/holidays.js`, made from the service record. Only type `Public` is kept. |
| `HolidayResult` | `status` (`loaded` or `unavailable`), `holidays` or `reason` | `api.js`. Kept in memory per country and year. |
| `Marker` | `instant` (UTC milliseconds) | State in `main.js`. Starts at the current instant. |
| `DayFacts` | `date`, `isWeekend`, `holidayName` or none, `isToday`, `hijri` (day, month, year, or none) | `domain/calendar.js`. Today is the place's own local date (CAL-004). |
| `PickerRow` | `placeId`, `localDateTime` of the marker, `segments` (list of `{ from, to, kind }`) | `domain/picker.js`. Segments cover the window exactly. Weekend and holiday time is `dayOff` (PCK-005). |

Integrity: a `Place` whose `zone` is not valid for `Intl` or whose `countryCode` is not in the
table fails validation. Holiday data and the marker are never saved. Migration: `Settings.version`
is 1; an unknown version is invalid (DEC-008).

## 4. Interfaces

**Module contracts** (all functions have JSDoc with parameter and return types):

- `api.getHolidays(countryCode, year, fetchFn?) -> Promise<HolidayResult>`. Sends only the code and
  the year. Throws only for a bad argument.
- `storage.load() -> Settings | null`, `storage.save(settings) -> void`. `load` returns `null` when
  nothing valid is stored.
- `clock.now() -> number`, `clock.prefersDark() -> boolean`.
- `controller.createController({ api, storage, clock }) -> { getState, dispatch, subscribe }`.
  Actions: `open`, `refresh`, `tick`, `setMarker`, `shiftMarkerDay`, `showMonth`, `addPlace`,
  `removePlace`, `movePlace`, `editPlace`, `setWorkingHours`, `setShowCountry`, `setShowHijri`,
  `selectHoliday`, `toggleNotices`, `openSettings`, `closeSettings`.
- `domain/picker.buildPicker(settings, marker, holidays) -> PickerRow[]` and
  `domain/calendar.buildMonth(settings, year, month, holidays, nowInstant) -> DayFacts[][]`.

**Screen parts and interaction states** (the canvas shows each; sizes and colours are in DEC-009):

- Header: title, "Updated" time, a notices button with a count badge, Refresh, Settings. The notices
  card opens and closes on the button; Escape closes it.
- Map: one pin per place with the place name, current time and date. Pins stay at their coordinates
  as the map grows and shrinks (the map stretches vertically; DEC-010).
- Month grid: previous and next month buttons; a Hijri month band and Hijri day in each cell only
  while Hijri is on; a place row with an information button only while a holiday cell in that row is
  selected; selecting a holiday cell opens a card with its name, date and (if Hijri is on) Hijri
  date. While Hijri is on, an information button beside the Hijri month band opens a card with the
  note that Hijri dates are calculated and may differ from official announcements (HIJ-004). The header and Hijri band stay in view while the rows scroll vertically.
- Picker panel (right side, flush to the page edge): day selector (previous day, a date button that
  opens a month calendar, next day); hour axis; one row per place with the marker. The marker
  can be dragged or moved with the arrow keys; the axis stays in view while rows scroll. The first
  place's row has the reference background.
- Legend: a banner fixed to the bottom of the page, full width, naming every colour (LEG-001).
- Settings panel: working hours; Display (country names, Hijri); places (reorder with arrows,
  expand to edit display name, time zone, region, Hijri variant and adjustment, remove); add a
  place by country. Regions are listed by the service's code (for example `BR-SP`), as the user
  decided 2026-11-17; the canvas shows names only as a mock-up.
- Empty page: prompt to add a place (SET-007).

Keyboard and accessibility: every control is a real `<button>`, `<a>`, `<input>` or `<select>`;
every icon-only button has an `aria-label`; popovers close on Escape and return focus to the button
that opened them.

**Validation and errors.** Invalid input (a working-hours end before the start, no country chosen)
is refused by `domain/settings.js` and the view shows the field as invalid; it is not an error.
Everything else follows DEC-006 and the top-level handler.

## 5. Unresolved risks and design checks

| Issue and references | Owner | Evidence needed | Blocks what? |
| --- | --- | --- | --- |
| Holiday service terms of service (use, availability, any limit on a hosted page). DEC-005. The CORS and contract check ran on 2026-11-17: `curl` with `Origin: null` to `/api/v4/Holidays/US/2026` and `/api/v3/PublicHolidays/2026/US` gave HTTP 200, `access-control-allow-origin: *`, and the documented fields for each version. Version 4 is the current one. | User | Read the service's terms page. | None until release. |
| Installing Playwright: approved as a dev dependency (DEC-011), but the install itself waits for the milestone that first imports it (CLAUDE.md, Dependencies). The exact version is pinned then. (esbuild: installed in M1, see section 2.4.) | Implementation | Version and licence check at install time. | The browser-test milestone. |
| Country table accuracy (capital zone choices). DEC-004 | Implementation | Unit test of every row; the user reviews the capital list. | Add-place milestone. |
| Weekend data lags a recent country change. DEC-003 | Accepted risk | EX-002 in four browsers. | None. |
| English Hijri month names (for example `Jumada II`) from `Intl` in all four browsers. EX-010 | Implementation | Browser test of EX-010 in four browsers. | HIJ milestone. |
| JavaScript coverage flags for `node --test` (floor 80%). | Implementation | Run the flags in the Node version in use. | Test milestone. |
| `dist/` must be ignored by ESLint and Prettier; `.gitignore` needs `dist/`. | User (edits to config ask) | Approval of the edits. | Build milestone. |
