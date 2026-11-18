# Design — Zuno

How to build what `spec.md` says. If this file and the spec disagree, the spec wins.

Review state: Draft. The user approved DEC-002, DEC-005 and DEC-011 in chat on 2026-11-17.
The user approved DEC-015 to DEC-021 on 2026-11-18, in a dialog. M21 implemented DEC-015 and the
version 2 record of DEC-016 (places by city); M24 implemented DEC-017 without the holidays file; M25 implemented the holidays file (DEC-018);
M26 implemented DEC-019 without the resize handle and the hover label;
the code does not implement the rest yet (the milestones in `docs/plan.md` do). The design as a whole is not yet approved: the
open items in section 5 remain.
Spec baseline: `docs/spec.md` as approved on 2026-11-18, with the acceptance examples EX-011 to
EX-021.
Visual reference (not code to copy): the "Zuno UI" canvas,
https://claude.ai/artifact/2GmNVHXyaLzy3E5XxUJPRB (light and dark Main page, Settings panel and
empty state). The app is called Zuno. The canvas was updated on 2026-11-18 from the user's
comments; DEC-020 and DEC-021 record the look it shows. The canvas does not show the Holidays
section of the settings panel or the city list in "Add a place": section 4 is the reference there.

## 1. Decisions

One current decision per topic. Replaced decisions live in Git history.

| ID | Decision | Why and references |
| --- | --- | --- |
| DEC-001 | Plain JavaScript (ES modules, JSDoc types checked by `tsc`), plain HTML and CSS. No framework, no runtime dependency. All time, weekend and Hijri maths use the browser's built-in `Intl`. | PKG-001, NFR-002, project rules. A page this size needs no framework. |
| DEC-002 | Source is many small files; a build script bundles them into one HTML file. The build uses esbuild as a dev-only tool. | PKG-001 needs one file; the rules need small separate files. Deviates from the rule "no build step". Approved by the user 2026-11-17. |
| DEC-003 | Weekends come from `Intl.Locale.getWeekInfo()`. Hijri dates come from `Intl.DateTimeFormat` with `islamic-umalqura` (Umm al-Qura) and `islamic-civil` (tabular). | CAL-002, HIJ-001 to HIJ-003, EX-002, EX-010. Closes the open weekend-source item in spec section 7. |
| DEC-005 | Public holidays come from the Nager.Date public-holiday service. The page sends it only a country code and a year. | HOL-001 to HOL-004, REF-002, NFR-001. Outside data flow approved by the user 2026-11-17. Checked 2026-11-17: both API versions answer with `access-control-allow-origin: *`. Terms of service still unread (section 5). |
| DEC-006 | `api.js` returns an expected service failure as data (`HolidayResult`), not as a thrown error. Unexpected errors still reach the top-level handler. | REF-002, HOL-004. The rules say catch only in `api.js`; this is the one case where the spec defines the recovery. |
| DEC-007 | Layers: pure domain logic, one pure controller, DOM views, and three leaf modules for the outside world (`api.js`, `storage.js`, `clock.js`). `main.js` only wires them. | Project architecture rules; makes every workflow testable with fakes. |
| DEC-011 | Unit tests use `node --test`. Browser tests use Playwright (Chromium, Firefox, WebKit, and Edge through the `msedge` channel) with the holiday service faked by request routing. | NFR-002, NFR-001, CLAUDE.md testing rules. New dev dependency approved by the user 2026-11-17. |
| DEC-012 | The build adds a Content-Security-Policy `<meta>` tag with hashes of the inline script and style. It allows requests only to the holiday host. | NFR-001. A browser-enforced backstop for the automated request check. |
| DEC-013 | The built file is meant to be hosted on the user's GitHub Pages as a static site, and can also be opened as a file. | User suggestion 2026-11-17. PKG-001. Pages serves the page over `https`, so its origin is never `null`. |
| DEC-015 | A built-in city table (`data/cities.js`) holds the 55 cities of the spec's section 9: a stable id, the name, the country or territory code, the time zone and the map coordinates. A place is a city of that table. Country names come from `Intl`. The 245-country table is removed. | SET-002, SET-013, MAP-001, NFR-003. Replaces DEC-004 (user decision 2026-11-18: only these cities). |
| DEC-016 | Settings are saved in `localStorage` as one record of version 2. A record of version 1 (places by country) is not converted: it is read as "no saved settings", so the default places show. A version 2 place whose city is not in the table is dropped when the record is read. | SET-004, SET-014, SET-015, SET-016, LAY-003, SET-012. Replaces DEC-008 and DEC-014. Settings are user preferences, so the rule against app data in `localStorage` does not apply (approved 2026-11-17). |
| DEC-017 | The holidays a user adds or hides are a second `localStorage` record with the same shape as the holidays file. The controller applies them to the service's holidays before it builds the month grid and the picker. Holidays from the service are still kept in memory only. | HOL-003, HOL-006 to HOL-009. The user's own entries cannot be fetched again, so they must be saved. |
| DEC-018 | One new leaf module, `files.js`, is the only one that saves a file to the user's machine and reads a file the user picks. A picked file that is not JSON is returned as "unreadable" data, not thrown. | HOL-010 to HOL-012. Same pattern as DEC-006: the spec defines the recovery. Nothing is sent over the network (NFR-001). |
| DEC-019 | The picker window is `pickerHours` hour slots (a saved setting, 24 to `pickerMaxHours`) from midnight of the selected day in the first place. The selected day is state beside the marker. Every slot has the width `--picker-slot`; the panel's width follows the number of slots. | PCK-003, PCK-006 to PCK-009, LAY-002, LAY-003. User decisions 2026-11-18 (fixed slots, 24 hours or more, selected day). |
| DEC-020 | All colours and shapes are CSS custom properties in `theme.css`, each colour with its light and dark value in `light-dark()`; `views/theme.js` sets `data-theme` from the theme setting. Cards, buttons, inputs and popovers have rounded corners; month-grid cells stay square. Weekends are cyan. | THM-001, SET-012, LEG-001. Replaces DEC-009 (user decisions on the canvas, 2026-11-18: rounded corners, cyan weekend). |
| DEC-021 | The world map is a static SVG of simplified outlines inside `index.html` (latitude 80 to -58, stretched to fill the map). Each place is a location icon whose tip is on the place, with a label placed by `views/map.js` where it covers no other label or icon. | MAP-001. Replaces DEC-010 (user decision on the canvas, 2026-11-18: location icons instead of squares). |

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

