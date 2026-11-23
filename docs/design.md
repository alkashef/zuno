# Design — Zuno

How to build what `spec.md` says. If this file and the spec disagree, the spec wins.

Review state: Approved. The user approved the design as a whole on 2026-11-23, in chat, after seeing it on the
canvas: DEC-029 to DEC-035, the changes they make to DEC-015 to DEC-017, DEC-020 and DEC-022, and sections 2 to 5
where they touch (DEC-018 is replaced by DEC-032). DEC-036 was dropped the same day, before any code used it; its number is not reused.
Before that, the user approved the design as a whole on 2026-11-18, in a dialog,
including DEC-023 to DEC-027 and the changed DEC-005, DEC-015 and DEC-020. The code implements
DEC-001 to DEC-022 (milestones up to M29), the holiday table of DEC-024 (M31, M32) and the
coastlines of DEC-026 (M34), the version of DEC-025 (M40) and the Pages workflow of DEC-023
(M43), DEC-027 (M36), DEC-028 (M44) and the release download of DEC-023 (M45). DEC-029 to DEC-035 are
not built: `docs/plan.md` will hold their milestones.
Spec baseline: `docs/spec.md` as approved on 2026-11-18, with the acceptance examples EX-011 to
EX-026, the change approved on 2026-11-19 (LAY-004, LAY-005) and the changes approved on 2026-11-23
(SET-018, SET-019, MAP-002, VAC-001 to VAC-006, HOL-015 to HOL-023, PCK-010, PCK-011, the changed
requirements and examples of spec section 8, EX-027 to EX-034).
Visual reference (not code to copy): the "Zuno UI" canvas,
https://claude.ai/artifact/2GmNVHXyaLzy3E5XxUJPRB (light and dark Main page, Settings panel and
empty state). The app is called Zuno. The canvas was updated on 2026-11-18 and 2026-11-19 from the user's
comments; DEC-020 records the look it shows, and DEC-028 the border between the map and the month grid. Its Settings boards were brought in line
with the app on 2026-11-18: the city list in "Add a place", no time-zone field, and the Holidays
section. For the map outline the canvas no longer leads: it keeps its hand-drawn coastlines, and
DEC-026 is the reference. On 2026-11-23 the canvas gained the custom place "Sara", the vacation colour, the
hover card, the day menu, the "Day menu and dialogs" boards, the Settings boards as a full page and the picker
label over the slots, the imported files list and its delete dialog (DEC-029 to DEC-035).

## 1. Decisions

One current decision per topic. Replaced decisions live in Git history.

| ID | Decision | Why and references |
| --- | --- | --- |
| DEC-001 | Plain JavaScript (ES modules, JSDoc types checked by `tsc`), plain HTML and CSS. No framework, no runtime dependency. All time, weekend and Hijri maths use the browser's built-in `Intl`. | PKG-001, NFR-002, project rules. A page this size needs no framework. |
| DEC-002 | Source is many small files; a build script bundles them into one HTML file. The build uses esbuild as a dev-only tool. | PKG-001 needs one file; the rules need small separate files. Deviates from the rule "no build step". Approved by the user 2026-11-17. |
| DEC-003 | Weekends come from `Intl.Locale.getWeekInfo()`. Hijri dates come from `Intl.DateTimeFormat` with `islamic-umalqura` (Umm al-Qura) and `islamic-civil` (tabular). | CAL-002, HIJ-001 to HIJ-003, EX-002, EX-010. Closes the open weekend-source item in spec section 7. |
| DEC-005 | Public holidays come from the Nager.Date public-holiday service. The page sends it only a country code and a year. | HOL-001 to HOL-004, REF-002, NFR-001. Outside data flow approved by the user 2026-11-17. Checked 2026-11-17: both API versions answer with `access-control-allow-origin: *`. Terms of service read on 2026-11-18: free for private or non-profit projects, which is how the user classes Zuno (spec section 7). |
| DEC-006 | `api.js` returns an expected service failure as data (`HolidayResult`), not as a thrown error. Unexpected errors still reach the top-level handler. | REF-002, HOL-004. The rules say catch only in `api.js`; this is the one case where the spec defines the recovery. |
| DEC-007 | Layers: pure domain logic, one pure controller, DOM views, and three leaf modules for the outside world (`api.js`, `storage.js`, `clock.js`). `main.js` only wires them. | Project architecture rules; makes every workflow testable with fakes. |
| DEC-011 | Unit tests use `node --test`. Browser tests use Playwright (Chromium, Firefox, WebKit, and Edge through the `msedge` channel) with the holiday service faked by request routing. | NFR-002, NFR-001, CLAUDE.md testing rules. New dev dependency approved by the user 2026-11-17. |
| DEC-012 | The build adds a Content-Security-Policy `<meta>` tag with hashes of the inline script and style. It allows requests only to the holiday host. | NFR-001. A browser-enforced backstop for the automated request check. |
| DEC-015 | A built-in city table (`data/cities.js`) holds the 55 cities of the spec's section 9: a stable id, the name, the country or territory code, the time zone and the map coordinates. A place is a city of that table, or a custom place (DEC-029). Country names come from `Intl`, except a territory that the city list names differently (Hong Kong). The 245-country table is removed. | SET-002, SET-013, MAP-001, NFR-003, DSP-004. Replaces DEC-004 (user decision 2026-11-18: only these cities). |
| DEC-016 | Settings are saved in `localStorage` as one record of version 2. A record of version 1 (places by country) is not converted: it is read as "no saved settings", so the default places show. A version 2 place that is neither a city of the table nor a valid custom place (DEC-029) is dropped when the record is read; a place may also hold `vacations` (DEC-030). | SET-004, SET-014, SET-015, SET-016, LAY-003, SET-012. Replaces DEC-008 and DEC-014. Settings are user preferences, so the rule against app data in `localStorage` does not apply (approved 2026-11-17). |
| DEC-017 | The holidays a user adds or hides are a second `localStorage` record (`UserHolidays`). The exported file is a CSV with its own format (DEC-032), and vacations are saved with the places (DEC-030). The controller applies them to the service's holidays before it builds the month grid and the picker. Holidays from the service are still kept in memory only. | HOL-003, HOL-006 to HOL-009. The user's own entries cannot be fetched again, so they must be saved. |
| DEC-019 | The picker window is `pickerHours` hour slots (a saved setting, 24 to `pickerMaxHours`) from midnight of the selected day in the first place. The selected day is state beside the marker. Every slot has the width `--picker-slot`; the panel's width follows the number of slots. | PCK-003, PCK-006 to PCK-009, LAY-002, LAY-003. User decisions 2026-11-18 (fixed slots, 24 hours or more, selected day). |
| DEC-020 | All colours and shapes are CSS custom properties in `theme.css`, each colour with its light and dark value in `light-dark()`; `views/theme.js` sets `data-theme` from the theme setting. Cards, buttons, inputs and popovers have rounded corners; month-grid cells stay square. Weekends are cyan. | THM-001, SET-012, LEG-001. Replaces DEC-009 (user decisions on the canvas, 2026-11-18: rounded corners, cyan weekend). Changed by user decisions of 2026-11-18 (dialogs): a smaller month header, the corner label "Day", half-transparent map labels. Changed by user requests of 2026-11-19 (canvas): the cards run edge to edge (the page area has no padding and no gap between the left column and the picker; only the header keeps the side padding `--space-page`), and month-grid cells are 32 px tall. Changed by user requests of 2026-11-23 (canvas): the marker's time sits over the picker slots and the names stay at the left (DEC-034), the vacation colour (DEC-030) and the settings as a page of cards (DEC-033). |
| DEC-028 | The map's height is the setting `mapHeight` in the settings record: the map card's height in whole pixels, from `mapMinHeight` to `mapMaxHeight`, or `null`, where the map takes the height the month grid leaves (the layout before LAY-004). A handle on the border between the map and the month grid sets it; while `mapHeight` is a number the month grid fills the rest of the left column and its rows scroll inside it. | LAY-004, LAY-005, DEC-016, DEC-019. User request 2026-11-19 (canvas), spec change approved the same day. |
| DEC-022 | The controller has two modules. `controller.js` keeps the state, `createController`, the page, settings and picker workflows and the requests to the holiday service. `controller-holidays.js` holds the holiday side: loading the user's holiday record, the holiday actions, the holidays the page uses and the notices. Only `controller.js` imports it; it imports `domain/*` only. | DEC-007, DEC-017, DEC-032 (which replaced DEC-018). `controller.js` passed the 300-line mark (user decision 2026-11-18). Behaviour does not change. With DEC-029 to DEC-032 a third module, `controller-places.js`, holds the actions that add a custom place and change vacations; `controller-holidays.js` also holds the CSV import and export. |
| DEC-023 | The page is published to GitHub Pages by a GitHub Actions workflow (`.github/workflows/pages.yml`) in a public repository on the user's personal account `alkashef`: on every push to `main` it builds `dist/zuno.html`, deploys it as the site's `index.html`, and attaches the same file to the GitHub Release `latest` (made again at that commit), so anyone can download it from `https://github.com/alkashef/zuno/releases/latest/download/zuno.html`. The same file can also be opened from disk. The delivered app stays one file. The README links to the site and to the download, and explains the browsers' own "install as an app" menus; the repository's description and website point to the site. | PKG-001. Replaces DEC-013. User decisions 2026-11-18: run from GitHub Pages or the local desktop, publish automatically; move the repository to `alkashef` and use Pages (dialog). User decision 2026-11-19 (dialog): an "Open Zuno" and a "Download" link in the README, the file on a release, no install button inside the app. |
| DEC-024 | The public holidays of the seven countries the holiday service does not cover come from a table in `data/holiday-table.js`. A development script generates it for 2026 to 2028 with the open-source library `date-holidays`, a dev-only tool. The page carries the table, sends no request for those countries, and treats a table holiday like a service holiday. | HOL-013, HOL-001, HOL-003, HOL-008, REF-002, NFR-001, EX-022, EX-023. User decision 2026-11-18 (dialog), which also approves the dev dependency. |
| DEC-025 | The version is the build's date and time in UTC, written `YYYY.MM.DD.HHmm`. `scripts/build.mjs` writes it into the settings panel's footer in place of a marker in `index.html`. The build gets the time as an argument. | VER-001, DSP-001, EX-026. User decisions 2026-11-18 (dialogs: build date, settings footer, wording). |
| DEC-026 | The world map's outline is real coastlines: Natural Earth's 1:110m land data (public domain), kept in `data/`, turned by a development script into one SVG path on the map's whole-world grid, and put into the page by the build. No country borders. Each place is still a location icon whose tip is on the place, with a label placed by `views/map.js` where it covers no other label or icon. | MAP-001. Replaces DEC-021. User decisions 2026-11-18 (dialogs: real coastlines only; the milestone downloads the data once). |
| DEC-027 | In a month-grid cell the Hijri day has no background of its own and regular weight. On a weekend or holiday cell it takes `--color-hijri-on-tint`, a slightly darker shade of the Hijri colour, which the user accepted at about 3.1:1 on the light theme's holiday colour: the one text that may fall below 4.5:1. | HIJ-001, DSP-003, spec section 7 (accepted risk). User decisions 2026-11-18 (dialogs). Replaces the Hijri day chip of DEC-020. |
| DEC-029 | A place is a city of the table or a custom place: a name, a time zone and a country that the user enters. A generated table, `data/zone-table.js`, holds the time zones of the IANA `zone.tab` (zone, country code, coordinates of its principal location) and the country codes of `iso3166.tab`. A custom place's map pin is at its zone's coordinates; its weekend, holidays and Hijri defaults follow its country as a city place's do. | SET-013, SET-015, SET-018, MAP-002, SET-016, HOL-003, HOL-006, EX-027. User decision 2026-11-23 (dialog: the pin at the time zone's reference city). |
| DEC-030 | A vacation is `{ start, end, label }`, kept in its place's `vacations` list and saved with the places in the settings record; removing a place removes its vacations. Two vacations of one place may overlap; adding or importing one that equals a saved one changes nothing. A vacation day is a day off in the picker, and in the month grid it has its own colour, split with the holiday or weekend colour where they coincide. | VAC-001 to VAC-006, PCK-005, LEG-001, CAL-007, EX-029. User decisions 2026-11-23 (dialogs: a date range; own colour in the grid, day-off colour in the picker; allow overlap, skip identical rows). |
| DEC-031 | A right-click on a month-grid cell opens a day menu; its choices open native `<dialog>` forms. The click card of a holiday cell is replaced by a hover card (view state, no buttons), so Hide and Remove holiday become choices of the day menu. The day menu has no keyboard route. | VAC-001, VAC-002, VAC-005, HOL-015, CAL-006, HOL-007, HOL-008, EX-028 to EX-030. User decision 2026-11-23 (dialog: no keyboard route, accepted risk). Hide and Remove as menu choices need the spec change HOL-019 (section 5). |
| DEC-032 | The holidays file is a CSV file, one row per entry, with the header `Type,Country,Place,Start date,End date,Name`. `domain/csv.js` reads and writes the text, `domain/holidays-file.js` turns the saved holidays and vacations into rows and a picked file into an import plan, and the controller keeps the plan until the user chooses Add or Cancel in the import dialog. `files.js` saves and reads text. | HOL-010 to HOL-012, HOL-016 to HOL-018, NFR-001, EX-017, EX-018, EX-031, EX-032. Replaces DEC-018. User decisions 2026-11-23 (dialogs: one file with a Type column; a vacation matched to a place by name, unmatched rows skipped; a dialog before adding; dates in the page format). |
| DEC-033 | The settings are a view that covers the whole page: a fixed layer with its own scroll, a bar with the title and the Close button, three tabs (General, Places, Holidays and vacations) and, in each, two cards side by side across the whole width, which stack under 60rem. | SET-019, DEC-020. User request 2026-11-23 (item 6, canvas). |
| DEC-034 | In a picker row the name stays at the left end, above the band. The marker's date and time sit inside the band beside the marker line, on a see-through background that is darker and less clear than the map label's; with Hijri on, the label has a second line and the band is taller. | PCK-002, PCK-010, PCK-011, DEC-019, DEC-020. User request 2026-11-23 (canvas). |
| DEC-035 | The imports are a list in the holidays record, `imports: [{ id, fileName, importedAt }]`. Every holiday, hidden holiday and vacation that an import adds, or that a later import finds already saved from an earlier one, lists the ids of the files it came from in `sources`; an entry the user typed has none. Deleting an imported file removes its id from every `sources` and removes the entries whose `sources` become empty. | HOL-020 to HOL-023, DEC-017, DEC-030, DEC-032. User request 2026-11-23 (canvas comment) and decision (dialog: undo what the file added). |

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
contract and CORS were checked against the live service in M2. Holidays of type `Public` count; the other types
do not (HOL-003). The page sends nothing else: no user data, no settings (HOL-002). Alternative (c)
now holds for the seven countries the service lacks (DEC-024); the service stays the source for all
others. Terms of service (nagerholidays.com/legal/termsofservice, last updated 2023-09-15, read
2026-11-18): "The Web API can be used for private or non-profit projects. For commercial purposes we
require active sponsorship." Running a holiday portal with the data is forbidden; no warranty; no
rate limit is named. The user classes Zuno as a private, free, non-profit project (dialog,
2026-11-18); revisit before a company adopts the page officially (spec section 7).

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
`countryName(code)`. DSP-004: `countryName` first looks in `territoryNames`, a frozen object in
`domain/cities.js` with the names the city list gives where the browser's name differs (today only
`HK`: "Hong Kong"; the browser says "Hong Kong SAR China"), then asks `Intl`. Alternative: a
country name in every row of the city table. Rejected: 54 of 55 names would repeat what the browser
knows. The unit test compares the name of every row's country with the spec's section 9. Validation: `tests/unit/cities.test.js` checks 55 rows, unique ids, every zone
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