**DEC-005.** Alternatives: (a) OpenHolidays, rejected: it lists 36 countries and has none of the
United States, the United Kingdom, Saudi Arabia or Japan (openholidaysapi.org, checked 2026-11-17);
(b) a paid keyed service, rejected: a key cannot live in a shared single file (secrets rule);
(c) an embedded holiday dataset, rejected: HOL-001 and the binding constraint require a service.
Nager.Date: free, no key, "No Rate Limits" and "CORS Enabled" per its own page, more than 200
countries. The site moved from `date.nager.at` to `nagerholidays.com`; the current page documents
`GET /api/v4/Holidays/{CountryCode}/{Year}` returning `date`, `name`, `countryCode`,
`subdivisionCodes`, `nationalHoliday` and `holidayTypes` (`Public`, `Bank`, `School`,
`Authorities`, `Optional`, `Observance`). Older sources describe `/api/v3/PublicHolidays/{year}/{code}`
with `counties`, `global` and `types`. One third-party directory reports a browser CORS error. The
contract and CORS were checked against the live service in M2 (section 5). Holidays of type `Public` count; the other types
do not (HOL-003). The page sends nothing else: no user data, no settings (HOL-002).

**DEC-006.** `HolidayResult` is `{ status: "loaded", holidays }` or `{ status: "unavailable",
reason }`. A network failure, a non-success HTTP status, or a body that is not the documented shape
all give `unavailable` with the reason. A call with a bad argument (a programming error) throws.
Consequence: the controller can show REF-002 without a `try/catch`. In `HolidayResult`, `holidays`
holds the validated service records; `domain/holidays.js` keeps the `Public` ones. A timeout
(`holidayRequestTimeoutMs`) counts as a network failure; `api.js` logs each `unavailable` result as
a warning. `api.js` sends `credentials: "omit"` and no header or body (HOL-002). Validation: unit
tests for `api.js` with a fake `fetch`.

**DEC-015.** `data/cities.js` exports a frozen list of `City` rows in the order of the spec's
section 9. The id is a lower-case slug of the name (`tokyo`, `new-delhi`, `washington-dc`) and never
changes once released, because saved places refer to it. Hong Kong has the code `HK` and Taiwan `TW`,
so each has its own holidays and weekend. Cities that share a clock share a zone (Canberra and
Sydney `Australia/Sydney`; Hyderabad, Mumbai, New Delhi and Pune `Asia/Kolkata`; Islamabad and Lahore
`Asia/Karachi`; Beijing `Asia/Shanghai`; Bern `Europe/Zurich`; Quito `America/Guayaquil`; Jerusalem and
Tel Aviv `Asia/Jerusalem`). Coordinates are each city's own, so a pin no longer sits on the city the
zone is named after. Alternative: keep the country table and filter it. Rejected: several listed
cities share a zone and a country, so the city, not the zone, must be the identity.
`domain/cities.js` replaces `domain/countries.js` and exposes `listCities`, `cityOf(id)` and
`countryName(code)`. Validation: `tests/unit/cities.test.js` checks 55 rows, unique ids, every zone
valid for `Intl.DateTimeFormat`, every code valid for `Intl.DisplayNames`, and that the smaller of
each zone's offsets on 1 January and 1 July 2026 equals the standard-time offset in the spec's
section 9.

**DEC-016.** The record: `version` (2), `places`, `workStartMinutes`, `workEndMinutes`,
`showCountry`, `showHijri`, `theme`, `pickerHours`. A stored place keeps `id`, `cityId`, `label`,
`region`, `weekendDays`, `hijriVariant` and `hijriAdjust`; its `countryCode` and `zone` are filled in
from the city table every time the record is read, so a correction of the table reaches saved
places. Alternatives: (a) convert version 1 places to the first city with the same country and zone,
rejected: only the user's own browser holds version 1 data and the user chose to drop places outside
the list; (b) invalidate the whole record when one city is unknown, rejected: SET-015 removes only
that place. With no valid record the controller uses `defaultSettings`, which holds the default
places (`defaultCityIds`, SET-014); nothing is written until the user changes a setting. The empty
page shows only while the settings hold no places (SET-007). A record without `pickerHours` or
`theme` gets the default. Validation: unit tests of `parseSettings` for a version 1 record, an
unknown city and a missing `pickerHours`.

**DEC-017.** `UserHolidays` is `{ version: 1, added: [...], hidden: [...] }`; each entry has
`countryCode`, `date` (`YYYY-MM-DD`) and `name`. An added holiday is one date and does not repeat
(spec section 7). A hidden entry names a service holiday by country, date and name.
`domain/user-holidays.js` (pure) adds, removes, hides, shows, merges (an import adds the entries
that are not already there, HOL-011), validates (`parseUserHolidays`, also the import check of
HOL-012) and applies them (`effectiveHolidays`: the service's list without the hidden ones, plus the
added ones as national holidays). The record's key is `holidaysStorageKey`. Alternative: keep them
inside the settings record. Rejected: the holidays file would then need its own shape, and a bad
import could damage the settings. Validation: unit tests of the module; controller tests for the
spec's examples of HOL-006 and HOL-008.

**DEC-018.** `files.saveJson(fileName, value)` builds a `Blob`, clicks a temporary link with the
`download` attribute and revokes the object URL. `files.readJson(file)` returns
`{ status: "read", value }` or `{ status: "unreadable" }` for text that is not JSON. The controller
receives `files` like `api` and `storage`, so tests use a fake. Risk: the page's Content-Security-Policy
(`default-src 'none'`) could block a `blob:` download in one of the four browsers. Validation: a
browser test of export in each browser; if one blocks it, the build adds the narrowest directive
that allows it. Implemented in M25: `createFiles({ doc, urls })` returns `saveJson` and `readJson`; `main.js` makes it with `document` and `URL`. The export browser test (`tests/e2e/ui/holidays-file.test.js`) passed in Chromium, Firefox, WebKit and Edge under the unchanged Content-Security-Policy, so the build adds no directive. The link is added to the page, clicked and removed, and the object URL is revoked right after the click.

**DEC-019.** State: `selectedDay` (a calendar date in the first place), `marker.instant`, and the
setting `pickerHours`. The window starts at the first instant of the selected day in the first
place and lasts `pickerHours` hours, or the length of that day when a clock change makes it 25 hours
and `pickerHours` is 24 (the one case where slots are narrower than `--picker-slot`). Moving the
marker never moves the window. Choosing a day sets `selectedDay` and moves the marker to it at the
same time of day (PCK-007). When the page opens, `selectedDay` is today in the first place (PCK-004).
If a change of the first place or of `pickerHours` leaves the marker outside the window, the marker
moves to the selected day at its time of day. The day selector shows the first and last date of the
window in the first place (`formatDateRange`, PCK-009). The panel's width is
`pickerHours` times `--picker-slot` plus its padding; `views/picker.js` turns a drag of the left
edge, or the arrow keys on that handle, into `setPickerHours` in whole slots, capped at
`pickerMaxHours` and at what fits beside a map of `--map-min-width`. Hover (PCK-008) is view state
only: the view converts the pointer's position to an instant on the `pickerStepMinutes` grid and
shows that place's local time and date in a label above the row. Alternative: a window centred on
the marker. Rejected by the user (dialog, 2026-11-18). Implemented in M26 (the handle and the hover
label are M27): a marker set at an instant outside the window stops at the window's first or last
minute; `parseSettings(value, limits)` gives a record without `pickerHours` the default and refuses
hours outside the limits; `views/picker.js` sets `--picker-hours` on the panel and `layout.css`
makes the panel `--picker-hours` times `--picker-slot` (17.5 px) plus its padding and border wide,
in an `auto` grid column (one column under 60rem, where the band fills the width). The hour lines
and axis labels are per hour of the window, so the 25-hour day at 24 slots has 25 narrower slots.

**DEC-020.** Token names in `theme.css` are `--color-<name>`, `--radius-<name>` and
`--space-<name>`. Corners: cards 14 px, buttons and inputs 10 px, small controls 8 px, chips 6 px,
swatches 4 px, popovers 12 px, the map 10 px, badges and handles fully round. Lines stay 1 px and
controls 44 px high. Type is a rounded system stack; no web fonts (NFR-001). Layout: the map sits
above the month grid as one joined card; the picker is its own card to the right with a gap; the
legend is in two parts, one at the bottom of the month grid card (weekend, public holiday, weekend
and holiday, today) and one at the bottom of the picker card (working hours, non-working hours, day
off), so no banner is fixed to the page bottom. The picker has no heading (its section carries the
accessible name "Meeting time"). A picker row shows the name with its offset from UTC and, beside
the marker, the time in bold with the date after it in the style of the offset; rows are only as
tall as their text and their 28 px band. In the month grid the weekday sits above the day number.
Palette (hex):

| Token | Light | Dark |
| --- | --- | --- |
| page, card | `#EAF6F6`, `#FFFFFF` | `#07090D`, `#10131A` |
| text, muted text, secondary text | `#0E2A33`, `#4F6F78`, `#1F4450` | `#EAEEF5`, `#9BA4B5`, `#C3CBD8` |
| card line, hairline, control line, input line | `#D5EAEA`, `#E3F1F1`, `#B6D4D6`, `#6B979D` | `#1E2433`, `#1B2030`, `#363E52`, `#5A647C` |
| working hours, non-working hours, day off (picker) | `#12B886`, `#E4F1F1`, `#0F4C5C` | `#1FD1A5`, `#1A2030`, `#6E5BE6` |
| weekend, public holiday (month grid) | `#88D5E7`, `#FF6B6B` | `#3FB6E0`, `#FF4F8B` |
| text on weekend and holiday cells (`--color-text-on-tint`; keeps 4.5:1 on the two tints) | `#0E2A33` | `#07090D` |
| today outline, Hijri text, reference row | `#6C5CE7`, `#C0267C`, `#DFF3F3` | `#FFD166`, `#C7AEFF`, `#161B2A` |
| map sea, map land, map coast, danger | `#BFE9F2`, `#FFE6B8`, `#FFFFFF`, `#C9344A` | `#0B0F18`, `#222B40`, `#07090D`, `#FF7A9E` |
| text on dark fills (`--color-on-text`), pin label name, Hijri day chip | `#FFFFFF`, `#285560`, `#FFFFFF` | `#07090D`, `#B6BFCD`, `#07090D` |
| marker line, handle and map icons (`--color-marker`) | the text colour | the text colour |

The dark today outline moved from blue to warm yellow because a blue outline does not show on a
cyan weekend cell. Validation: the browser tests check the text contrast of every text token on its
background (4.5:1) and the layout facts above (`tests/e2e/ui/canvas-layout.test.js`).