**DEC-028.** State: the setting `mapHeight` (DEC-016's record stays version 2: a record without
`mapHeight`, or with a value outside the limits, reads as `null`, so a change of the limits never
throws away the user's places). `views/map-resize.js` owns a button centred on the border between
the map card and the month grid card. While the pointer drags it (pointer capture), the view sets
`--map-height` on the page area itself, one pixel at a time and without saving; on `pointerup` it
dispatches `setMapHeight` once with the final whole-pixel height, so a drag writes `localStorage`
once. The up and down arrow keys on the handle dispatch `setMapHeight` with `mapHeightStepPx` less or
more. Every height is kept within `mapMinHeight` and `mapMaxHeight`. `render(mapHeight)` sets
`--map-height` and `data-map-height` on the page area, or removes both for `null`. `layout.css`:
with `data-map-height` the page's rows are `var(--map-height)` and `minmax(var(--grid-min-height),
1fr)`, and the month grid's scroll area fills its card (no `--grid-max-height`); without it the rows
stay `1fr auto` and the grid keeps `--grid-max-height`. The page area is at least the window's
height, so a taller map can make the page scroll; the month grid never gets shorter than
`--grid-min-height`. The map labels already move when the map changes size (`views/map.js`
observes it). Alternatives: (a) save on every pointer move, as the picker does per slot, rejected:
a pixel drag would write `localStorage` dozens of times a second; (b) store the month grid's height
instead, rejected: the user drags the map's edge and the map is what the canvas sizes; (c) a
separate `localStorage` key, rejected: DEC-016 keeps all preferences in one record, as LAY-003 does
for the picker. Validation: unit tests of `withMapHeight` and `parseSettings`, a controller test that
`setMapHeight` saves (LAY-005), and browser tests that a drag moves the border and the grid takes the
rest (LAY-004) and that a reload restores the height (LAY-005).

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
the marker. Rejected by the user (dialog, 2026-11-18). Implemented in M26 and M27: a marker set at an instant outside the window stops at the window's first or last
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
tall as their text and their 28 px band. In the month grid the weekday sits above the day number,
and the day header's corner label reads "Day" whether Hijri is on or off (user decision 2026-11-18;
the Hijri day stays in the cells, with no Hijri row in the header). The month grid's header row is
smaller than the page's other controls (user decision 2026-11-18): the previous and next month
buttons are 32 px squares (`--month-nav-size`) with 16 px arrows (`--icon-size-small`), the title is
14 px (`--font-size-body`), and 8 px (`--space-2`) lie under the row: 40 px in all, 60 px before. A
map label's background is the card colour at half strength (`--color-map-label`, a `color-mix` of
`--color-card` and `transparent` at 50%; user request 2026-11-18), so the map shows through.
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
| text on dark fills (`--color-on-text`), pin label name | `#FFFFFF`, `#285560` | `#07090D`, `#B6BFCD` |
| Hijri day on a weekend or holiday cell (`--color-hijri-on-tint`, DEC-027) | `#8F1A5B` | `#2B1464` |
| map label background (`--color-map-label`) | the card colour at 50% | the card colour at 50% |
| picker label background (`--color-picker-label`, DEC-034) | `#D6EBEE` at 82% | `#07090D` at 82% |
| marker line, handle and map icons (`--color-marker`) | the text colour | the text colour |

The dark today outline moved from blue to warm yellow because a blue outline does not show on a
cyan weekend cell. Validation: the browser tests check the text contrast of every text token on its
background (4.5:1; the one exception is DEC-027) and the layout facts above
(`tests/e2e/ui/canvas-layout.test.js`). The text of a map label is checked against the label's
colour laid over the map's land and over its sea.

**DEC-026.** Source: `ne_110m_land.geojson` from Natural Earth's public repository
(github.com/nvkelso/natural-earth-vector, folder `geojson`; public domain, 138 KB;
downloaded on 2026-11-18). `scripts/make-map.mjs` has two steps. With `--download` it fetches that one file into
`data/` (the only network use, at development time; the user approved it on 2026-11-18). Without
it, it reads the file and writes `data/map-outline.svg`: one `<path>` of all land rings on the
720 by 360 whole-world grid the pins already use (x = (longitude + 180) times 2, y = (90 -
latitude) times 2, one decimal), leaving out rings that lie wholly south of latitude -58, which the
map's view (`viewBox="0 20 720 276"`, latitude 80 to -58) does not show. Both files are committed;
the outline is generated and never edited by hand. `scripts/build.mjs` puts the path into the map's
SVG in place of the marker `<!--zuno:map-outline-->` in `index.html`, so the page still loads
nothing (PKG-001, NFR-001). The projection is a pure exported function with a unit test. Measured at the first generation:
`data/map-outline.svg` is 48.6 KB. Alternatives: (a) keep the hand-drawn outline,
rejected by the user; (b) coastlines with country borders, rejected by the user: more lines under
the pins, twice the size, and every border data set takes a side on disputed borders; (c) fetch the
outline at run time, rejected: NFR-001. The pins are unchanged: the icon is an inline SVG in the pin
template, 24 by 22 px, a teardrop with a hole, filled with `--color-marker` and outlined in the card
colour; its tip, the bottom centre, is on the place. A label stands 18 px beside the tip (centred
on the icon's middle), 28 px above it or 8 px below it (`--map-label-gap-side`,
`--map-label-gap-above` and `--map-label-gap-below` in `theme.css`, which `views/map.js` reads to
choose the side). The pin layer spans the whole world, so it reaches past the view by the two
hidden bands. Validation: the unit test of the projection, a build test that the built page holds
the outline and no marker, and the existing browser tests of the pins.

**DEC-023.** Alternatives: (a) commit the built file and let Pages serve it from the branch,
rejected: a generated file in Git that goes stale when someone forgets to rebuild; (b) upload by
hand, rejected for the same reason; (c) deliver several files (HTML, script, stylesheet) instead of
one, rejected: browsers block module scripts opened from disk, and PKG-001 requires one file;
(d) stay on the company-managed account, rejected by the user: its plan has no Pages for this
repository. The workflow uses GitHub's own actions (`checkout`, `setup-node`,
`upload-pages-artifact`, `deploy-pages`) and runs `npm ci` and `npm run build`; it runs no tests,
because the pre-commit hook runs them before a commit reaches `main`. Pages must be set to the
source "GitHub Actions" in the repository's settings. The repository is public, so anyone with the
address can open the page and read the code; the page holds no secret and no user data. Settings
and holidays are saved per origin: the page on Pages and a copy opened from disk each keep their
own (the holidays file carries holidays between them). The version (DEC-025) of the published page
is the time of the workflow's build. The release step (2026-11-19) needs `contents: write`;
it runs after the deployment, deletes the release `latest` with its tag if it exists, and creates it
again at the pushed commit with `dist/zuno.html` attached, using the `gh` command line that GitHub's
runners carry. A cancelled run can leave no release until the next push. Alternatives for the
download: (e) a link to the site and "save the page", rejected by the user as less obvious; (f) an
install button inside the app (a web app manifest and a service worker), rejected: it needs extra
files, breaking PKG-001, and does not work from a downloaded copy. Validation: the workflow run
succeeds, the site's address answers with the page, and the download address answers with the file. Opening the file from disk is covered by the
browser tests, which load it as a `file:` URL.

**DEC-024.** Table countries: India, Israel, Malaysia, Pakistan, Saudi Arabia, Taiwan and the
United Arab Emirates (`IN`, `IL`, `MY`, `PK`, `SA`, `TW`, `AE`). `scripts/make-holiday-table.mjs`
asks `date-holidays` for each country and each year from 2026 to 2028, keeps the holidays of type
`public` for the whole country (no state or region), takes the English name, and writes
`data/holiday-table.js`: a frozen object with the years it covers and, per country code, a list of
`{ date, name }` sorted by date. The script fails if a kept holiday has no English name (NFR-003).
The file is generated, committed and never edited by hand; its header names the library, its
version and the licence of the data. `domain/holiday-table.js` (pure) is the only reader:
`isTableCountry(code)` and `tableHolidays(code, year)`, which gives the country's `Holiday` list
(no regions) or `null` for a year outside the table. `controller.js` asks the table instead of
`api.js` for a table country: a list becomes a `loaded` result and `null` an `unavailable` one, so
the notices, the hiding (HOL-008) and the user's added holidays work as for a service country, and
a year after 2028 shows the no-data notice (EX-023). `api.js` and the Content-Security-Policy do
not change. Licence: the library's code is ISC and its holiday data CC BY-SA 3.0
(github.com/commenthol/date-holidays, read 2026-11-18), so `data/holiday-table.js` is under
CC BY-SA 3.0, the README says so, and the Holidays section of the settings panel carries one credit
line. Islamic holidays in the table are calculated; the library warns they "might not be correct as
they are subject to the sighting of the moon" (spec section 7). Verified in M31 with
`date-holidays` 3.39.2: each of the seven countries has `public` holidays with English names, and
the table holds the dates of EX-022. A holiday of several days (an Eid, up to four days in `SA`)
gives one row per day, each with the holiday's name, so every day off is marked. The script reads
the English name from the library's rules and fails if one is missing. `tableHolidays` throws for a
country outside the table (a programming error). Measured: 253 rows, about 17 KB. The library's
README puts its data under CC BY-SA 3.0, while its LICENSE file and `package.json` name
CC BY-SA 4.0; the table's header names CC BY-SA 3.0, as the README and the spec do, and notes the
LICENSE file. Alternatives: (a) a second holiday service: the search of 2026-11-18 found one free service
without a key that claims these countries (holidays.abouts.co); it has no named operator and no
terms, and it answered a request for Pakistan 2027 with Saudi Arabia's holidays of 2026, so it is
rejected; (b) the library inside the page, rejected: it would be the first runtime dependency
(DEC-001) and its full bundle is about 1.5 MB; (c) holidays only from the user, which was the state
before: the default places Riyadh, New Delhi and Islamabad then show no holidays on a first visit.
Validation: unit tests of `domain/holiday-table.js`, controller tests of EX-022 and EX-023, and the
request check of NFR-001 (no request for a table country).

**DEC-025.** `buildPage` takes `builtAt` (a `Date`) with its other options; the command-line entry
passes the current time and the tests pass a fixed one, so a build is reproducible in tests.
`versionText(builtAt)` (exported, pure) gives `YYYY.MM.DD.HHmm` from the UTC parts. `index.html`
holds the line "Version" followed by the marker `<!--zuno:version-->` in the settings panel's
footer, under the sentence about saved changes; the build replaces the marker. No JavaScript of the
page knows the version. The page published by DEC-023 carries the time of that build. Alternatives,
all offered to the user and not chosen: a `1.MINOR.PATCH` number raised by each milestone, the last
milestone's number, and a number raised by hand. Consequence: two builds of the same code carry
different versions; the version tells the age of a copy, not its content. Validation: a unit test
of `versionText` and a browser test of EX-026.