**DEC-021.** The outline is the canvas's hand-drawn coastlines (`viewBox="0 20 720 276"` of a 720 by
360 whole-world grid). The icon is an inline SVG in the pin template, 24 by 22 px, filled with
`--color-marker`. The pin layer spans the whole world, so it reaches past the view by the two hidden
bands. Better outline data can replace the drawing later without a layout change.

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
| `storage.js` | The only user of `localStorage`. `createStorage` reads and writes one record under a key; `main.js` makes one for the settings and one for the user's holidays. | `config.js`, `log.js` | SET-004, HOL-009, DEC-016, DEC-017 |
| `files.js` | The only module that saves a file to the user's machine and reads a file the user picked. `createFiles({ doc, urls })` returns `saveJson(fileName, value)` (a `Blob` of the value as JSON, a temporary `<a download>` link clicked, the object URL revoked) and `readJson(file)` (`{ status: "read", value }`, or `{ status: "unreadable" }` for text that is not JSON). `main.js` passes `document` and `URL`. M25. | `config.js`, `log.js` | HOL-010 to HOL-012, DEC-018 |
| `clock.js` | The only reader of the current time and of the colour-scheme query. | none | CLK-001, CLK-003 |
| `domain/zones.js` | Local date and time of an instant in a time zone, with DST, and the reverse: the first instant a zone's clock shows a local date and time (`instantAtLocal`; a skipped time gives the instant the clock jumps, a repeated time its first occurrence), the instant a zone's offset changes (`offsetChange`), and a zone's offset from UTC at an instant (`zoneOffset`). | none | CLK-002, EX-001, PCK-006, PCK-007 |
| `domain/format.js` | Formats dates, the first and last date of the picker window (`formatDateRange`, M26: `20-Nov-26`, `20–21-Nov-26` or `30-Nov-26 – 01-Dec-26`), times, minutes after midnight (`formatMinutes`, for the working-hours lists), the "Updated" time and date (`formatClock`), Hijri dates, month titles (`formatMonth`), two-letter weekdays (`formatWeekday`), day numbers as English names (`formatDayNames`, for example "Saturday and Sunday") and offsets from UTC (`formatOffset`, for example `UTC+5:30`). | `domain/hijri.js` types | DSP-001 to DSP-003, PCK-007, PCK-009, NFR-003 |
| `domain/hijri.js` | Hijri date of a local date for a variant and an adjustment. | none | HIJ-001 to HIJ-003, EX-010 |
| `domain/weekends.js` | Weekend days of a place: the days the user chose for it (SET-016), else those of its country or territory (`countryWeekendDays`); `placeWeekendDays` gives a place's days, `isWeekend` asks about a date for a place, and `isWeekendChoice` validates a choice (`null` or 1 to 7 distinct days). | none | CAL-002, SET-016 |
| `domain/cities.js` | The city list (`listCities`, in the table's order), one city by id (`cityOf`), country names (`countryName`), the countries and territories of the list, each once and sorted by English name (`listCountries`, for the Holidays section), and whether a code is one of them (`isListedCountry`). | `data/cities.js` | SET-002, SET-013, HOL-006, DEC-015 |
| `domain/holidays.js` | Turns a `HolidayResult` into per-day facts for a place; lists regions; reports missing data. | none | HOL-003, HOL-004, REF-002 |
| `domain/user-holidays.js` | The holidays a user adds and hides (M24): `emptyUserHolidays`; `addHoliday`, `removeHoliday`, `hideHoliday` and `showHoliday`, each returning the new record or `null` for a refused change (adding or hiding refuses a date that is not a real calendar date, a name empty after trimming, a country no city of the list has, and an entry already in the list); `isAddedHoliday` (whether the holiday card offers Remove or Hide); `parseUserHolidays` (validates a stored value); `effectiveHolidays` (a country's service holidays without the hidden ones, plus the added ones as national holidays). `mergeUserHolidays(saved, imported)` (M25: the saved entries, then the imported ones the saved record lacks, so nothing is removed and no entry is doubled, HOL-011). | `domain/cities.js`, `domain/holidays.js` types | HOL-003, HOL-006 to HOL-012, DEC-017 |
| `domain/places.js` | Adds a place from a city, removes, moves, relabels and edits places (label, region, weekend days, Hijri variant and adjustment); validates a stored place and fills in its country and zone from the city table; a place's map pin (`placePin`: position as percentages of the whole world from the city's coordinates, local time and date), and the parts of its name the views lay out apart (`placeFacts`: name, the city when a display name hides it, and the country while country names are on). | `domain/cities.js`, `domain/hijri.js`, `domain/zones.js`, `domain/format.js` | SET-001, SET-002, SET-006, SET-008, SET-009, SET-015, SET-016 |
| `domain/settings.js` | Settings shape (version 2), defaults (with the default places and the picker hours), validation, the theme choices (`themes`, `withTheme`) and the picker hours (M26: `withPickerHours(settings, hours, limits)` refuses hours that are not a whole number within the `PickerLimits`; `parseSettings(value, limits)` gives a record without `pickerHours` the default and refuses one outside the limits; with no limits given, both mean the whole day only). | `domain/places.js` | SET-005, SET-007, SET-010 to SET-012, SET-014, SET-015, LAY-003, DEC-016 |
| `domain/calendar.js` | The month-grid model: one row per place, one cell per day; also `monthWeeks`, the days of a month in weeks (Sunday first, as in the canvas) for the day selector's calendar. | `zones`, `hijri`, `weekends`, `holidays` | CAL-001 to CAL-007, PCK-007 |
| `domain/picker.js` | The picker model: the window of `pickerHours` hours from midnight of the selected day in the first place, or the whole 25-hour day at 24 hours (`pickerWindow`), one row of segments per place (`buildPicker`), local times and Hijri dates at the marker, the selected day and marker after a picked date or a day shift (`chooseDay`, `shiftDay`), the marker at an instant kept inside the window (`markerInWindow`) or moved to the selected day when a settings change leaves it outside (`keepMarkerInWindow`), and the first and last date of the window (`windowDates`). M26. | `zones`, `hijri`, `weekends`, `holidays` | PCK-001 to PCK-009, DEC-019 |
| `controller.js` | The workflows. Applies an action to the state, asks `api.js` for holidays, saves settings and the user's holidays (M24: loads the holiday record on `open`, handles `addHoliday`, `removeHoliday`, `hideHoliday` and `showHoliday`, saves the record after each accepted one and nothing after a refused one, closes the card of a holiday that is gone, and gives the month grid, the picker and the holiday card the effective holidays of every place's country), and (M25) exports the holidays file (`exportHolidays`: passes the current record and `holidaysFileName` to `files.saveJson`) and imports one (`importHolidays`: asks `files.readJson`, validates with `parseUserHolidays`, merges with `mergeUserHolidays`, saves and redraws; an unreadable file or a value the validation refuses changes nothing and sets `holidayImport` to `refused`, a good import sets it to `null`). M26: holds `selectedDay` beside the marker (today in the first place on `open`), handles `setPickerHours` with the injected `pickerLimits`, keeps the marker inside the window after `setMarker` and after every settings change, and gives the views `pickerWindow` and `windowDates`. Pure apart from its injected `api`, `storage`, `holidayStorage`, `files` and `clock`. | `domain/*` | all workflows |
| `views/*.js` | One view per screen part (theme, header, notices, map, picker, day selector, month grid, legend, settings, empty page). `views/theme.js` applies the saved theme to the root element (DEC-009). Each owns its own DOM, clones `<template>` elements, and sends events up. | `domain/format.js` types | |
| `views/settings.js`, `views/settings-places.js` | The settings panel (M12: places). `settings.js` owns the panel, the working-hours lists (one choice every `workingHoursStepMinutes`, plus a saved time between two steps), the display switches, the theme choice, the add form ("Add a place": the 55 cities of the list in the table's order, each shown as "city, country"), Escape and the focus return; `settings-places.js` owns the list of places (name, the city a display name hides, country, offset from UTC and, while Hijri is on, Hijri variant) and their editors (display name, region, the weekend days (M23: a fieldset of seven day boxes, Su to Sa, each named by its full day name, the place's days ticked and a line naming the country's default; the last ticked box cannot be cleared) and, while Hijri is on, the Hijri variant and adjustment; no time-zone field). After the add form comes the Holidays section, which `settings.js` hands to the factory `makeHolidays` (`views/settings-holidays.js`). `main.js` passes both the lookup (`cities` from `listCities`, `placeFacts`, `offsetAt` from `zoneOffset`, `placeWeekendDays` and `countryWeekendDays` from `domain/weekends.js`) and the list factory, because a view imports no other view and no domain module besides `format.js`. | `domain/format.js` | SET-001, SET-002, SET-004, SET-005, SET-008 to SET-013 |
| `views/settings-holidays.js` | The Holidays section of the settings panel (M24): the form that adds a holiday ("Country": the countries and territories of the list by English name, from `listCountries`; "Date", an `<input type="date">`; "Name"; "Add holiday"; an empty field is marked `aria-invalid` and nothing is sent), the heading "Added holidays" with one row per added holiday (the date as dd-mmm-yy, the country, the name) and a Remove button each, or "No holidays added.", and the heading "Hidden holidays" with one row per hidden holiday and a Show button each, or "No holidays hidden.". The rows clone `#settings-holiday-template`. M25 adds the Export button, the Import control (a labelled `<input type="file" accept=".json,application/json">` styled as a button, reachable by keyboard, cleared after each pick) and the message "The file was refused: it is not a Zuno holidays file. Nothing was changed." (`role="alert"`), shown while `holidayImport` is `refused`. `main.js` passes its factory to `settings.js`. | `domain/format.js` | HOL-006 to HOL-012 |
| `views/picker.js`, `views/day-selector.js` | The picker panel (M14, M26). `picker.js` owns the panel: its width of `pickerHours` hour slots (it sets `--picker-hours` on the panel; `layout.css` multiplies it by `--picker-slot`), the hour axis (labelled with the first place's local time every `pickerAxisLabelEveryHours`, from the window's start to its end, past midnight when the window is longer than the day), one row per place with its name, offset from UTC and (when they apply) city and country, its local time, date and Hijri date (while Hijri is on) at the marker, and its coloured stretches with hour lines, and the marker line with its handle under the rows, moved by dragging or by arrow keys in steps of `pickerStepMinutes`. Each row's marker time sits just right of the marker line (just left when it does not fit), and the name takes the wider space that is left. The axis is sticky inside the scrolling rows, so it shares their width and stays in view (LAY-001). `day-selector.js` owns the previous-day and next-day buttons, the date button, which shows the window's first and last date (`formatDateRange` of `windowDates`, PCK-009), and its month calendar on the selected day (Escape closes it and returns the focus). `main.js` passes `picker.js` the lookups it may not import (`localDateTime`, `zoneOffset`, `placeFacts`), the steps from `config.js` and the day-selector factory, and passes `day-selector.js` `monthWeeks`. | `domain/format.js` | PCK-001 to PCK-003, PCK-005 to PCK-007, PCK-009, LAY-001, DSP-001, DSP-002 |
| `views/map.js` | The world map (M17): clones the static SVG outline (DEC-021) and draws one pin per place, rebuilt on every render so the tick updates the times. Each pin is placed by the CSS custom properties `--pin-left` and `--pin-top` and shows the place's name (following the country-name setting), time and date. `main.js` passes `placeName` and `placePin`. `layout.css` puts the map and the month grid in one left column, the map taking the height the grid leaves, and the picker as a full-height panel at the right edge (one column on narrow screens). On a short map the labels shrink (a container query in `map.css`). | none | MAP-001, CLK-001, CLK-003 |
| `views/month-grid.js` | The month grid (M15): previous and next month buttons, day headers (the day number and a two-letter weekday), one row per place (its name, and its country below it while country names are on) with a blank cell per day (weekend, holiday, split by a diagonal gradient, today outlined, the selected holiday outlined in the text colour) and the holiday card beside the place's name, which opens from a holiday cell's button and closes on its close button or Escape. The card has a Hide button for a service holiday (dispatches `hideHoliday`) and a Remove button for one the user added (dispatches `removeHoliday`); either way the controller closes the card. `main.js` passes `isAddedHoliday`, so the card knows which button to show. The rows scroll inside `.month-grid-scroll` while the day headers stay sticky. `main.js` passes `dispatch`, `placeFacts` and the Hijri-note factory. While Hijri is on (M16) it adds a Hijri month band above the day headers (one cell per Hijri month of the first place, with the information button in the corner), the two-digit Hijri day in each cell, and the Hijri date in the holiday card. | `domain/format.js` | CAL-001 to CAL-007, LAY-001, HIJ-001, DSP-003 |
| `views/hijri-note.js` | The information button beside the Hijri month band and its card with the note that Hijri dates are calculated (M16). The button toggles the card; Escape closes it and returns the focus to the button. `main.js` passes its factory to `month-grid.js`. | none | HIJ-004 |
| `views/actions.js` | One delegated click listener: turns `data-action` of a plain action (`refresh`, `openSettings`) into a controller action. Only `main.js` imports it. | none | REF-001, SET-007 |
| `views/error-screen.js` | Shows the message and stack of an unexpected error on the page; `main.js` calls it from the `error` and `unhandledrejection` handlers. | none | project rule (top-level handler) |

Changes to the view rows above that DEC-015 to DEC-021 bring (each milestone rewrites the row of
the view it changes):

- `views/settings.js`: the sections are Working hours, Display, Add a place, Places, Holidays, each
  ending with a line. "Add a place" sits above the list of places.
- `views/picker.js`: no heading; the resize handle on the panel's left edge; the date beside the
  marker's time; the hover label; the picker's part of the legend at the bottom of the card.
- `views/month-grid.js`: the weekday above the day number; the month grid's part of the legend at
  the bottom of the card.
- `views/legend.js`: fills the two legend parts; no banner at the page bottom.
- `views/map.js`: location icons (DEC-021).

Import rules: `domain/*` imports only other `domain/*` modules and `data/*`. `controller.js`
imports `domain/*` only. Views import `domain/format.js` and receive everything else as arguments.
`api.js`, `storage.js`, `files.js` and `clock.js` import `config.js` and `log.js` only. Only `main.js` imports
across layers. `tests/unit/import-rules.test.js` walks the imports under `src/` and fails on a broken rule.

### 2.2 Directory structure

Create a folder only when it is listed here.

| Path | Purpose and owner |
| --- | --- |
| `src/` | Source. Holds `index.html`, `main.js`, `config.js`, `log.js`, `api.js`, `storage.js`, `files.js`, `clock.js`, `controller.js` and the sheets `styles.css` (imports the others), `theme.css`, `base.css`, `layout.css` plus one sheet per view (`map.css` styles the world map; `month-grid.css` styles the month grid; `picker.css` styles the picker, the day selector and its calendar). `layout.css` also styles the header, the empty page and the error screen. |
| `src/assets/` | Image files. Holds `zuno-logo.jpg`, the app logo (290 by 292 pixels, 24 KB), which the page no longer shows: the user asked on 2026-11-18 to remove the logo from the header. The page's only images are the data-URI icons in `theme.css`, which the Content-Security-Policy allows with `img-src data:`. |
| `src/domain/` | Pure logic modules from section 2.1. |
| `src/views/` | View modules, one per screen part. |
| `data/` | `cities.js` (the city table, DEC-015). Input data, read by `domain/cities.js`. |
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
| `holidayServiceBaseUrl` | `https://nagerholidays.com/api/v4` | Base URL of the holiday service. Checked live in M2; see section 5. HOL-001 |
| `holidayRequestTimeoutMs` | 10000 | Time to wait for one holiday request. A proposed value, not from the spec. |
| `clockTickMs` | 60000 | How often the current times update. CLK-003. Added to `config.js` in M11. |
| `pickerStepMinutes` | 15 | How far the marker moves for one arrow key press, and the grid its drag snaps to. PCK-001. A proposed value, not from the spec. |
| `pickerAxisLabelEveryHours` | 6 | Hours between two labels of the picker's hour axis. PCK-001. From the canvas (2026-11-18). |
| `storageKey` | `zuno.settings` | Key of the saved settings record. SET-004 |
| `holidaysStorageKey` | `zuno.holidays` | Key of the saved record of the user's added and hidden holidays. HOL-009, DEC-017. Added to `config.js` in M24. |
| `holidaysFileName` | `zuno-holidays.json` | Name of the exported holidays file. HOL-010. Added to `config.js` in M25. |
| `defaultCityIds` | `tokyo`, `cairo`, `new-delhi`, `madrid`, `bogota`, `riyadh`, `islamabad` | The default places, in order. SET-014 |
| `pickerDefaultHours`, `pickerMinHours`, `pickerMaxHours` | 24, 24, 48 | Hour slots of the picker window: at first, the fewest (the whole day, PCK-006) and the most. The upper limit is a proposed value, not from the spec. LAY-002, DEC-019. Added to `config.js` in M26; `main.js` passes them to the controller and to `parseSettings` as `pickerLimits`. |
| `defaultWorkStartMinutes`, `defaultWorkEndMinutes` | 540, 1020 | 9:00 AM and 5:00 PM. SET-005 |
| `workingHoursStepMinutes` | 60 | Minutes between two choices of the working-hours lists in the settings panel. SET-005. From the canvas (2026-11-18). |
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
| Playwright | Browser tests | DEC-011 | Installed 1.65.1 in M11, dev-only, exact version. Licence Apache-2.0 (`node_modules/playwright/package.json`, checked 2026-11-17). Browsers are downloaded separately with `npx playwright install` (M11 installed Chromium; Firefox, WebKit and Edge come in M19). The tests build the page into a scratch folder, open it as a `file:` URL, fix the clock with `page.clock` and answer holiday requests by `context.route`. | playwright.dev/docs/browsers, 2026-11-17 |
| Nager.Date | Public holidays | DEC-005 | Approved (DEC-005). Contract and CORS checked live in M2 (section 5). | nagerholidays.com/Api, 2026-11-17 |
| IANA time-zone names | Zones of `data/cities.js` | DEC-015 | Each city's zone is an IANA name that `Intl.DateTimeFormat` accepts (checked by the unit test). | iana.org/time-zones |
| Database, server, LLM, framework | none | | The page is local with one outside service. | |

### 2.5 Critical flows and operations

**Open the page (PCK-004, CLK-001, SET-007, SET-014, SET-015, HOL-001).** `main.js` reads the
settings and the user's holidays through `storage.js`. With no valid settings record the
controller uses the default settings, which hold the default places (SET-014); a saved place
whose city is not in the table is dropped (SET-015). With no places it shows the empty page and
stops (SET-007). Otherwise it sets the selected day to today in the first place and the marker to
the current instant (PCK-004), draws every view from the zones, weekends and any holidays already
in memory, and asks `api.js` for each needed country and year. A country-year is requested once,
however many places share the country. The years needed are those of the shown month and of the
picker window. Each answer redraws the month grid and the picker. A failed answer is kept as
`unavailable` and shown in the notices (REF-002).

**Move the marker, choose a day, resize the picker (PCK-002, PCK-006 to PCK-009, LAY-002,
LAY-003).** Moving the marker sets its instant inside the window (an instant outside it stops at the window's
first or last minute); the window does not move.
Choosing the previous day, the next day or a date sets the selected day and moves the marker to
it at the same time of day in the first place. Dragging the picker's left edge (M27) sets
`pickerHours` in whole slots through `setPickerHours`, which saves the settings (M26). A change of
the first place or of `pickerHours` that leaves the marker outside the window moves it to the
selected day at its time of day. `domain/picker.js` returns the window (DEC-019), one row per
place, and each place's local date and time. If the window needs a year not yet loaded, the
controller requests it.

**Add, remove, hide and show a holiday; export and import (HOL-003, HOL-006 to HOL-012).** Each
change goes through `domain/user-holidays.js`, is saved through the holidays storage, and redraws
the month grid and the picker, which always get the effective holidays. Export passes the record
to `files.saveJson`. Import asks `files.readJson` for the picked file; an unreadable file, or a
value `parseUserHolidays` refuses, changes nothing and sets the state's `holidayImport` to
`refused`, which the Holidays section shows as a message (HOL-012). A good file is merged and saved.

**Refresh (REF-001).** The controller recomputes the current time, requests all needed
country-years again, and replaces each stored `HolidayResult` with its new answer as it arrives. An
`unavailable` answer does not replace a `loaded` one, so holidays already loaded stay shown
(REF-002); notices consider only the country-years the shown month and the marker's window need.

**Clock tick (CLK-003).** Every `clockTickMs`, `main.js` calls the controller with the new current
instant; only the map labels and the "Updated" time change. The marker does not move.

**Change settings (SET-001 to SET-011).** The controller validates the change through
`domain/settings.js`, saves it through `storage.js`, and redraws. A new place asks for holidays for
its country if they are missing. A removed place drops the holiday answers of its country only
when no other place uses it.

**Notices (REF-002, HOL-004).** `domain/holidays.js` lists the countries whose result is
`unavailable` and the places whose chosen region cannot be served because the country's loaded
result has no regional holiday for any region (user decision 2026-11-17; HOL-004). The
notices view shows both lists in the card behind the information button, with a count badge.

**Failures.** The holiday service down or slow: `unavailable`, the page stays useful (REF-002).
Stored settings invalid: the default places and a logged warning (DEC-016). A thrown error anywhere
else: the top-level handler shows the error and the stack and logs it (project rule).

**External data flow.** One flow leaves the machine: a `GET` to the holiday service with a country
code and a year (HOL-002, DEC-005). Nothing else is sent, no cookie, no header with user data. The
Content-Security-Policy tag (DEC-012) blocks any other request. The holidays file is written to
and read from the user's own machine and never sent anywhere (DEC-018).

## 3. Data model

All types are JSDoc `@typedef`s in the module that owns them.

| Type | Fields | Owner and rules |
| --- | --- | --- |
| `Place` | `id` (string, unique), `cityId` (id of a `City`), `countryCode` and `zone` (filled in from the city, not chosen), `label` (display name, empty means the city name), `region` (code, empty means national only), `weekendDays` (list of days, 1 = Monday to 7 = Sunday, or `null` for the country's weekend), `hijriVariant` (`umalqura` or `tabular`), `hijriAdjust` (-1, 0 or 1) | `domain/places.js`. The list order is the display order; the first place is the picker's reference (PCK-006). SET-002, SET-016. |
| `Settings` | `version` (2), `places` (list of `Place`), `workStartMinutes`, `workEndMinutes`, `showCountry` (false by default), `showHijri` (false by default), `theme` (`light`, `dark` or `auto`; `auto` by default), `pickerHours` (whole number from `pickerMinHours` to `pickerMaxHours`) | `domain/settings.js`. Saved as one JSON record. Start must be before end. A record without `pickerHours` gets `pickerDefaultHours`; hours outside the limits make the record invalid. DEC-016. |
| `City` | `id` (slug, never changes), `name`, `countryCode` (ISO 3166-1 alpha-2), `zone` (IANA name), `latitude`, `longitude` | `data/cities.js`. The 55 rows of the spec's section 9, in that order. DEC-015. |
| `UserHolidays` | `version` (1), `added` and `hidden` (lists of `{ countryCode, date, name }`, `date` as `YYYY-MM-DD`) | `domain/user-holidays.js`. Saved as one JSON record and exported in the same shape. No two entries of one list share country, date and name. DEC-017. |
| `Holiday` | `date` (`YYYY-MM-DD`), `name`, `regions` (list of codes, or empty for national) | `domain/holidays.js`, made from the service record. Only type `Public` is kept. |
| `HolidayResult` | `status` (`loaded` or `unavailable`), `holidays` or `reason` | `api.js`. Kept in memory per country and year. |
| `Marker` | `instant` (UTC milliseconds) | State in `main.js`. Starts at the current instant. Always inside the picker window. |
| `selectedDay` | `{ year, month, day }` in the first place | State in `main.js`. Starts at today in the first place. The picker window starts at its midnight. DEC-019. |
| `DayFacts` | `date` (`YYYY-MM-DD`), `isWeekend`, `holidayName` or `null`, `isToday`, `hijri` (day, month, year, or `null` while Hijri is off) | `domain/calendar.js`. Today is the place's own local date (CAL-004). |
| `PickerRow` | `placeId`, `localDateTime` of the marker, `hijri` (day, month, year, or `null` while Hijri is off), `segments` (list of `{ from, to, kind }`) | `domain/picker.js`. Segments cover the window exactly. Weekend and holiday time is `dayOff` (PCK-005). |

Integrity: a stored `Place` whose `cityId` is not in the table is dropped when the record is read
(SET-015); any other fault makes the whole record invalid. The service's holiday data, the marker
and the selected day are never saved. Migration: `Settings.version` is 2; any other version is
invalid and is read as no saved settings (DEC-016).

## 4. Interfaces

**Module contracts** (all functions have JSDoc with parameter and return types):

- `api.getHolidays(countryCode, year, fetchFn?) -> Promise<HolidayResult>`. Sends only the code and
  the year. Throws only for a bad argument.
- `domain/holidays`: `toHolidays(records) -> Holiday[]` (type `Public` only),
  `holidayOn(holidays, region, date) -> Holiday | null` (national, plus the chosen region),
  `listRegions(holidays) -> string[]`, `unavailableCountries(resultsByCountry) -> string[]` and
  `placesMissingRegionalData(places, resultsByCountry) -> places`. `log.createLog(level, sink?)`
  makes a logger; `log.log` is the one for the page.
- `storage.createStorage({ store, parse, key?, log? }) -> { load, save }`, generic in the record
  type; `main.js` makes one with `localStorage` and `domain/settings.parseSettings` (key
  `storageKey`) and one with `domain/user-holidays.parseUserHolidays` (key `holidaysStorageKey`),
  so `storage.js` imports no domain module. `load()` returns the record, or `null` (and logs a
  warning for a bad record) when nothing valid is stored; `save(record) -> void`.
- `files.createFiles({ doc, urls }) -> { saveJson, readJson }`: `saveJson(fileName, value) -> void`
  offers the value as a JSON download; `readJson(file) -> Promise<{ status: "read", value } | { status: "unreadable" }>`.
- `clock.now() -> number`, `clock.prefersDark() -> boolean`.
- `controller.createController({ api, storage, holidayStorage, files, holidaysFileName, clock, defaultHours, defaultCityIds, pickerLimits }) -> { getState, dispatch, subscribe }`.
  `pickerLimits` is `{ defaultHours, minHours, maxHours }` (M26).
  `defaultHours` (`{ start, end }`, minutes after midnight) and `defaultCityIds` (the default places'
  cities, in order) come from `config.js` through `main.js`; with no valid saved record `open` uses
  `domain/settings.defaultSettings(start, end, cityIds)`, and nothing is saved until a setting changes.
  Actions: `open`, `refresh`, `tick`, `setMarker`, `shiftMarkerDay`, `showMonth`, `addPlace`,
  `removePlace`, `movePlace`, `editPlace`, `setWorkingHours`, `setShowCountry`, `setShowHijri`,
  `selectHoliday`, `toggleNotices`, `openSettings`, `closeSettings`. `setMarker` takes an
  `instant` (drag) or a `date` (a day picked in the calendar, PCK-007); `showMonth` takes an
  `offset`; `addPlace` takes a `cityId` (the controller makes the id, `place-N`; a city not in the list is refused); `removePlace`
  a `placeId`; `movePlace` a `placeId` and an `offset` (-1 or 1); `editPlace` a `placeId` and
  `changes` (label, region, weekend days, Hijri variant or adjustment; the city, country and zone never change); `setWorkingHours` a `start` and an
  `end`; `setShowCountry` and `setShowHijri` a `value`. A refused change saves nothing.
  `selectHoliday` takes a `cell` (`{ placeId, date }`, or `null` to close the card).
  The page view also carries `regions` (region codes of each country's loaded holidays, from
  `listRegions`), which the settings panel lists per place (SET-006).
  Actions added or changed by DEC-016 to DEC-019: `editPlace` changes
  may hold `weekendDays`; `setPickerHours` takes `hours`; `setMarker` with an `instant` moves only
  the marker and with a `date` also sets the selected day; `shiftMarkerDay` shifts the selected day;
  `addHoliday` takes `countryCode`, `date` and `name`; `removeHoliday`, `hideHoliday` and
  `showHoliday` take the same three; `exportHolidays` takes nothing; `importHolidays` takes the
  picked `file`. `createController` also receives `holidayStorage`, `files`, `holidaysFileName`, `defaultCityIds` and
  the picker hour limits. The page view also carries `selectedDay`, `pickerWindow`, `windowDates`
  (the window's `first` and `last` date in the first place, or `null` with no places), `userHolidays`
  and `holidayImport` (`null` or `refused`).
  `dispatch` returns a promise that settles when the action's holiday requests are answered.
  `getState()` returns the state (settings or `null`, `now`, marker, month, holiday results, the
  selected holiday, the open panels) plus the models the views draw: `isEmpty`, `picker`, `grid`
  and `notices` (`countries`, `placeIds`).
- `domain/cities`: `listCities() -> { id, name, country }[]` (in the table's order),
  `cityOf(id) -> City | null` and `countryName(code) -> string` (throws `RangeError` for a code no
  city has), `listCountries() -> { code, name }[]` and `isListedCountry(code) -> boolean`.
  `domain/user-holidays`: `addHoliday`, `removeHoliday`, `hideHoliday` and
  `showHoliday(record, { countryCode, date, name }) -> UserHolidays | null` (`null`: refused, save
  nothing), `isAddedHoliday(record, entry) -> boolean`,
  `parseUserHolidays(value) -> UserHolidays | null` and
  `mergeUserHolidays(saved, imported) -> UserHolidays` and
  `effectiveHolidays(serviceHolidays, record, countryCode) -> Holiday[]`. `domain/places`: `createPlace(id, cityId) -> Place` (throws `RangeError` for a city
  not in the list), `restorePlace(value) -> Place | null` (fills in the country and zone from the
  city) and `isUnlistedPlace(value) -> boolean` (a city id that names no city of the list, SET-015);
  `domain/settings.parseSettings(value) -> Settings | null` drops the unlisted places and refuses
  any other fault and any version but 2.
- `domain/picker.buildPicker(settings, marker, holidays) -> PickerRow[]`,
  `domain/picker.pickerWindow(settings, marker) -> { from, to } | null` (the window of PCK-006),
  `domain/picker.shiftMarkerDay(settings, marker, days) -> Marker` and
  `domain/picker.markerOnDate(settings, marker, date) -> Marker` (PCK-007; with no places the
  marker is returned unchanged), and
  `domain/calendar.buildMonth(settings, monthRef, holidays, nowInstant) -> DayFacts[][]`, where
  `monthRef` is `{ year, month }` (one object, because of the 4-parameter limit) and `holidays` is a
  record of `Holiday[]` by country code.

**Screen parts and interaction states** (the canvas shows each; sizes and colours are in DEC-020):

- Header: the title "Zuno" with the subtitle "Many time zones, One team!", the "Updated" time (the
  time of day and the date in the browser's own zone, from `state.now`),
  a notices button with a count badge, Refresh, Settings. The notices card opens and closes on the
  button; Escape closes it. The Settings button opens the settings panel (M12). `views/notices.js`
  owns the badge and card; `views/legend.js` owns the two legend parts. CSS class names are kebab-case (`header-title`), because `stylelint-config-standard` rejects
  the BEM `__` form that the HTML and CSS rules ask for (open question for the user).
- Map: one pin per place with the place name, current time and date. Pins stay at their coordinates
  as the map grows and shrinks (the map stretches to fill its space; DEC-021). Each pin is a location icon; each label sits beside,
  above or below its pin, wherever it covers no other label or pin.
- Month grid: previous and next month buttons; a Hijri month band and Hijri day in each cell only
  while Hijri is on; selecting a holiday cell outlines it and opens a card beside that place's name
  with the holiday's name, date and (if Hijri is on) Hijri date. The card's close button or Escape
  closes it. While Hijri is on, an information button beside the Hijri month band opens a card with the
  note that Hijri dates are calculated and may differ from official announcements (HIJ-004). The header and Hijri band stay in view while the rows scroll vertically.
- Picker panel (a card on the right, with a gap to the map): a resize handle on its left edge
  (dragged, or moved by the left and right arrow keys, one hour slot at a time); the day selector
  (previous day, a date button that opens a month calendar and shows the window's dates, next
  day); the hour axis; one row per place with the marker; the picker's legend. The marker can be
  dragged or moved with the arrow keys; the axis stays in view while rows scroll. The first
  place's row has the reference background. Pointing at a row's band shows that place's local
  time and date at that point (PCK-008).
- Legend (LEG-001): two parts, each at the bottom of its card. Month grid: weekend, public
  holiday, weekend and holiday, today. Picker: working hours, non-working hours, day off.
- Settings panel, top to bottom, with a line after each section: Working hours (Start and End
  lists); Display (country names, Hijri, and the theme: Light, Dark or Auto); Add a place (a list
  of the 55 cities, each with its country, and the Add place button); Places (reorder with
  arrows, expand to edit the display name, the region, the weekend days and, while Hijri is on,
  the Hijri variant and adjustment; remove); Holidays (add a holiday by country, date and name;
  the added holidays, each with Remove; the hidden holidays, each with Show; Export and Import; a
  message when an imported file was refused). Regions are listed by the service's code (for
  example `ES-MD`). The panel gets the default working hours (`defaultHours`) from `main.js`.
- Holiday card in the month grid: a holiday from the service has a Hide button (HOL-008); one the
  user added has a Remove button (HOL-007).
- Empty page: prompt to add a place, shown only while the settings hold no places (SET-007).

Keyboard and accessibility: every control is a real `<button>`, `<a>`, `<input>` or `<select>`;
every icon-only button has an `aria-label`; popovers close on Escape and return focus to the button
that opened them.

**Validation and errors.** Invalid input (a working-hours end before the start, no city chosen)
is refused by `domain/settings.js` and the view shows the field as invalid; it is not an error.
Everything else follows DEC-006 and the top-level handler.

## 5. Unresolved risks and design checks

| Issue and references | Owner | Evidence needed | Blocks what? |
| --- | --- | --- | --- |
| Holiday service terms of service (use, availability, any limit on a hosted page). DEC-005. The CORS and contract check ran on 2026-11-17: `curl` with `Origin: null` to `/api/v4/Holidays/US/2026` and `/api/v3/PublicHolidays/2026/US` gave HTTP 200, `access-control-allow-origin: *`, and the documented fields for each version. Version 4 is the current one. The live-response check of M2 (2026-11-17, one request, `Holidays/US/2026`, no user data): HTTP 200, `access-control-allow-origin: *`, a JSON array of 17 records with the fields `date`, `name`, `countryCode`, `nationalHoliday`, `subdivisionCodes` (`null` or a list such as `US-CA`) and `holidayTypes` (`Public`, `Bank`, `Observance`, `Optional`, `School`, `Authorities`). Regional records exist (6 of 17), some of type `Public` (Good Friday) and some `Observance`. `api.js` checks `date`, `name`, `holidayTypes` and `subdivisionCodes`. | User | Read the service's terms page. | None until release. |
| City table accuracy (zones, country codes, coordinates). DEC-015 | Implementation | The unit test of every row against the spec's section 9. | The city milestone. |
| A `blob:` download under the page's Content-Security-Policy. DEC-018 | Implementation | Resolved in M25: the export browser test (`tests/e2e/ui/holidays-file.test.js`) passes in Chromium, Firefox, WebKit and Edge with the policy unchanged (`default-src 'none'`); no request for the `blob:` URL reaches the network layer, and the downloaded file has the expected name and content. | None. |
| Countries the holiday service does not cover (India, Israel, Malaysia, Pakistan, Saudi Arabia, Taiwan, United Arab Emirates) always show a "No holiday data" notice (REF-002), even after the user adds holidays for them. | User | A decision whether the notice should go once the user has added holidays. | None. |
| Weekend data lags a recent country change. DEC-003 | Accepted risk | EX-002 in four browsers. | None. |
| English Hijri month names (for example `Jumada II`) from `Intl` in all four browsers. EX-010 | Implementation | Browser test of EX-010 in four browsers. | HIJ milestone. |
| JavaScript coverage flags for `node --test` (floor 80%). | Implementation | Run the flags in the Node version in use. | Test milestone. |
| `dist/` must be ignored by ESLint and Prettier; `.gitignore` needs `dist/`. | User (edits to config ask) | Approval of the edits. | Build milestone. |