**DEC-027.** `month-grid.css`: the Hijri day keeps `--color-hijri` on a plain cell (5.5:1 on the
card); on a weekend, holiday or split cell it takes `--color-hijri-on-tint`; it has no background,
no padding of a chip and weight `normal`. `--color-chip` leaves `theme.css`. Contrast, calculated by
hand and to be measured by the browser test: light `#8F1A5B` is about 5.2:1 on the weekend colour
and 3.1:1 on the holiday colour; dark `#2B1464` is about 6.5:1 on the weekend colour and 4.9:1 on
the holiday colour. In the dark theme the tints are bright and the Hijri colour is light, so a
"slightly darker" shade cannot be read there; the dark value is a deep shade of the same hue
instead (the designer's choice, shown to the user with this design). The contrast test asks 4.5:1
for every text and 3:1 for this text on the holiday colour. Alternatives offered to the user and not
chosen: one deep shade on both tints (4.8:1), a slight shade on the weekend colour with a deep one
on the holiday colour, and the cell's own text colour. The user also chose regular weight over
semi-bold, from the canvas comment of 2026-11-17 ("the hijri date should not be in bold").

**DEC-022.** Context: `controller.js` had 378 code lines, over the 300 that ESLint warns at, and the
holiday work had grown into a second responsibility. Choice: `controller-holidays.js` holds the
holiday side of the controller. It exports `loadUserHolidays`, `holidayHandlers` (`addHoliday`,
`removeHoliday`, `hideHoliday`, `showHoliday`, `exportHolidays`, `importHolidays`, and with DEC-032 `confirmImport` and `cancelImport`), `holidaysByCountry`,
`regionsByCountry` and `noticesOf` (`holidayAt`, the holiday card of a cell, goes with DEC-031). It keeps no state: the
handlers get a context (`deps`, `read`, `update`) from `controller.js`, and the functions that work out
holidays get the state they need as arguments. It uses `holidayStorage` and `files`, which
`controller.js` passes in through `deps`, and imports `domain/*` only. `controller.js` keeps the state,
`createController`, `dispatch`, `subscribe`, `getState`, the open, refresh and tick workflows, the
settings and picker actions and the requests to the holiday service (it passes `neededCountryYears` to
`noticesOf`). The contract of `createController` in section 4 does not change. The moved functions
are the same code, so what is saved, when, and the messages are unchanged. Alternatives: (a) leave one
large file, rejected: the warning would stay and holiday changes would touch the page workflows;
(b) split by every workflow group (page, settings, picker, holidays), rejected: more modules than the
size needs. Consequence: two modules in the controller layer; the type names `SelectedHoliday`,
`Notices`, `CountryYear`, `ResultsByCountryYear`, `FileRead` and `HolidayAction` are defined in
`controller-holidays.js` and re-exported by `controller.js`, so the views and tests import them from
`controller.js` as before. Validation: `tests/unit/import-rules.test.js` (only `controller.js` imports
the new module, and the new module imports `domain/*` only), the unchanged controller tests of
`tests/e2e/`, and `tests/unit/controller-holidays.test.js`.

**DEC-011.** Alternative: Cypress, or a hand-driven browser. Rejected: Playwright drives Chromium,
Firefox and WebKit from one test suite and covers Edge through the `msedge` channel, which does not
ship with Playwright (playwright.dev/docs/browsers, checked 2026-11-17). Consequence: browsers
download on first setup. The holiday service is faked in every test; no test touches a live server
(testing rules). Coverage on `src/` has a floor of 80%; the Node coverage flags are to be verified
at implementation.

**DEC-029.** Context: SET-018 asks the user for a name, a time zone and a country; MAP-002 needs
coordinates for the pin; SET-015 needs a test for "a time zone and a country that the page knows".
Choice: `scripts/make-zone-table.mjs` works in the two steps of `make-map.mjs`. With `--download` it
fetches `zone.tab` and `iso3166.tab` from IANA into `data/` (the only network use, at development
time, with no user data; needs the user's approval when the milestone runs). Without it, it reads them
and writes `data/zone-table.js`: a frozen `zones` list of `{ zone, countryCode, latitude, longitude }`
sorted by zone name (the coordinates are the principal location in the file's second column,
`±DDMM±DDDMM` or `±DDMMSS±DDDMMSS`, turned into degrees) and a frozen `countryCodes` list. `zone.tab` is
in the public domain by its own header; its columns are country code, coordinates, zone name and
comments (iana.org time zone files, read 2026-11-23). All three files are committed; the table is
generated and never edited by hand. `domain/zone-table.js` is the only reader: `listZones()`,
`zoneRow(zone)`, `isKnownZone(zone)`, `listCountryCodes()` and `isKnownCountry(code)`. A custom place is
stored as `custom: { name, zone, countryCode }` with `cityId: null`; `domain/places.js` fills in the
place's `zone` and `countryCode` from the city or the custom block every time the record is read, takes
the name from either, and refuses a custom place whose name is empty after trimming or whose zone or
country is not in the tables. `placePin` projects a city's coordinates or a zone's coordinates the same
way (MAP-002). The form (DEC-033) asks for the zone with an `<input list>` and a `<datalist>` of the
table's zones, each labelled with its current offset; a value that is not a table zone is refused
and the field marked `aria-invalid`. The country is a `<select>` of all codes by English name
(`countryName`, with DSP-004's `territoryNames` first), preset to the zone's own country when a zone is
chosen. Holiday countries: `holidayCountries(places)` in `domain/places.js` gives the Holidays
section's list (the countries of the city list plus those of the user's custom places, sorted by
name); `domain/user-holidays.js` accepts any code of `isKnownCountry`, so a holiday for a country whose
place was removed stays valid, and an imported holiday may name any known country. Alternatives: (a) the
browser's list of zones (`Intl.supportedValuesOf("timeZone")`) with no table: rejected, it has no
coordinates, so MAP-002 would need a second table anyway, and some browsers list old aliases; (b) the
user clicks the map: rejected by the user (dialog); (c) a geocoding service: rejected, it sends the
user's text out (NFR-001). Consequences: the page grows by about 25 KB (an estimate: about 420 zones, to
be measured in the milestone); two custom places in one zone share a pin (spec section 7). Risk: a zone
of the newest release may be unknown to an older browser. Validation: unit tests of the table (rows,
unique zones, coordinates in range, every country code accepted by `Intl.DisplayNames`) and of the
custom place (create, restore, refuse), a browser test in the four browsers that `Intl.DateTimeFormat`
accepts every zone of the table (a zone a browser refuses goes on the script's skip list), and a
browser test of EX-027.

**DEC-030.** `Vacation` is `{ start, end, label }`: dates `YYYY-MM-DD`, label trimmed and possibly
empty. The three fields together name a vacation: adding or changing one into a copy of another of the
same place is refused, the rule that holidays already follow ("an entry already in the list"). Overlap
is allowed (user decision, dialog). `domain/vacations.js` (pure) has `addVacation`, `changeVacation`,
`removeVacation`, `vacationsOn(vacations, date)` (those that cover a date, in the order they were added),
`checkVacation(entry)` (`ok`, `start-missing`, `end-missing` or `end-before-start`, for the form's
message, VAC-003) and `parseVacations(value)` (drops an entry that is not valid and logs a warning, like
SET-015 drops a place). The settings record stays version 2: a record without `vacations` holds none (as
a record without `mapHeight`, DEC-028). `domain/calendar.js` gives each `DayFacts` its `vacations` and a
`fill`: `{ first, second }` with kinds `weekend`, `holiday` and `vacation`, `second` `null` for one
colour. With no vacation the fill is the weekend or holiday colour or, when both, weekend then holiday
(CAL-007). With a vacation, `first` is `vacation` and `second` is `holiday` if the day is a public
holiday, else `weekend` if it is a weekend day, else `null` (VAC-004; the choice of the holiday colour
for a day that is all three is the designer's, spec section 7). `domain/picker.js` classes a local day as
`dayOff` for a weekend day, a public holiday or a day covered by a vacation of that place (PCK-005).
`month-grid.js` sets `data-fill` on each cell (`vacation`, `vacation-holiday`, `vacation-weekend`, and the
existing ones) and `month-grid.css` draws the splits with the diagonal gradient of CAL-007. Tokens in
`theme.css`: `--color-vacation` (`#F2C14E` light, `#E9AE3B` dark). Text on it uses `--color-text-on-tint`
(about 8.9:1 light and 10:1 dark) and the Hijri day uses `--color-hijri-on-tint` (about 5.1:1 light and
7.6:1 dark); both ratios are calculated by hand and the browser test measures them. Legend: the month
part gains "Vacation"; the picker's "Day off" reads "weekend, holiday or vacation". Removing a place
removes its vacations, because they are in the place. Alternatives: (a) vacations in the user-holidays
record, keyed by place id: rejected, removing a place would need a change in two records and the saved
ids would be shared with the file; (b) a third record: rejected for the same reason. Validation: unit
tests of `vacations.js`, of the fill rules (all seven combinations) and of `parseSettings` with and
without `vacations`; controller tests of VAC-002 to VAC-006; a browser test of EX-029 (including a
reload).

**DEC-031.** Day menu: `views/day-menu.js` has one delegated `contextmenu` listener on the month grid;
each cell has `data-place-id` and `data-date`. It calls `preventDefault`, asks the month grid for that
cell's facts and opens a `role="menu"` popover at the pointer, built from `dayMenuChoices(facts)` in
`domain/calendar.js` (pure: a list of `{ kind, vacation? }` with the kinds `addHoliday`, `addVacation`,
`hideHoliday`, `removeHoliday`, `editVacation` and `removeVacation`; one `editVacation` and
`removeVacation` pair per vacation covering the day, named by its dates when there are several). Every
day gets `addHoliday` and `addVacation`; a holiday from the service or the table adds `hideHoliday`; one
the user added adds `removeHoliday`; a vacation day adds the pair. Escape or a click outside closes it.
`views/day-dialog.js` owns one native `<dialog>` (`showModal()`) with two forms cloned from `<template>`
elements in `index.html` (holiday: name and date; vacation: start, end and label, empty or filled in for an
edit). It sends `addHoliday`, `addVacation` or `changeVacation` and closes on success; a refused
vacation is caught first with `checkVacation` (VAC-003), which marks the fields `aria-invalid` and fills a
`role="alert"` line. Hover card: `views/cell-card.js` replaces the click card (`selectHoliday`, the
`selectedHoliday` state, the `SelectedHoliday` type and `holidayAt` are removed; the card is view state). On `pointerenter` and
`focusin` of a holiday or vacation cell it shows, beside the place's name, the holiday's name, date and
(while Hijri is on) Hijri date, or each vacation covering the day with its label and dates; on
`pointerleave` and `focusout` it goes. It has no buttons and takes no pointer events. Holiday and
vacation cells stay `<button>` elements, so they take focus (CAL-006); empty cells do not. Alternatives:
(a) a card that stays while the pointer moves into it, with Hide and Remove buttons: rejected, a card that
must be reached by the pointer is fragile and no keyboard user can reach it; (b) a keyboard route (a
grid with arrow keys and the menu key): offered, the user chose none (dialog 2026-11-23). Consequence:
a keyboard-only user cannot add or edit a holiday or a vacation, or hide a holiday, from the grid; they
can still remove an added holiday and show a hidden one in the settings (HOL-007, HOL-008). Hide and
Remove as choices of the day menu are not in the spec yet: see HOL-019 in section 5. Validation: unit
test of `dayMenuChoices`; browser tests of EX-028, EX-029 and EX-030 (a right-click is a Playwright
click with `button: "right"`). Native `<dialog>` and `contextmenu` in the four browsers: planned check
in those browser tests.

**DEC-032.** Replaces DEC-018. `files.createFiles({ doc, urls })` returns `saveText(fileName, text,
mimeType)` (the `Blob`, the temporary `<a download>` link and the revoked object URL of M25, which passed
in Chromium, Firefox, WebKit and Edge under the Content-Security-Policy) and `readText(file)`, which
returns `{ status: "read", text }` or `{ status: "unreadable" }` when the file cannot be read. Export:
`holidaysFile.toCsv({ userHolidays, places })` gives a byte-order mark (so a
spreadsheet reads accents), the header, then one row per entry with `\r\n` line ends; a field is quoted
only when it holds a comma, a quote or a line break, and a quote is doubled. Rows: `holiday,<country>,,<date>,,<name>`
for an added holiday, `hidden holiday,<country>,,<date>,,<name>` for a hidden one (the name stays,
because DEC-017 identifies a hidden holiday by country, date and name) and `vacation,,<place>,<start>,<end>,<label>`.
`<place>` is the name the page shows (`placeName`); `<country>` is `countryName` (DSP-004). Order: added
holidays by country then date, hidden holidays likewise, then vacations by place order and the order they
were added. Dates are `dd-mmm-yy` (`formatDate`, DSP-001; user decision 2026-11-23). Import:
`csv.parse(text)` reads RFC 4180 text (a leading byte-order mark ignored, `\n` or `\r\n`, quoted fields).
`holidaysFile.planImport(text, { places }) -> { status: "refused" } | { status:
"plan", total, rows, missingPlaces, invalid }`. It refuses the file when the text is not CSV (a quote left
open) or its first row is not the six header names, in order (trimmed, any case). A row can be imported
when its Type is `holiday`, `hidden holiday` or `vacation` (any case) and, for the two holiday types, its
Country is a known country (the English name from `countryName`, any case, or the two-letter code),
its Start date is a real date and its Name is not empty; for a vacation, its Place matches the shown
name of one of the user's places (any case, trimmed; the first place if two share a name), its dates are
real and its End date is not before its Start date. Dates are read as `d-mmm-yy` or `d-mmm-yyyy` (English
month, any case), a two-digit year as 20yy. A vacation whose place does not match adds its name once to
`missingPlaces`; any other row that fails counts in `invalid`; `rows` are the importable entries, typed. The
state `holidayImport` is `null`, `{ status: "refused" }` or `{ status: "preview", fileName, total,
importable, missingPlaces, invalid, rows }`. `importHolidays` sets it; `confirmImport` merges the
holidays (`mergeUserHolidays`) and adds the vacations (those equal to a saved one are skipped, DEC-030),
saves both records and sets it to `null`; `cancelImport` sets it to `null` and changes nothing (HOL-018).
`views/import-dialog.js` shows a preview in a native `<dialog>` (the count, the missing places, the invalid
count, Cancel and "Add N rows", disabled while `importable` is 0); `views/settings-file.js` shows the
refused message. The description of HOL-016 is static markup in `index.html` next to the buttons: the
columns, the date format and the example of EX-031; a unit test builds the example's data, calls `toCsv`
and compares the result with the page's example text, so the description cannot drift from the format.
`holidaysFileName` is `zuno-holidays-and-vacations.csv`. Alternatives: (a) keep JSON and add CSV:
rejected by the user (CSV only), so an old `.json` file is refused; (b) two files: rejected by the user;
(c) a spreadsheet library: rejected (DEC-001, NFR-001; the format is small). Risks: country names come
from `Intl.DisplayNames`, so a file written in one browser may name a country another browser spells
differently, which counts those rows as invalid (the two-letter code is read as a fallback; section 5);
a spreadsheet may rewrite dates when the user saves (spec section 7, accepted). Validation: unit tests of
`csv.js` and `holidays-file.js` (EX-017, EX-018 with the text `hello`, EX-031, EX-032), controller tests of
confirm and cancel, and browser tests of the download and of the import dialog in the four browsers.

**DEC-033.** `.settings` becomes a fixed layer (`position: fixed; inset: 0; overflow-y: auto;
overscroll-behavior: contain`) in the page colour, above everything; the page behind keeps running (the
clock tick redraws its views) and keeps its scroll and picker state, which a layer shows better than
hiding the page. Markup: a `header` (the title "Settings" and a Close button, "Close settings"), a `main`
with a tab bar and one tab panel, a grid of two cards (`repeat(2, minmax(0, 1fr))`, across the whole
width of the window, one column under `@media (width <= 60rem)`), each card a section (14 px corners, `--color-card`, a card-line border), and a `footer` (the
sentence about saved changes and the version, DEC-025). Tabs: General (Working hours, Display), Places (Add a
place, Places) and Holidays and vacations (Holidays, Holidays and vacations file), the user's request of
2026-11-23 (canvas comment: "use tabs"). The selected tab is view state, not saved, and the settings open on
General. `views/settings-tabs.js` owns the tab bar (`role="tablist"`, `role="tab"` buttons with `aria-selected`
and `aria-controls`, a roving `tabindex`, the Left and Right arrows and Home and End) and shows one
`role="tabpanel"` at a time. The focus moves to the layer when it opens, Escape or Close
closes it and the focus returns to the Settings button (the behaviour `settings.js` has now); `--settings-width`
goes. "Add a place or person" has two choices in a group of two toggle buttons, "A city from the list" and "A person or
another city"; the second shows the form of DEC-029 from `views/settings-custom-place.js`. Alternatives:
(a) hide the main page: rejected, it loses the picker and scroll state and re-renders on return; (b) a
modal `<dialog>`: rejected, it suits a short question, not a page with several forms. Consequence:
`views/settings.js` (290 lines) must not grow, so the tabs, the custom form and the file section are new modules and
`settings-holidays.js` loses Export and Import. Validation: a browser test that the layer's box is the
window's box (SET-019) and that Close and Escape return the focus; the settings tests of the four
browsers still run.

**DEC-034.** In `views/picker.js` the row loses `--name-left`, `--name-width` and `data-name-side` and the
code that moves the name clear of the marker time (`arrangeInfo`); the name block (name, offset from
UTC, and the city and country where they apply) is always at the left. The marker label (`.picker-mark`)
moves into `.picker-track`: absolutely placed, its left edge at the marker plus `--space-marker`, or its
right edge at the marker minus that gap when it would pass the track's right end (the view measures the
widest label as it measures it now, and sets `data-mark-side` on the content, which CSS turns into the label's left or right edge). It takes no pointer events, its
background is its own token, `--color-picker-label`, a little darker than the map label (user request 2026-11-23, canvas
comment: `#D6EBEE` at 82% light, `#07090D` at 82% dark, made less clear on a second comment; `--color-map-label` stays as it is), and its text is `--color-text`, the Hijri line too, which limits the
contrast risk that spec section 7 accepts for PCK-011. The track is `--picker-band-height` (28 px) high, or
`--picker-band-height-hijri` (44 px) while Hijri is on (`data-hijri` on the panel). The hover label of
PCK-008 stays above the band. Alternative: keep the name hopping aside the time: rejected by the user.
Validation: a browser test of EX-033: the label's computed background has an alpha below 1, its box lies
inside the track's at both ends of the window, the name's left edge is the same for both marker positions;
the contrast test records the label's ratios over the three slot colours (no threshold: accepted risk).

**DEC-035.** Implements HOL-020 to HOL-023 and EX-034, approved on 2026-11-23. `confirmImport` (DEC-032) makes an `ImportRecord` with the next id
`import-N`, the file name and the time of the import (UTC milliseconds), and adds the id to the `sources` of
every entry the file contributes: a new entry is saved with it, and an identical entry that an earlier
import saved gets the new id too, so it is shared. An identical entry that the user typed gets no id: it
stays the user's own (a hand-typed entry has no `sources`, and adding by hand a copy of an imported one is
refused, as every duplicate is). A file with no importable row makes no record. The same file imported twice
makes two records. `removeImport({ importId })` removes the record, takes its id out of every `sources` in the
holidays record and in the places' vacations, and deletes each entry whose `sources` were non-empty and are now
empty; it saves both records, as `confirmImport` does. The list in the settings shows, for each record, the name,
the time and date of the import (`formatTime`, a middle dot, `formatDate`, like PCK-008) and counts of the
holidays, hidden holidays and vacations whose `sources` hold its id, worked out when drawn, not stored, so a
holiday removed by hand lowers the count. The delete dialog (`views/import-dialog.js`, a second form from a
`<template>`) shows the entries that go (those whose only source is this file) and those that stay (shared with
another file), from `importRemovalPlan(record, imports)` in `domain/holidays-file.js`; its Delete button names
the number ("Delete 4 entries"). Removing a place removes its vacations and their `sources`; the import's
counts follow. The holidays record keeps `version` 1: `imports` and `sources` are optional, so a record
saved before has no imports and no entry with a source. Alternative: delete the list row only: rejected by
the user (dialog, 2026-11-23). Validation: unit tests of tagging, sharing and removal with the example EX-034;
controller tests of `confirmImport` and `removeImport`; a browser test of the list and the dialog.

## 2. Architecture

### 2.1 Components

| Component | Responsibility and owned state | Allowed dependencies | References |
| --- | --- | --- | --- |
| `main.js` | Creates the state object, the controller and the views, connects them, starts the clock tick, and holds the top-level error handler. Holds no logic. | everything | DEC-007 |
| `config.js` | One frozen object of behaviour values (section 2.3). | none | |
| `log.js` | The only user of `console`. | `config.js` | |
| `api.js` | The only user of `fetch`. Gets one country-year of holidays and returns a `HolidayResult`. | `config.js`, `log.js` | HOL-001, HOL-002, DEC-006 |
| `storage.js` | The only user of `localStorage`. `createStorage` reads and writes one record under a key; `main.js` makes one for the settings and one for the user's holidays. | `config.js`, `log.js` | SET-004, HOL-009, DEC-016, DEC-017 |
| `files.js` | The only module that saves a file to the user's machine and reads a file the user picked. `createFiles({ doc, urls })` returns `saveText(fileName, text, mimeType)` (a `Blob` of the text, a temporary `<a download>` link clicked, the object URL revoked) and `readText(file)` (`{ status: "read", text }`, or `{ status: "unreadable" }` when the file cannot be read). `main.js` passes `document` and `URL`. M25; DEC-032 makes it text instead of JSON. | `config.js`, `log.js` | HOL-010 to HOL-012, DEC-032 |
| `clock.js` | The only reader of the current time and of the colour-scheme query. | none | CLK-001, CLK-003 |
| `domain/zones.js` | Local date and time of an instant in a time zone, with DST, and the reverse: the first instant a zone's clock shows a local date and time (`instantAtLocal`; a skipped time gives the instant the clock jumps, a repeated time its first occurrence), the instant a zone's offset changes (`offsetChange`), and a zone's offset from UTC at an instant (`zoneOffset`). | none | CLK-002, EX-001, PCK-006, PCK-007 |
| `domain/format.js` | Formats dates, the first and last date of the picker window (`formatDateRange`, M26: `20-Nov-26`, `20–21-Nov-26` or `30-Nov-26 – 01-Dec-26`), times, minutes after midnight (`formatMinutes`, for the working-hours lists), the "Updated" time and date (`formatClock`), Hijri dates, month titles (`formatMonth`), two-letter weekdays (`formatWeekday`), day numbers as English names (`formatDayNames`, for example "Saturday and Sunday") and offsets from UTC (`formatOffset`, for example `UTC+5:30`). | `domain/hijri.js` types | DSP-001 to DSP-003, PCK-007, PCK-009, NFR-003 |
| `domain/hijri.js` | Hijri date of a local date for a variant and an adjustment. | none | HIJ-001 to HIJ-003, EX-010 |
| `domain/weekends.js` | Weekend days of a place: the days the user chose for it (SET-016), else those of its country or territory (`countryWeekendDays`); `placeWeekendDays` gives a place's days, `isWeekend` asks about a date for a place, and `isWeekendChoice` validates a choice (`null` or 1 to 7 distinct days). | none | CAL-002, SET-016 |
| `domain/cities.js` | The city list (`listCities`, in the table's order), one city by id (`cityOf`), country names (`countryName`), the countries and territories of the list, each once and sorted by English name (`listCountries`, the cities' share of the Holidays section's list). `countryName` names any code of `domain/zone-table.js` (DEC-029); `isListedCountry` goes, because `isKnownCountry` of that module replaces it. | `data/cities.js`, `domain/zone-table.js` | SET-002, SET-013, HOL-006, DEC-015, DEC-029 |
| `domain/zone-table.js` | The only reader of `data/zone-table.js` (DEC-029, to be built): `listZones()` (the zones by name, each `{ zone, countryCode, latitude, longitude }`), `zoneRow(zone)` (one row, or `null`), `isKnownZone(zone)`, `listCountryCodes()` and `isKnownCountry(code)`. | `data/zone-table.js` | SET-015, SET-018, MAP-002, DEC-029 |
| `domain/holidays.js` | Turns a `HolidayResult` into per-day facts for a place; lists regions; reports missing data. | none | HOL-003, HOL-004, REF-002 |
| `domain/holiday-table.js` | The built-in holiday table (DEC-024, M31): `isTableCountry(code)` and `tableHolidays(code, year)`, a country's holidays of a year as `Holiday` rows with no regions, sorted by date, or `null` for a year the table does not cover; it throws for a country outside the table. The only reader of `data/holiday-table.js`. | `data/holiday-table.js`, `domain/holidays.js` types | HOL-013, HOL-001, EX-022, EX-023 |
| `domain/user-holidays.js` | The holidays a user adds and hides (M24): `emptyUserHolidays`; `addHoliday`, `removeHoliday`, `hideHoliday` and `showHoliday`, each returning the new record or `null` for a refused change (adding or hiding refuses a date that is not a real calendar date, a name empty after trimming, a country that is not known (`isKnownCountry`, DEC-029), and an entry already in the list); `isAddedHoliday` (whether the holiday card offers Remove or Hide); `parseUserHolidays` (validates a stored value); `effectiveHolidays` (a country's service holidays without the hidden ones, plus the added ones as national holidays). `mergeUserHolidays(saved, imported)` (M25: the saved entries, then the imported ones the saved record lacks, so nothing is removed and no entry is doubled, HOL-011). | `domain/zone-table.js`, `domain/holidays.js` types | HOL-003, HOL-006 to HOL-009, HOL-011, DEC-017, DEC-029 |
| `domain/vacations.js` | The vacations of a place (DEC-030, to be built): `addVacation`, `changeVacation` and `removeVacation` (each returns the new list, or `null` for a refused change: dates that are not real, an end before the start, or a copy of a saved vacation), `vacationsOn(vacations, date)`, `checkVacation(entry)` (`ok`, `start-missing`, `end-missing` or `end-before-start`) and `parseVacations(value)` (drops an invalid entry). It uses the real-date check of `domain/user-holidays.js`. | `domain/user-holidays.js` | VAC-002 to VAC-006, DEC-030 |
| `domain/csv.js` | Reads and writes CSV text (DEC-032, to be built): `parse(text) -> string[][] \| null` (RFC 4180, a leading byte-order mark ignored, `null` for a quote left open) and `format(rows) -> string` (a field is quoted only when it must be; `\r\n` line ends). It knows nothing of holidays. | none | HOL-010, HOL-012, DEC-032 |
| `domain/holidays-file.js` | The holidays and vacations file (DEC-032, to be built): the six header names (a frozen object), `toCsv({ userHolidays, places })` and `planImport(text, { places })`, as DEC-032 describes. Dates are `dd-mmm-yy`. | `domain/csv.js`, `domain/format.js`, `domain/cities.js`, `domain/places.js`, `domain/user-holidays.js`, `domain/vacations.js`, `domain/zone-table.js` | HOL-010 to HOL-012, HOL-016, HOL-017, DEC-032 |
| `domain/places.js` | Adds a place from a city, removes, moves, relabels and edits places (label, region, weekend days, Hijri variant and adjustment); an edit that sets exactly the country's weekend days stores `null` (SET-017); validates a stored place and fills in its country and zone from the city table; a place's map pin (`placePin`: position as percentages of the whole world from the city's coordinates, local time and date), and the parts of its name the views lay out apart (`placeFacts`: name, the city when a display name hides it, and the country while country names are on). With DEC-029 and DEC-030 (to be built): a place is `cityId` or `custom`, and `createCustomPlace(id, entry)` makes one from a name, a zone and a country; `restorePlace` fills in the country and zone of either kind and parses the place's `vacations` (changed through `domain/vacations.js`); `placePin` projects a city's or a zone's coordinates; `holidayCountries(places)` lists the countries of the Holidays section; `isUnusablePlace` replaces `isUnlistedPlace`. | `domain/cities.js`, `domain/zone-table.js`, `domain/vacations.js`, `domain/hijri.js`, `domain/zones.js`, `domain/format.js`, `domain/weekends.js` | SET-001, SET-002, SET-006, SET-008, SET-009, SET-015 to SET-018, MAP-002, VAC-006, DEC-029, DEC-030 |
| `domain/settings.js` | Settings shape (version 2), defaults (with the default places and the picker hours), validation, the theme choices (`themes`, `withTheme`), the map height (DEC-028: `withMapHeight(settings, px, mapLimits)` refuses a value that is not a whole number within the limits; `null` is accepted and means the map takes the height the grid leaves) and the picker hours (M26: `withPickerHours(settings, hours, limits)` refuses hours that are not a whole number within the `PickerLimits`; `parseSettings(value, limits)` gives a record without `pickerHours` the default and refuses one outside the limits; `parseSettings` throws a `TypeError` when called without limits). | `domain/places.js` | SET-005, SET-007, SET-010 to SET-012, SET-014, SET-015, LAY-003, LAY-005, VAC-006, DEC-016, DEC-028, DEC-030 |
| `domain/calendar.js` | The month-grid model: one row per place, one cell per day; also `monthWeeks`, the days of a month in weeks (Sunday first, as in the canvas) for the day selector's calendar. With DEC-030 and DEC-031 (to be built) each cell also carries the vacations that cover its day, its `fill` (one colour, or two for a diagonal split) and whether its holiday is one the user added, and `dayMenuChoices(facts)` lists what the day menu offers. | `zones`, `hijri`, `weekends`, `holidays`, `vacations` | CAL-001 to CAL-007, PCK-007, VAC-001, VAC-004, VAC-005, DEC-030, DEC-031 |
| `domain/picker.js` | The picker model: the window of `pickerHours` hours from midnight of the selected day in the first place, or the whole 25-hour day at 24 hours (`pickerWindow`), one row of segments per place (`buildPicker`), local times and Hijri dates at the marker, the selected day and marker after a picked date or a day shift (`chooseDay`, `shiftDay`), the marker at an instant kept inside the window (`markerInWindow`) or moved to the selected day when a settings change leaves it outside (`keepMarkerInWindow`), and the first and last date of the window (`windowDates`). M26. With DEC-030 (to be built) a local day is `dayOff` for a weekend day, a public holiday or a day covered by a vacation of the place. | `zones`, `hijri`, `weekends`, `holidays`, `vacations` | PCK-001 to PCK-009, DEC-019, DEC-030 |
| `controller.js` | The workflows. Applies an action to the state, asks `api.js` for holidays, saves settings, and calls `controller-holidays.js` for the user's holidays (DEC-022: it loads the holiday record on `open`, runs the holiday actions through `holidayHandlers`, gives the month grid, the picker and the holiday card the effective holidays of every place's country, and builds the notices). M32: for a table country (`holidayTable.isTableCountry`, injected by `main.js`) it takes a year's holidays from the table, through `tableAnswer`, and makes no `api` request (HOL-001, HOL-013). M26: holds `selectedDay` beside the marker (today in the first place on `open`), handles `setPickerHours` with the injected `pickerLimits` (and, with DEC-028, `setMapHeight` with the injected `mapLimits`), keeps the marker inside the window after `setMarker` and after every settings change, and gives the views `pickerWindow` and `windowDates`. With DEC-029 to DEC-032 (to be built) it drops `selectHoliday` and the `selectedHoliday` state (the hover card is view state), hands the new place and vacation actions to `controller-places.js`, and carries `holidayImport` as DEC-032 describes. Pure apart from its injected `api`, `holidayTable`, `storage`, `holidayStorage`, `files` and `clock`. | `domain/*`, `controller-holidays.js`, `controller-places.js` | all workflows |
| `controller-holidays.js` | The holiday side of the controller (DEC-022, M29). `loadUserHolidays(holidayStorage)` (M24: the saved record, or none added and none hidden). `holidayHandlers()` gives the handlers of `addHoliday`, `removeHoliday`, `hideHoliday` and `showHoliday` (M24: each saves the record after an accepted change and nothing after a refused one, and closes the card of a holiday that is gone), `exportHolidays` (DEC-032: `holidaysFile.toCsv` of the record and the places, passed with `holidaysFileName` to `files.saveText`), `importHolidays` (DEC-032: `files.readText`, then `holidaysFile.planImport`; an unreadable or refused file changes nothing and sets `holidayImport` to `{ status: "refused" }`, a plan sets it to a `preview`), `confirmImport` (merges the plan's holidays with `mergeUserHolidays`, adds its vacations, saves both records and sets `holidayImport` to `null`) and `cancelImport` (sets it to `null`). With DEC-035 `confirmImport` also records the import and tags the entries, and `removeImport` undoes it. `holidaysByCountry` and `regionsByCountry` give the effective holidays and the region codes of every country, and `noticesOf` the notices, and (M32) `tableAnswer(table, countryYear)` turns a table country's holidays of a year into a `loaded` result, or into `unavailable` for a year the table does not cover. It keeps no state: `controller.js` passes in a context (`deps`, `read`, `update`) and the state each function needs. Pure apart from the injected `holidayStorage` and `files`. | `domain/*` | HOL-003, HOL-004, HOL-006 to HOL-012, HOL-017, HOL-018, REF-002, SET-006, DEC-017, DEC-022, DEC-032 |
| `controller-places.js` | The place side of the controller that DEC-029 to DEC-031 add (to be built): `placeHandlers()` gives the handlers of `addCustomPlace` (checks the name, zone and country, makes the id `place-N`, saves the settings, asks for the country's holidays), `addVacation`, `changeVacation` and `removeVacation` (each saves the settings after an accepted change and nothing after a refused one). Like `controller-holidays.js` it keeps no state: `controller.js` passes in a context (`deps`, `read`, `update`), and only `controller.js` imports it. The existing place actions stay in `controller.js` until a milestone moves them. | `domain/*` | SET-018, VAC-002 to VAC-006, DEC-022, DEC-029, DEC-030 |
| `views/*.js` | One view per screen part (theme, header, notices, map, picker, day selector, month grid, legend, settings, empty page). `views/theme.js` applies the saved theme to the root element (DEC-009). Each owns its own DOM, clones `<template>` elements, and sends events up. | `domain/format.js` types | |
| `views/settings.js`, `views/settings-places.js` | The settings panel (M12: places). `settings.js` owns the panel, the working-hours lists (one choice every `workingHoursStepMinutes`, plus a saved time between two steps), the display switches, the theme choice, the add form ("Add a place": the 55 cities of the list in the table's order, each shown as "city, country"), Escape and the focus return; `settings-places.js` owns the list of places (name, the city a display name hides, country, offset from UTC and, while Hijri is on, Hijri variant) and their editors (display name, region, the weekend days (M23: a fieldset of seven day boxes, Su to Sa, each named by its full day name, the place's days ticked and a line naming the country's default; the last ticked box cannot be cleared) and, while Hijri is on, the Hijri variant and adjustment; no time-zone field). The sections run Working hours, Display, Add a place, Places, then Holidays (a 1 px line in the card-line colour ends each; the footer has none). `settings.js` hands the Holidays section to the factory `makeHolidays` (`views/settings-holidays.js`). `main.js` passes both the lookup (`cities` from `listCities`, `placeFacts`, `offsetAt` from `zoneOffset`, `placeWeekendDays` and `countryWeekendDays` from `domain/weekends.js`) and the list factory, because a view imports no other view and no domain module besides `format.js`. Since M47 (DEC-033) the panel is a page that covers the window, with its sections as cards, two side by side in each of three tabs (`views/settings-tabs.js`); `settings.js` is 290 lines and must not grow, and the Holidays tab is the container `makeHolidays` receives (the Holidays card and the "Holidays and vacations file" card, which until M53 holds Export, Import and the refused message); with DEC-029 "Add a place or person" also offers a custom place, built by the factory `makeCustomPlace` (`views/settings-custom-place.js`) that `main.js` passes in. | `domain/format.js` | SET-001, SET-002, SET-004, SET-005, SET-008 to SET-013, SET-018, SET-019, DEC-029, DEC-033 |
| `views/settings-holidays.js` | The Holidays section of the settings panel (M24): the form that adds a holiday ("Country": the countries and territories of the list by English name, from `listCountries`; "Date", an `<input type="date">`; "Name"; "Add holiday"; an empty field is marked `aria-invalid` and nothing is sent), the heading "Added holidays" with one row per added holiday (the date as dd-mmm-yy, the country, the name) and a Remove button each, or "No holidays added.", and the heading "Hidden holidays" with one row per hidden holiday and a Show button each, or "No holidays hidden.". The rows clone `#settings-holiday-template`. M25 added Export, Import and the refused message; DEC-032 moves them, with the description of the file format, to `views/settings-file.js`. Its country list is `holidayCountries` of the user's places (DEC-029). `main.js` passes its factory to `settings.js`. | `domain/format.js` | HOL-006 to HOL-009, DEC-029 |
| `views/settings-custom-place.js` | The form of a custom place in "Add a place" (DEC-029, DEC-033, to be built): Name; Time zone (an `<input list>` with a `<datalist>` of the zones, each labelled with its offset); Country or territory (a `<select>` of every country by English name, preset to the zone's own country); and the Add place button. An empty name, a zone outside the table or no country marks the field `aria-invalid` and sends nothing; a good form dispatches `addCustomPlace`. `main.js` passes the zones, the countries and the offset lookup. | `domain/format.js` | SET-018, DEC-029 |
| `views/settings-tabs.js` | The tab bar of the settings page (DEC-033, M47): three tabs (General, Places, Holidays and vacations) as `role="tab"` buttons with `aria-selected` and `aria-controls`; one `role="tabpanel"` shown at a time; a roving `tabindex`, with the Left and Right arrows and Home and End moving the selection and the focus. The selected tab is view state and goes back to General when the settings open. `main.js` passes `setUpSettingsTabs(layer)` to `settings.js` as `deps.setUpTabs` (a view imports no other view); it has no collaborators, only the layer's markup. | none | SET-019, DEC-033 |
| `views/settings-file.js` | The "Holidays and vacations file" card (DEC-032, DEC-033, to be built): Export; Import (a labelled `<input type="file" accept=".csv,text/csv">` styled as a button, reachable by keyboard, cleared after each pick); the description of the format (HOL-016) from a `<template>`; and the message "The file was refused: it is not a Zuno holidays and vacations file. Nothing was changed." (`role="alert"`) while `holidayImport` is `refused`. With DEC-035 it also lists the imported files, each with a Delete button. | `domain/format.js` | HOL-010 to HOL-012, HOL-016, DEC-032, DEC-035 |
| `views/day-menu.js` | The day menu (DEC-031, to be built): one delegated `contextmenu` listener on the month grid and a `role="menu"` popover at the pointer whose buttons are the choices of `dayMenuChoices`; Escape or a click outside closes it. It dispatches `hideHoliday`, `removeHoliday` and `removeVacation` itself and asks `views/day-dialog.js` for the other three. `main.js` passes it the lookup of a cell's facts and `dayMenuChoices`. | `domain/format.js` | VAC-001, VAC-005, DEC-031 |
| `views/day-dialog.js` | The forms of the day menu in one native `<dialog>` (DEC-031, to be built): Add public holiday (name, and a date preset to the clicked day), Add vacation and Edit vacation (start, end, label). `main.js` passes `checkVacation`; a refused vacation marks the fields `aria-invalid` and fills a `role="alert"` line (VAC-003). It dispatches `addHoliday`, `addVacation` or `changeVacation`. | `domain/format.js` | VAC-002, VAC-003, VAC-005, HOL-015, DEC-031 |
| `views/import-dialog.js` | The import preview (DEC-032, to be built): a native `<dialog>` open while `holidayImport` is a `preview`. It says "N of M rows can be imported", names the missing places, counts the invalid rows, and has Cancel (`cancelImport`) and "Add N rows" (`confirmImport`, disabled while N is 0). With DEC-035 a second form, cloned from a `<template>`, asks before an imported file is deleted: the entries that go, the entries that stay, Cancel and "Delete N entries" (`removeImport`). | `domain/format.js` | HOL-017, HOL-018, DEC-032, DEC-035 |
| `views/cell-card.js` | The hover card of a holiday or vacation cell (DEC-031, to be built): shown on `pointerenter` and `focusin`, removed on `pointerleave` and `focusout`; no buttons and no pointer events. `main.js` passes its factory to `month-grid.js`. | `domain/format.js` | CAL-006, DEC-031 |
| `views/picker.js`, `views/day-selector.js` | The picker card (M14, M26, M28). `picker.js` owns the panel: its width of `pickerHours` hour slots (it sets `--picker-hours` on the panel; `layout.css` multiplies it by `--picker-slot`), the hour axis (labelled with the first place's local time every `pickerAxisLabelEveryHours`, from the window's start to its end, past midnight when the window is longer than the day), one row per place with its name, offset from UTC and (when they apply) city and country, its local time in bold with the date after it on the same line (in the style of the offset: caption size, muted colour) and, below, the Hijri date (while Hijri is on) at the marker, and its coloured stretches (a 28 px band) with hour lines, and the marker line with its handle under the rows, moved by dragging or by arrow keys in steps of `pickerStepMinutes`. The card has no heading: its section carries the accessible name "Meeting time". A row is only as tall as its text (padding 8 px above and below, 10 px at the sides, 6 px between the text and the band). The card ends with the picker's part of the legend (a slot that `views/legend.js` fills). It builds the resize handle (a button centred on the card's left border) and the hover label of each row from the templates in `index.html` and passes them to `picker-resize.js` and `picker-hover.js` (the factories `makeResize` and `makeHover` that `main.js` supplies, because a view imports no other view), telling them the number of hour slots and the window and zones of the rows on every render. With DEC-034 (to be built) each row's name stays at the left end, and the marker's time, date and Hijri date are one label inside the band, just right of the marker line (just left when it does not fit), in the text colour on a see-through background; the band is 44 px high while Hijri is on. The axis is sticky inside the scrolling rows, so it shares their width and stays in view (LAY-001). `day-selector.js` owns the previous-day and next-day buttons, the date button, which shows the window's first and last date (`formatDateRange` of `windowDates`, PCK-009), and its month calendar on the selected day (Escape closes it and returns the focus). `main.js` passes `picker.js` the lookups it may not import (`localDateTime`, `zoneOffset`, `placeFacts`), the steps from `config.js` and the day-selector, resize and hover factories, and passes `day-selector.js` `monthWeeks`. | `domain/format.js` | PCK-001 to PCK-003, PCK-005 to PCK-007, PCK-009, LAY-001, DSP-001, DSP-002 |
| `views/picker-resize.js` | The resize handle of the picker card (M27, M28): dragging the button centred on the card's left border (pointer capture), or the left and right arrow keys on it, adds or removes hour slots. One slot width to the left (the computed `--picker-slot`) is one more hour. It dispatches `setPickerHours` with whole hours, only when the number changes, never below `pickerMinHours` or above `pickerMaxHours` (both passed in from `config.js` by `main.js`), and stops widening when the map column left of the card would get narrower than `--map-min-width` (320 px, in `theme.css`; it never narrows the panel because of that limit). The handle is hidden in the one-column layout under 60rem. The controller saves the width (LAY-003). | none | LAY-002, LAY-003, DEC-019 |
| `views/map-resize.js` | The resize handle on the border between the map card and the month grid card (DEC-028): a button centred on that border, labelled "Change the height of the map". Dragging it (pointer capture) sets `--map-height` on the page area live; releasing it dispatches `setMapHeight` once. The up and down arrow keys dispatch `setMapHeight` with `mapHeightStepPx` less or more. Heights stay within `mapMinHeight` and `mapMaxHeight` (passed in from `config.js` by `main.js`). `render(mapHeight)` sets or removes `--map-height` and `data-map-height` on the page area. It does not draw the handle (`map.css` does) and does not save (the controller does). Shown in both layouts. | none | LAY-004, LAY-005, DEC-028 |
| `views/picker-hover.js` | The hover label of the picker rows (M27): while the pointer is over a row's band, a label above the band, at the pointer, shows that place's local time and date there (`formatTime`, a space, a middle dot, a space, `formatDate`; for example `8:00 PM · 19-Nov-26`). The instant is the window's start plus the pointer's fraction of the band, rounded to the `pickerStepMinutes` grid; the local time comes from `localAt` with the row's zone. View state only: no action, nothing saved. The label goes when the pointer leaves the band, catches no pointer events and is aligned to the band's end near its left or right end. `picker.js` tells it the window and the zones. | `domain/format.js` | PCK-008, DSP-001, DSP-002, DEC-019 |
| `views/map.js` | The world map (M17): clones the static SVG outline (DEC-026) and draws one pin per place, rebuilt on every render so the tick updates the times. Each pin is a location icon (M28: an inline SVG in the pin template, 24 by 22 px, its tip on the place; DEC-026) placed by the CSS custom properties `--pin-left` and `--pin-top`, with a label of the place's name (following the country-name setting), time and date, which the view puts beside (18 px from the tip), above (28 px) or below (8 px) the icon, wherever it covers no other label or icon. `main.js` passes `placeName` and `placePin`. `layout.css` puts the map and the month grid in one left column as one joined card, the map (rounded at the top) taking the height the grid (rounded at the bottom) leaves, and the picker as its own card at the right, touching the left column, with no page padding at the sides or the bottom (DEC-020; one column on narrow screens). With DEC-028 the map's height can be set by the user, and the grid takes the rest. On a short map the labels shrink (a container query in `map.css`). | none | MAP-001, CLK-001, CLK-003 |
| `views/month-grid.js` | The month grid (M15): previous and next month buttons, day headers (a two-letter weekday above the day number), one row per place (its name, and its country below it while country names are on) with a blank cell per day (weekend, holiday, split by a diagonal gradient, today outlined, the hovered or focused holiday or vacation cell outlined in the text colour) and, in each holiday or vacation cell, a button whose hover or focus shows the card of `views/cell-card.js` (DEC-031; the card has no buttons, so the click card with Hide and Remove goes). Each cell has `data-place-id`, `data-date` and `data-fill` (DEC-030), which the delegated `contextmenu` listener of `views/day-menu.js` reads. `main.js` passes the card and menu factories. The rows scroll inside `.month-grid-scroll` while the day headers stay sticky. The card ends with the month grid's part of the legend (a slot that `views/legend.js` fills). `main.js` passes `dispatch`, `placeFacts` and the Hijri-note factory. While Hijri is on (M16) it adds a Hijri month band above the day headers (one cell per Hijri month of the first place, with the information button in the corner), the two-digit Hijri day in each cell, and the Hijri date in the holiday card. | `domain/format.js` | CAL-001 to CAL-007, LAY-001, HIJ-001, DSP-003, VAC-001, VAC-004, DEC-030, DEC-031 |
| `views/hijri-note.js` | The information button beside the Hijri month band and its card with the note that Hijri dates are calculated (M16). The button toggles the card; Escape closes it and returns the focus to the button. `main.js` passes its factory to `month-grid.js`. | none | HIJ-004 |
| `views/legend.js` | The legend (LEG-001, M28), in two parts. The month-grid and picker templates each hold an empty part (`data-legend="month"` and `data-legend="picker"`); `legend.js` fills each from `#legend-month-template` (weekend, public holiday, weekend and holiday, vacation, today) and `#legend-picker-template` (working hours, non-working hours, day off: weekend, holiday or vacation) and empties them on the empty page. It renders after the month grid and the picker, so their parts exist. `legend.css` draws each part under a hairline at the bottom of its card; no banner is fixed to the page bottom. | none | LEG-001, DEC-020 |
| `views/actions.js` | One delegated click listener: turns `data-action` of a plain action (`refresh`, `openSettings`) into a controller action. Only `main.js` imports it. | none | REF-001, SET-007 |
| `views/error-screen.js` | Shows the message and stack of an unexpected error on the page; `main.js` calls it from the `error` and `unhandledrejection` handlers. | none | project rule (top-level handler) |

Import rules: `domain/*` imports only other `domain/*` modules and `data/*` (`data/cities.js` only from `domain/cities.js`, `data/holiday-table.js` only from `domain/holiday-table.js`). `controller.js`
imports `domain/*` and `controller-holidays.js`; `controller-holidays.js` imports `domain/*` only and only
`controller.js` imports it (DEC-022). Views import `domain/format.js` and receive everything else as arguments.
`api.js`, `storage.js`, `files.js` and `clock.js` import `config.js` and `log.js` only. Only `main.js` imports
across layers. `tests/unit/import-rules.test.js` walks the imports under `src/` and fails on a broken rule.

### 2.2 Directory structure

Create a folder only when it is listed here.

| Path | Purpose and owner |
| --- | --- |
| `src/` | Source. Holds `index.html`, `main.js`, `config.js`, `log.js`, `api.js`, `storage.js`, `files.js`, `clock.js`, `controller.js`, `controller-holidays.js`, `controller-places.js` and the sheets `styles.css` (imports the others), `theme.css`, `base.css`, `layout.css` plus one sheet per view (`map.css` styles the world map and its location icons; `month-grid.css` styles the month grid; `picker.css` styles the picker card, the day selector and its calendar; `legend.css` styles the two legend parts and the notices button, badge and card; `settings.css` styles the settings page, DEC-033; `popovers.css` styles the day menu, the hover card and the dialogs, DEC-031). `layout.css` also styles the page area (the joined map and month grid card, the picker card and the gaps), the header, the empty page and the error screen. Each component's sheet sets its own corner radius from the `--radius-*` tokens of `theme.css`; `base.css` sets only the buttons'. |
| `src/domain/` | Pure logic modules from section 2.1. |
| `src/views/` | View modules, one per screen part. |
| `data/` | Input data. `cities.js` (the city table, DEC-015), read by `domain/cities.js`. With DEC-024: `holiday-table.js`, generated by `scripts/make-holiday-table.mjs`, read by `domain/holiday-table.js`. With DEC-026: `ne_110m_land.geojson`, downloaded once, and `map-outline.svg`, generated from it by `scripts/make-map.mjs` and read by `scripts/build.mjs`. With DEC-029: `zone.tab` and `iso3166.tab`, downloaded once, and `zone-table.js`, generated from them by `scripts/make-zone-table.mjs` and read by `domain/zone-table.js`. Generated files are never edited by hand. |
| `dist/` | The built one-file page. Generated by `scripts/build.mjs`; not committed. |
| `tests/unit/` | `node --test` tests, one file per source module. |
| `tests/e2e/` | Workflow tests through `controller.js` with fakes for `api`, `storage` and `clock`. |
| `tests/e2e/ui/` | Playwright tests of the built file. |
| `scripts/` | Adds `build.mjs` and, with DEC-024 and DEC-026, the development scripts `make-holiday-table.mjs` and `make-map.mjs` and, with DEC-029, `make-zone-table.mjs`. The other scripts are unchanged. |
| `.github/workflows/` | With DEC-023: `pages.yml`, the workflow that builds the page, publishes it to GitHub Pages and attaches it to the release `latest`. |
| `docs/`, `config/`, `.claude/`, `.githooks/`, `.vscode/` | Unchanged. `config/.env` stays unused: the page has no secrets and no environment. |

### 2.3 Settings

All values live in `config.js` as one frozen object. The page has no environment, so
`config/.env.example` stays empty.

| Setting | Default | Meaning and references |
| --- | --- | --- |
| `holidayServiceBaseUrl` | `https://nagerholidays.com/api/v4` | Base URL of the holiday service. Checked live in M2; see section 5. HOL-001 |
| `holidayRequestTimeoutMs` | 10000 | Time to wait for one holiday request. Confirmed by the user on 2026-11-18 (dialog). |
| `clockTickMs` | 60000 | How often the current times update. CLK-003. Added to `config.js` in M11. |
| `pickerStepMinutes` | 15 | How far the marker moves for one arrow key press, and the grid its drag and the hover time snap to. PCK-001, PCK-008. Confirmed by the user on 2026-11-18 (dialog). |
| `pickerAxisLabelEveryHours` | 6 | Hours between two labels of the picker's hour axis. PCK-001. From the canvas (2026-11-18). |
| `storageKey` | `zuno.settings` | Key of the saved settings record. SET-004 |
| `holidaysStorageKey` | `zuno.holidays` | Key of the saved record of the user's added and hidden holidays. HOL-009, DEC-017. Added to `config.js` in M24. |
| `holidaysFileName` | `zuno-holidays-and-vacations.csv` | Name of the exported file. HOL-010, DEC-032. Added to `config.js` in M25 as `zuno-holidays.json`; DEC-032 changes the name and the format. |
| `defaultCityIds` | `tokyo`, `cairo`, `new-delhi`, `madrid`, `bogota`, `riyadh`, `islamabad` | The default places, in order. SET-014 |
| `mapMinHeight`, `mapMaxHeight`, `mapHeightStepPx` | 240, 900, 20 | The lowest and highest map card, in pixels, and how far one arrow key on the map's border handle moves it. LAY-004, DEC-028. `main.js` passes the two limits to the controller and to `parseSettings` as `mapLimits`, and all three to `views/map-resize.js`. |
| `pickerDefaultHours`, `pickerMinHours`, `pickerMaxHours` | 24, 24, 48 | Hour slots of the picker window: at first, the fewest (the whole day, PCK-006) and the most. The upper limit was confirmed by the user on 2026-11-18 (dialog). LAY-002, DEC-019. Added to `config.js` in M26; `main.js` passes them to the controller and to `parseSettings` as `pickerLimits`. |
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
| `date-holidays` | Generates the built-in holiday table at development time | DEC-024 | Installed 3.39.2, dev-only, exact version, approved by the user on 2026-11-18. Code ISC; data CC BY-SA 3.0 by its README (its LICENSE file says 4.0). `public` holidays with English names for all seven countries, checked in M31. Run by `scripts/make-holiday-table.mjs` only; the page never imports it. | github.com/commenthol/date-holidays, 2026-11-18 |
| Natural Earth 1:110m land | The map's outline | DEC-026 | Downloaded on 2026-11-18 by `scripts/make-map.mjs --download`: `data/ne_110m_land.geojson`, 138 KB. Public domain (Natural Earth's terms of use). One file, fetched once at development time. | github.com/nvkelso/natural-earth-vector, 2026-11-18 |
| IANA `zone.tab` and `iso3166.tab` | The time zones, pins and country codes of custom places | DEC-029 | Not downloaded yet: `scripts/make-zone-table.mjs --download` fetches them once, when the milestone runs and the user approves. Public domain by the files' own headers. `zone.tab` columns: country code, ISO 6709 coordinates, zone name, comments (only when a country has several zones). | iana.org/time-zones and the tz database's file headers, 2026-11-23 |
| GitHub Pages and GitHub Actions | Publishes the built page and attaches it to the release `latest` | DEC-023 | Free for public repositories. | Pages live since M43 (2026-11-18); the release step added on 2026-11-19 |
| Database, server, LLM, framework | none | | The page is static with one outside service. | |

### 2.5 Critical flows and operations

**Open the page (PCK-004, CLK-001, SET-007, SET-014, SET-015, HOL-001).** `main.js` reads the
settings and the user's holidays through `storage.js`. With no valid settings record the
controller uses the default settings, which hold the default places (SET-014); a saved place
whose city is not in the table is dropped (SET-015). With no places it shows the empty page and
stops (SET-007). Otherwise it sets the selected day to today in the first place and the marker to
the current instant (PCK-004), draws every view from the zones, weekends and any holidays already
in memory, and asks `api.js` for each needed country and year, or the built-in holiday table for one
of its seven countries (DEC-024). A country-year is requested once,
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

**Move the border between the map and the month grid (LAY-004, LAY-005).** Dragging the handle
on the border resizes the map live (view state); releasing it, or an arrow key on it, dispatches
`setMapHeight`, which `domain/settings.withMapHeight` checks against `mapLimits` and the controller
saves with the other settings. On the next visit the saved `mapHeight` comes back with the record
and `views/map-resize.js` applies it before the first paint of the page area (DEC-028).

**Add, remove, hide and show a holiday; export and import (HOL-003, HOL-006 to HOL-012).** Each
change goes through `domain/user-holidays.js`, is saved through the holidays storage, and redraws
the month grid and the picker, which always get the effective holidays. Export and import are in
the paragraphs below (DEC-032).

**Add a custom place (SET-018, MAP-002, SET-015).** The form (`views/settings-custom-place.js`) checks
that the name is not empty, the zone is in the table and a country is chosen, then dispatches
`addCustomPlace`. `controller-places.js` asks `domain/places.createCustomPlace` for a place with the
next id `place-N`; a refused entry saves nothing. The settings are saved and the views redraw: the map
pin at the zone's coordinates, the picker and grid rows with the country's weekend. The country's
holidays are requested like any other's (HOL-001); a country the service lacks answers `unavailable` and
the notice of REF-002 appears until the user adds a holiday (HOL-014). On the next visit `parseSettings`
keeps the place if its zone and country are in the tables and drops it otherwise (SET-015).

**Right-click a day (VAC-001 to VAC-005, HOL-015, HOL-019).** The `contextmenu` event on a cell opens the
day menu with the choices `dayMenuChoices` gives for that cell. A choice with "…" opens the dialog,
whose Add or Save dispatches `addHoliday` (for the row's country, HOL-015), `addVacation` or
`changeVacation` with the place's id. `removeVacation`, `hideHoliday` and `removeHoliday` dispatch at
once. Every accepted change is saved (the settings for a vacation, the holiday record for a holiday) and
the grid and picker redraw; a refused change saves nothing, and for the vacation form `checkVacation` has
already told the user why (VAC-003).

**Import a CSV file (HOL-011, HOL-012, HOL-016 to HOL-018).** The picked file goes to `importHolidays`;
`files.readText` returns its text and `planImport` returns `refused` or a plan. A refused file sets
`holidayImport` to `refused` and the file card shows the message. A plan sets it to a `preview`, and
`views/import-dialog.js` opens with the counts. Add dispatches `confirmImport`; Cancel, and Escape (the
dialog's `cancel` event), dispatch `cancelImport`. Nothing is saved before Add.

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
result has no regional holiday for any region (user decision 2026-11-17; HOL-004). A country for
which the user has added at least one holiday is left out of the first list (HOL-014;
`noticesOf` in `controller-holidays.js` has the user's record). The
notices view shows both lists in the card behind the information button, with a count badge.

**Failures.** The holiday service down or slow: `unavailable`, the page stays useful (REF-002).
Stored settings invalid: the default places and a logged warning (DEC-016). A thrown error anywhere
else: the top-level handler shows the error and the stack and logs it (project rule).

**External data flow.** One flow leaves the machine: a `GET` to the holiday service with a country
code and a year (HOL-002, DEC-005). Nothing else is sent, no cookie, no header with user data. The
Content-Security-Policy tag (DEC-012) blocks any other request. The holidays file is written to
and read from the user's own machine and never sent anywhere (DEC-032). At development time only,
and with no user data: one download of the map data (DEC-026), one of the time-zone data (DEC-029) and the installation of the holiday
library (DEC-024). Publishing (DEC-023) sends the built page, which holds no user data, to GitHub.

## 3. Data model

All types are JSDoc `@typedef`s in the module that owns them.

| Type | Fields | Owner and rules |
| --- | --- | --- |
| `Place` | `id` (string, unique), `cityId` (id of a `City`, or `null` for a custom place), `custom` (`{ name, zone, countryCode }`, or `null` for a city; exactly one of `cityId` and `custom` is set, DEC-029), `countryCode` and `zone` (filled in from the city or the custom block, not chosen), `label` (display name, empty means the city's or the custom place's name), `region` (code, empty means national only), `weekendDays` (list of days, 1 = Monday to 7 = Sunday, or `null` for the country's weekend; an edit that sets exactly the country's days stores `null`, SET-017), `hijriVariant` (`umalqura` or `tabular`), `hijriAdjust` (-1, 0 or 1), `vacations` (list of `Vacation`, none by default, DEC-030) | `domain/places.js`. The list order is the display order; the first place is the picker's reference (PCK-006). SET-002, SET-016. |
| `Settings` | `version` (2), `places` (list of `Place`), `workStartMinutes`, `workEndMinutes`, `showCountry` (false by default), `showHijri` (false by default), `theme` (`light`, `dark` or `auto`; `auto` by default), `pickerHours` (whole number from `pickerMinHours` to `pickerMaxHours`), `mapHeight` (whole number of pixels from `mapMinHeight` to `mapMaxHeight`, or `null`; `null` by default) | `domain/settings.js`. Saved as one JSON record. Start must be before end. A record without `pickerHours` gets `pickerDefaultHours`; hours outside the limits make the record invalid. A record without `mapHeight`, or with one outside the limits, gets `null` (DEC-028). DEC-016. |
| `City` | `id` (slug, never changes), `name`, `countryCode` (ISO 3166-1 alpha-2), `zone` (IANA name), `latitude`, `longitude` | `data/cities.js`. The 55 rows of the spec's section 9, in that order. DEC-015. |
| `ZoneRow` | `zone` (IANA name), `countryCode`, `latitude` and `longitude` (degrees, of the zone's principal location) | `data/zone-table.js`, read by `domain/zone-table.js`. One row per zone of `zone.tab`, about 420. DEC-029. |
| `Vacation` | `start` and `end` (`YYYY-MM-DD`, `end` not before `start`), `label` (trimmed, may be empty) | `domain/vacations.js`; kept in `Place.vacations`. The three fields together name a vacation: no two of one place are equal; overlap is allowed. DEC-030. |
| `ImportPreview` | `status` (`preview`), `fileName`, `total`, `importable`, `missingPlaces` (names), `invalid`, `rows` (the importable entries: holidays, hidden holidays and vacations with the `placeId` they matched) | `domain/holidays-file.js`; kept in the controller state's `holidayImport` until Add or Cancel; never saved. DEC-032. |
| `ImportRecord` | `id` (`import-N`), `fileName`, `importedAt` (UTC milliseconds); entries of `UserHolidays` and `Vacation` gain an optional `sources` (list of record ids) | `domain/user-holidays.js` keeps the list in `UserHolidays.imports`; `domain/holidays-file.js` makes records and the removal plan. An entry with no `sources` is the user's own and is never removed by a delete. DEC-035. |
| `UserHolidays` | `version` (1), `added` and `hidden` (lists of `{ countryCode, date, name }`, `date` as `YYYY-MM-DD`) | `domain/user-holidays.js`. Saved as one JSON record and exported in the same shape. No two entries of one list share country, date and name. DEC-017. |
| `Holiday` | `date` (`YYYY-MM-DD`), `name`, `regions` (list of codes, or empty for national) | `domain/holidays.js`, made from the service record (only type `Public` is kept) or from a row of the built-in holiday table (DEC-024). |
| `HolidayResult` | `status` (`loaded` or `unavailable`), `holidays` or `reason` | `api.js`. Kept in memory per country and year. |
| `Marker` | `instant` (UTC milliseconds) | State in `main.js`. Starts at the current instant. Always inside the picker window. |
| `selectedDay` | `{ year, month, day }` in the first place | State in `main.js`. Starts at today in the first place. The picker window starts at its midnight. DEC-019. |
| `DayFacts` | `date` (`YYYY-MM-DD`), `isWeekend`, `holidayName` or `null`, `holidayAdded`, `vacations`, `fill` (`{ first, second }`, DEC-030), `isToday`, `hijri` (day, month, year, or `null` while Hijri is off) | `domain/calendar.js`. Today is the place's own local date (CAL-004). |
| `PickerRow` | `placeId`, `localDateTime` of the marker, `hijri` (day, month, year, or `null` while Hijri is off), `segments` (list of `{ from, to, kind }`) | `domain/picker.js`. Segments cover the window exactly. Weekend and holiday time is `dayOff` (PCK-005). |

Integrity: a stored `Place` that is neither a city of the table nor a valid custom place is dropped when the record is read; a vacation that is not valid is dropped alone and its place stays
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
- `files.createFiles({ doc, urls }) -> { saveText, readText }`: `saveText(fileName, text, mimeType) -> void`
  offers the text as a download; `readText(file) -> Promise<{ status: "read", text } | { status: "unreadable" }>`.
- `clock.now() -> number`, `clock.prefersDark() -> boolean`.
- `controller.createController({ api, storage, holidayStorage, files, holidaysFileName, clock, defaultHours, defaultCityIds, pickerLimits }) -> { getState, dispatch, subscribe }`.
  `pickerLimits` is `{ defaultHours, minHours, maxHours }` (M26). With DEC-028 it also takes
  `mapLimits`, `{ minHeight, maxHeight }`, and `parseSettings(value, limits)` takes
  `{ ...pickerLimits, mapLimits }`.
  `defaultHours` (`{ start, end }`, minutes after midnight) and `defaultCityIds` (the default places'
  cities, in order) come from `config.js` through `main.js`; with no valid saved record `open` uses
  `domain/settings.defaultSettings(start, end, cityIds)`, and nothing is saved until a setting changes.
  Actions: `open`, `refresh`, `tick`, `setMarker`, `shiftMarkerDay`, `showMonth`, `addPlace`,
  `removePlace`, `movePlace`, `editPlace`, `setWorkingHours`, `setShowCountry`, `setShowHijri`,
  `toggleNotices`, `openSettings`, `closeSettings`. `setMarker` takes an
  `instant` (drag) or a `date` (a day picked in the calendar, PCK-007); `showMonth` takes an
  `offset`; `addPlace` takes a `cityId` (the controller makes the id, `place-N`; a city not in the list is refused); `removePlace`
  a `placeId`; `movePlace` a `placeId` and an `offset` (-1 or 1); `editPlace` a `placeId` and
  `changes` (label, region, weekend days, Hijri variant or adjustment; the city, country and zone never change); `setWorkingHours` a `start` and an
  `end`; `setShowCountry` and `setShowHijri` a `value`. A refused change saves nothing.
  The page view also carries `regions` (region codes of each country's loaded holidays, from
  `listRegions`), which the settings panel lists per place (SET-006).
  Actions added or changed by DEC-016 to DEC-019: `editPlace` changes
  may hold `weekendDays`; `setPickerHours` takes `hours`; `setMapHeight` takes `px` (DEC-028); `setMarker` with an `instant` moves only
  the marker and with a `date` also sets the selected day; `shiftMarkerDay` shifts the selected day;
  `addHoliday` takes `countryCode`, `date` and `name`; `removeHoliday`, `hideHoliday` and
  `showHoliday` take the same three; `exportHolidays` takes nothing; `importHolidays` takes the
  picked `file`. `createController` also receives `holidayStorage`, `files`, `holidaysFileName`, `defaultCityIds` and
  the picker hour limits. The page view also carries `selectedDay`, `pickerWindow`, `windowDates`
  (the window's `first` and `last` date in the first place, or `null` with no places), `userHolidays`
  and `holidayImport` (`null`, `{ status: "refused" }` or an `ImportPreview`, DEC-032).
  DEC-029 to DEC-032 add `addCustomPlace` (`name`, `zone`, `countryCode`; refused when the name is empty
  or the zone or country is not in the tables), `addVacation` (`placeId`, `start`, `end`, `label`),
  `changeVacation` (`placeId`, `original`, `changes`), `removeVacation` (`placeId`, `vacation`) and
  `confirmImport` and `cancelImport` (no arguments); `importHolidays` now makes a preview instead of
  merging, and `exportHolidays` writes a CSV file. `selectHoliday` is removed. DEC-035 adds
  `removeImport` (`importId`).
  `dispatch` returns a promise that settles when the action's holiday requests are answered.
  `getState()` returns the state (settings or `null`, `now`, marker, month, holiday results, the
  selected holiday, the open panels) plus the models the views draw: `isEmpty`, `picker`, `grid`
  and `notices` (`countries`, `placeIds`).
- `domain/cities`: `listCities() -> { id, name, country }[]` (in the table's order),
  `cityOf(id) -> City | null` and `countryName(code) -> string` (throws `RangeError` for a code no
  city has; with DEC-029 it names any code of `domain/zone-table`) and `listCountries() -> { code, name }[]`.
  `domain/user-holidays`: `addHoliday`, `removeHoliday`, `hideHoliday` and
  `showHoliday(record, { countryCode, date, name }) -> UserHolidays | null` (`null`: refused, save
  nothing), `isAddedHoliday(record, entry) -> boolean`,
  `parseUserHolidays(value) -> UserHolidays | null` and
  `mergeUserHolidays(saved, imported) -> UserHolidays` and
  `effectiveHolidays(serviceHolidays, record, countryCode) -> Holiday[]`. `domain/places`: `createPlace(id, cityId) -> Place` (throws `RangeError` for a city
  not in the list), `restorePlace(value) -> Place | null` (fills in the country and zone from the
  city) as well as `createCustomPlace(id, entry) -> Place` (DEC-029; `RangeError` for an empty name or a zone or country outside the tables), `holidayCountries(places) -> { code, name }[]` and `isUnusablePlace(value) -> boolean` (neither a city of the list nor a valid custom place, SET-015);
  `domain/settings.parseSettings(value, limits) -> Settings | null` drops the unusable places (and an invalid vacation) and refuses
  any other fault and any version but 2.
- `domain/picker.buildPicker(settings, marker, holidays) -> PickerRow[]`,
  `domain/picker.pickerWindow(settings, marker) -> { from, to } | null` (the window of PCK-006),
  `domain/picker.shiftMarkerDay(settings, marker, days) -> Marker` and
  `domain/picker.markerOnDate(settings, marker, date) -> Marker` (PCK-007; with no places the
  marker is returned unchanged), and
  `domain/calendar.buildMonth(settings, monthRef, holidays, nowInstant) -> DayFacts[][]`, where
  `monthRef` is `{ year, month }` (one object, because of the 4-parameter limit) and `holidays` is a
  record of `Holiday[]` by country code.

- `domain/zone-table` (DEC-029): `listZones() -> ZoneRow[]`, `zoneRow(zone) -> ZoneRow | null`,
  `isKnownZone(zone) -> boolean`, `listCountryCodes() -> string[]` and `isKnownCountry(code) -> boolean`.
- `domain/vacations` (DEC-030; an `entry` is `{ start, end, label }`): `addVacation(vacations, entry) ->
  Vacation[] | null`, `changeVacation(vacations, original, entry) -> Vacation[] | null`,
  `removeVacation(vacations, original) -> Vacation[]`, `vacationsOn(vacations, date) -> Vacation[]`,
  `checkVacation(entry) -> "ok" | "start-missing" | "end-missing" | "end-before-start"` and
  `parseVacations(value) -> Vacation[]`.
- `domain/csv` (DEC-032): `parse(text) -> string[][] | null` and `format(rows) -> string`.
  `domain/holidays-file`: `toCsv({ userHolidays, places }) -> string` and `planImport(text, { places })
  -> { status: "refused" } | { status: "plan", total, rows, missingPlaces, invalid }`.
- `domain/calendar.dayMenuChoices(facts) -> { kind, vacation? }[]` (DEC-031): `facts` is one cell's
  `DayFacts`; `kind` is `addHoliday`, `addVacation`, `hideHoliday`, `removeHoliday`, `editVacation` or
  `removeVacation`.

**Screen parts and interaction states** (the canvas shows each; sizes and colours are in DEC-020):

- Header: the title "Zuno" with the subtitle "Many time zones, One team!", the "Updated" time (the
  time of day and the date in the browser's own zone, from `state.now`),
  a notices button with a count badge, Refresh, Settings. The notices card opens and closes on the
  button; Escape closes it. The Settings button opens the settings panel (M12). `views/notices.js`
  owns the badge and card; `views/legend.js` owns the two legend parts. CSS class names are `block-element` in lower case with hyphens (`header-title`), the form
  `stylelint-config-standard` checks; the HTML and CSS rule says the same since 2026-11-18 (user decision).
- Map: one pin per place with the place name, current time and date. Pins stay at their coordinates
  as the map grows and shrinks (the map stretches to fill its space; DEC-026). Each pin is a location icon; each label sits beside,
  above or below its pin, wherever it covers no other label or pin.
- Month grid: previous and next month buttons (32 px, DEC-020) around the month title; the corner label "Day"; a Hijri month band and Hijri day in each cell only
  while Hijri is on (the Hijri day as DEC-027 describes); a vacation has its own colour (DEC-030); pointing at or focusing a holiday or vacation cell outlines it and shows a card beside that place's name
  with the holiday's name, date and (if Hijri is on) Hijri date, or each vacation's label and dates; the card has no buttons and goes
  when the pointer or focus leaves (DEC-031). A right-click on any cell opens the day menu (DEC-031). While Hijri is on, an information button beside the Hijri month band opens a card with the
  note that Hijri dates are calculated and may differ from official announcements (HIJ-004). The header and Hijri band stay in view while the rows scroll vertically.
- Border between the map and the month grid: a resize handle centred on it (dragged, or moved by
  the up and down arrow keys, `mapHeightStepPx` at a time; LAY-004, DEC-028).
- Picker panel (a card on the right, touching the map and month grid cards and the window's right edge; no heading, the section is named "Meeting time"): a resize handle centred on its left border
  (dragged, or moved by the left and right arrow keys, one hour slot at a time); the day selector
  (previous day, a date button that opens a month calendar and shows the window's dates, next
  day); the hour axis; one row per place: its name at the left and, in the band beside the marker, the time in bold with the date after it (then the Hijri date while Hijri is on; DEC-034); the picker's legend at the bottom of the card, under a hairline. The marker can be
  dragged or moved with the arrow keys; the axis stays in view while rows scroll. The first
  place's row has the reference background. Pointing at a row's band shows that place's local
  time and date at that point (PCK-008).
- Legend (LEG-001): two parts, each at the bottom of its card. Month grid: weekend, public
  holiday, weekend and holiday, vacation, today. Picker: working hours, non-working hours, day off (weekend, holiday or vacation).
- Settings (the settings panel of the spec; a page that covers the window since DEC-033): a bar with the
  title and a Close button, then three tabs, each with two cards side by side. General: Working hours
  (Start and End lists) and Display (country names, Hijri, and the theme: Light, Dark or Auto). Places: Add a
  place or person (two toggle buttons, "A city from the list" with the list of the 55 cities, each with its country,
  and "A person or another city" with Name, Time zone and Country or territory, DEC-029; and the Add place
  button) and Places (reorder with arrows, expand to edit the display name, the region, the weekend days
  and, while Hijri is on, the Hijri variant and adjustment; remove; a custom place's name, zone and country
  are not editable). Holidays and vacations: Holidays (add a holiday by country, date and name; the added
  holidays, each with Remove; the hidden holidays, each with Show; with DEC-024 one credit line for the
  built-in holiday table) and Holidays and vacations file (Export, Import, the description of the format, a
  message when an imported file was refused; DEC-032). The footer: the sentence about saved changes and, with DEC-025, the version. Regions
  are listed by the service's code (for example `ES-MD`). The panel gets the default working hours
  (`defaultHours`) from `main.js`.
- Day menu and dialogs (DEC-031, DEC-032): a right-click on a day of the month grid opens a menu at
  the pointer: Add public holiday…, Add vacation…, then (by the kind of day) Hide public holiday, Remove
  public holiday, Edit vacation… and Remove vacation. The "…" choices open a dialog with the form
  (holiday: name and date; vacation: start, end and label). Picking a CSV file to import opens a dialog
  that says how many of its rows can be imported, which places are missing and how many rows are not
  valid, with Cancel and Add.
- Hide and Remove of a holiday (HOL-008, HOL-007) are choices of the day menu, because the hover card has no
  buttons (DEC-031); the settings also list the added holidays with Remove and the hidden ones with Show.
- Empty page: prompt to add a place, shown only while the settings hold no places (SET-007).

Keyboard and accessibility: every control is a real `<button>`, `<a>`, `<input>` or `<select>`;
every icon-only button has an `aria-label`; popovers close on Escape and return focus to the button
that opened them. The hover time of the picker (PCK-008) needs a pointer; a keyboard user reads the
same times by moving the marker with the arrow keys (accepted by the user on 2026-11-18, spec
section 7).

The hover card of a holiday or vacation cell also shows on keyboard focus (CAL-006), because those cells are
buttons. The day menu opens only with a pointer (accepted by the user on 2026-11-23, DEC-031); once it is open,
its choices are buttons and Escape closes it. The dialogs are native `<dialog>` elements, which trap the focus
and close on Escape; the dialog's first field takes the focus and the focus returns to the cell's
menu origin when it closes.

**Validation and errors.** Invalid input (a working-hours end before the start, no city chosen, a vacation
that ends before it starts, a custom place with no name or a zone that is not in the table)
is refused by `domain/settings.js` and the view shows the field as invalid; it is not an error.
Everything else follows DEC-006 and the top-level handler.

## 5. Unresolved risks and design checks

| Issue and references | Owner | Evidence needed | Blocks what? |
| --- | --- | --- | --- |
| Weekend data lags a recent country change. DEC-003 | Accepted risk | EX-002 in four browsers. | None. |
| The built-in holiday table ends with 2028, and its Islamic holidays are calculated. DEC-024 | User | Generate the table again before 2029; correct a wrong day by hiding it and adding the right one. | None. |
| The Hijri day at about 3.1:1 on the holiday colour. DEC-027 | Accepted risk (user, 2026-11-18) | The browser test measures the real ratio. | None. |
| The vacation colour and its contrast on the month grid, and the vacation colour of a day that is also a holiday and a weekend (the holiday colour shares the cell). DEC-030 | Approved with the design (2026-11-23) | The browser test measures the ratios (about 8.9:1 and 5.1:1 by hand, light). | None. |
| Country names in the CSV come from `Intl.DisplayNames`; another browser may spell one differently, so a row is counted invalid. DEC-032 | Accepted risk (approved with the design, 2026-11-23) | The import dialog shows the count, and the two-letter code is read as a fallback; a test imports a file made in Chromium into Firefox and WebKit. | None. |
| `<datalist>` suggestions differ by browser: whether a typed text matches a zone by prefix or by substring is the browser's choice. DEC-029 | Accepted risk (approved with the design, 2026-11-23) | The form accepts only an exact table zone, so a wrong match cannot be saved; a browser test types a full zone name in the four browsers. | None. |
| A zone of the newest tz release may be unknown to an older browser. DEC-029 | Design | The four-browser test that `Intl.DateTimeFormat` accepts every zone of the table; a refused zone goes on the script's skip list. | The milestone that makes the zone table. |
| Two custom places in one time zone share a map pin. DEC-029 | Accepted risk (user, 2026-11-23) | Spec section 7. | None. |
| The picker label's contrast over the slot colours. DEC-034 | Accepted risk (spec section 7) | The browser test records the ratios; no threshold. | None. |
