# Design — Zuno

How to build what `spec.md` says. If this file and the spec disagree, the spec wins.

Review state: Approved. The user approved the design as a whole on 2026-11-18, in a dialog,
including DEC-023 to DEC-027 and the changed DEC-005, DEC-015 and DEC-020. The code implements
DEC-001 to DEC-022 (milestones up to M29), the holiday table of DEC-024 (M31, M32) and the
coastlines of DEC-026 (M34) and the version of DEC-025 (M40). DEC-023
and DEC-027 are not built yet: `docs/plan.md` holds their milestones.
Spec baseline: `docs/spec.md` as approved on 2026-11-18, with the acceptance examples EX-011 to
EX-026.
Visual reference (not code to copy): the "Zuno UI" canvas,
https://claude.ai/artifact/2GmNVHXyaLzy3E5XxUJPRB (light and dark Main page, Settings panel and
empty state). The app is called Zuno. The canvas was updated on 2026-11-18 from the user's
comments; DEC-020 records the look it shows. Its Settings boards were brought in line
with the app on 2026-11-18: the city list in "Add a place", no time-zone field, and the Holidays
section. For the map outline the canvas no longer leads: it keeps its hand-drawn coastlines, and
DEC-026 is the reference.

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
| DEC-015 | A built-in city table (`data/cities.js`) holds the 55 cities of the spec's section 9: a stable id, the name, the country or territory code, the time zone and the map coordinates. A place is a city of that table. Country names come from `Intl`, except a territory that the city list names differently (Hong Kong). The 245-country table is removed. | SET-002, SET-013, MAP-001, NFR-003, DSP-004. Replaces DEC-004 (user decision 2026-11-18: only these cities). |
| DEC-016 | Settings are saved in `localStorage` as one record of version 2. A record of version 1 (places by country) is not converted: it is read as "no saved settings", so the default places show. A version 2 place whose city is not in the table is dropped when the record is read. | SET-004, SET-014, SET-015, SET-016, LAY-003, SET-012. Replaces DEC-008 and DEC-014. Settings are user preferences, so the rule against app data in `localStorage` does not apply (approved 2026-11-17). |
| DEC-017 | The holidays a user adds or hides are a second `localStorage` record with the same shape as the holidays file. The controller applies them to the service's holidays before it builds the month grid and the picker. Holidays from the service are still kept in memory only. | HOL-003, HOL-006 to HOL-009. The user's own entries cannot be fetched again, so they must be saved. |
| DEC-018 | One new leaf module, `files.js`, is the only one that saves a file to the user's machine and reads a file the user picks. A picked file that is not JSON is returned as "unreadable" data, not thrown. | HOL-010 to HOL-012. Same pattern as DEC-006: the spec defines the recovery. Nothing is sent over the network (NFR-001). |
| DEC-019 | The picker window is `pickerHours` hour slots (a saved setting, 24 to `pickerMaxHours`) from midnight of the selected day in the first place. The selected day is state beside the marker. Every slot has the width `--picker-slot`; the panel's width follows the number of slots. | PCK-003, PCK-006 to PCK-009, LAY-002, LAY-003. User decisions 2026-11-18 (fixed slots, 24 hours or more, selected day). |
| DEC-020 | All colours and shapes are CSS custom properties in `theme.css`, each colour with its light and dark value in `light-dark()`; `views/theme.js` sets `data-theme` from the theme setting. Cards, buttons, inputs and popovers have rounded corners; month-grid cells stay square. Weekends are cyan. | THM-001, SET-012, LEG-001. Replaces DEC-009 (user decisions on the canvas, 2026-11-18: rounded corners, cyan weekend). Changed by user decisions of 2026-11-18 (dialogs): a smaller month header, the corner label "Day", half-transparent map labels. |
| DEC-022 | The controller has two modules. `controller.js` keeps the state, `createController`, the page, settings and picker workflows and the requests to the holiday service. `controller-holidays.js` holds the holiday side: loading the user's holiday record, the holiday actions, the holidays the page uses and the notices. Only `controller.js` imports it; it imports `domain/*` only. | DEC-007, DEC-017, DEC-018. `controller.js` passed the 300-line mark (user decision 2026-11-18). Behaviour does not change. |
| DEC-023 | The page is published to GitHub Pages by a GitHub Actions workflow (`.github/workflows/pages.yml`) in a public repository on the user's personal account `alkashef`: on every push to `main` it builds `dist/zuno.html` and deploys it as the site's `index.html`. The same file can also be opened from disk. The delivered app stays one file. | PKG-001. Replaces DEC-013. User decisions 2026-11-18: run from GitHub Pages or the local desktop, publish automatically; move the repository to `alkashef` and use Pages (dialog). |
| DEC-024 | The public holidays of the seven countries the holiday service does not cover come from a table in `data/holiday-table.js`. A development script generates it for 2026 to 2028 with the open-source library `date-holidays`, a dev-only tool. The page carries the table, sends no request for those countries, and treats a table holiday like a service holiday. | HOL-013, HOL-001, HOL-003, HOL-008, REF-002, NFR-001, EX-022, EX-023. User decision 2026-11-18 (dialog), which also approves the dev dependency. |
| DEC-025 | The version is the build's date and time in UTC, written `YYYY.MM.DD.HHmm`. `scripts/build.mjs` writes it into the settings panel's footer in place of a marker in `index.html`. The build gets the time as an argument. | VER-001, DSP-001, EX-026. User decisions 2026-11-18 (dialogs: build date, settings footer, wording). |
| DEC-026 | The world map's outline is real coastlines: Natural Earth's 1:110m land data (public domain), kept in `data/`, turned by a development script into one SVG path on the map's whole-world grid, and put into the page by the build. No country borders. Each place is still a location icon whose tip is on the place, with a label placed by `views/map.js` where it covers no other label or icon. | MAP-001. Replaces DEC-021. User decisions 2026-11-18 (dialogs: real coastlines only; the milestone downloads the data once). |
| DEC-027 | In a month-grid cell the Hijri day has no background of its own and regular weight. On a weekend or holiday cell it takes `--color-hijri-on-tint`, a slightly darker shade of the Hijri colour, which the user accepted at about 3.1:1 on the light theme's holiday colour: the one text that may fall below 4.5:1. | HIJ-001, DSP-003, spec section 7 (accepted risk). User decisions 2026-11-18 (dialogs). Replaces the Hijri day chip of DEC-020. |

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
is the time of the workflow's build. Precondition, the user's to do: a public repository on
`alkashef` with this history, and this clone's remote pointing to it. Validation: the workflow run
succeeds and the site's address answers with the page. Opening the file from disk is covered by the
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
`removeHoliday`, `hideHoliday`, `showHoliday`, `exportHolidays`, `importHolidays`), `holidaysByCountry`,
`regionsByCountry`, `holidayAt` (the holiday card of a cell) and `noticesOf`. It keeps no state: the
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
| `domain/holiday-table.js` | The built-in holiday table (DEC-024, M31): `isTableCountry(code)` and `tableHolidays(code, year)`, a country's holidays of a year as `Holiday` rows with no regions, sorted by date, or `null` for a year the table does not cover; it throws for a country outside the table. The only reader of `data/holiday-table.js`. | `data/holiday-table.js`, `domain/holidays.js` types | HOL-013, HOL-001, EX-022, EX-023 |
| `domain/user-holidays.js` | The holidays a user adds and hides (M24): `emptyUserHolidays`; `addHoliday`, `removeHoliday`, `hideHoliday` and `showHoliday`, each returning the new record or `null` for a refused change (adding or hiding refuses a date that is not a real calendar date, a name empty after trimming, a country no city of the list has, and an entry already in the list); `isAddedHoliday` (whether the holiday card offers Remove or Hide); `parseUserHolidays` (validates a stored value); `effectiveHolidays` (a country's service holidays without the hidden ones, plus the added ones as national holidays). `mergeUserHolidays(saved, imported)` (M25: the saved entries, then the imported ones the saved record lacks, so nothing is removed and no entry is doubled, HOL-011). | `domain/cities.js`, `domain/holidays.js` types | HOL-003, HOL-006 to HOL-012, DEC-017 |
| `domain/places.js` | Adds a place from a city, removes, moves, relabels and edits places (label, region, weekend days, Hijri variant and adjustment); an edit that sets exactly the country's weekend days stores `null` (SET-017); validates a stored place and fills in its country and zone from the city table; a place's map pin (`placePin`: position as percentages of the whole world from the city's coordinates, local time and date), and the parts of its name the views lay out apart (`placeFacts`: name, the city when a display name hides it, and the country while country names are on). | `domain/cities.js`, `domain/hijri.js`, `domain/zones.js`, `domain/format.js`, `domain/weekends.js` | SET-001, SET-002, SET-006, SET-008, SET-009, SET-015, SET-016, SET-017 |
| `domain/settings.js` | Settings shape (version 2), defaults (with the default places and the picker hours), validation, the theme choices (`themes`, `withTheme`) and the picker hours (M26: `withPickerHours(settings, hours, limits)` refuses hours that are not a whole number within the `PickerLimits`; `parseSettings(value, limits)` gives a record without `pickerHours` the default and refuses one outside the limits; `parseSettings` throws a `TypeError` when called without limits). | `domain/places.js` | SET-005, SET-007, SET-010 to SET-012, SET-014, SET-015, LAY-003, DEC-016 |
| `domain/calendar.js` | The month-grid model: one row per place, one cell per day; also `monthWeeks`, the days of a month in weeks (Sunday first, as in the canvas) for the day selector's calendar. | `zones`, `hijri`, `weekends`, `holidays` | CAL-001 to CAL-007, PCK-007 |
| `domain/picker.js` | The picker model: the window of `pickerHours` hours from midnight of the selected day in the first place, or the whole 25-hour day at 24 hours (`pickerWindow`), one row of segments per place (`buildPicker`), local times and Hijri dates at the marker, the selected day and marker after a picked date or a day shift (`chooseDay`, `shiftDay`), the marker at an instant kept inside the window (`markerInWindow`) or moved to the selected day when a settings change leaves it outside (`keepMarkerInWindow`), and the first and last date of the window (`windowDates`). M26. | `zones`, `hijri`, `weekends`, `holidays` | PCK-001 to PCK-009, DEC-019 |
| `controller.js` | The workflows. Applies an action to the state, asks `api.js` for holidays, saves settings, and calls `controller-holidays.js` for the user's holidays (DEC-022: it loads the holiday record on `open`, runs the holiday actions through `holidayHandlers`, gives the month grid, the picker and the holiday card the effective holidays of every place's country, and builds the notices). M32: for a table country (`holidayTable.isTableCountry`, injected by `main.js`) it takes a year's holidays from the table, through `tableAnswer`, and makes no `api` request (HOL-001, HOL-013). M26: holds `selectedDay` beside the marker (today in the first place on `open`), handles `setPickerHours` with the injected `pickerLimits`, keeps the marker inside the window after `setMarker` and after every settings change, and gives the views `pickerWindow` and `windowDates`. Pure apart from its injected `api`, `holidayTable`, `storage`, `holidayStorage`, `files` and `clock`. | `domain/*`, `controller-holidays.js` | all workflows |
| `controller-holidays.js` | The holiday side of the controller (DEC-022, M29). `loadUserHolidays(holidayStorage)` (M24: the saved record, or none added and none hidden). `holidayHandlers()` gives the handlers of `addHoliday`, `removeHoliday`, `hideHoliday` and `showHoliday` (M24: each saves the record after an accepted change and nothing after a refused one, and closes the card of a holiday that is gone), `exportHolidays` (M25: passes the current record and `holidaysFileName` to `files.saveJson`) and `importHolidays` (M25: asks `files.readJson`, validates with `parseUserHolidays`, merges with `mergeUserHolidays`, saves and redraws; an unreadable file or a value the validation refuses changes nothing and sets `holidayImport` to `refused`, a good import sets it to `null`). `holidaysByCountry` and `regionsByCountry` give the effective holidays and the region codes of every country, `holidayAt` the holiday card of a cell, and `noticesOf` the notices, and (M32) `tableAnswer(table, countryYear)` turns a table country's holidays of a year into a `loaded` result, or into `unavailable` for a year the table does not cover. It keeps no state: `controller.js` passes in a context (`deps`, `read`, `update`) and the state each function needs. Pure apart from the injected `holidayStorage` and `files`. | `domain/*` | HOL-003, HOL-004, HOL-006 to HOL-012, CAL-006, REF-002, SET-006, DEC-017, DEC-018, DEC-022 |
| `views/*.js` | One view per screen part (theme, header, notices, map, picker, day selector, month grid, legend, settings, empty page). `views/theme.js` applies the saved theme to the root element (DEC-009). Each owns its own DOM, clones `<template>` elements, and sends events up. | `domain/format.js` types | |
| `views/settings.js`, `views/settings-places.js` | The settings panel (M12: places). `settings.js` owns the panel, the working-hours lists (one choice every `workingHoursStepMinutes`, plus a saved time between two steps), the display switches, the theme choice, the add form ("Add a place": the 55 cities of the list in the table's order, each shown as "city, country"), Escape and the focus return; `settings-places.js` owns the list of places (name, the city a display name hides, country, offset from UTC and, while Hijri is on, Hijri variant) and their editors (display name, region, the weekend days (M23: a fieldset of seven day boxes, Su to Sa, each named by its full day name, the place's days ticked and a line naming the country's default; the last ticked box cannot be cleared) and, while Hijri is on, the Hijri variant and adjustment; no time-zone field). The sections run Working hours, Display, Add a place, Places, then Holidays (a 1 px line in the card-line colour ends each; the footer has none). `settings.js` hands the Holidays section to the factory `makeHolidays` (`views/settings-holidays.js`). `main.js` passes both the lookup (`cities` from `listCities`, `placeFacts`, `offsetAt` from `zoneOffset`, `placeWeekendDays` and `countryWeekendDays` from `domain/weekends.js`) and the list factory, because a view imports no other view and no domain module besides `format.js`. | `domain/format.js` | SET-001, SET-002, SET-004, SET-005, SET-008 to SET-013 |
| `views/settings-holidays.js` | The Holidays section of the settings panel (M24): the form that adds a holiday ("Country": the countries and territories of the list by English name, from `listCountries`; "Date", an `<input type="date">`; "Name"; "Add holiday"; an empty field is marked `aria-invalid` and nothing is sent), the heading "Added holidays" with one row per added holiday (the date as dd-mmm-yy, the country, the name) and a Remove button each, or "No holidays added.", and the heading "Hidden holidays" with one row per hidden holiday and a Show button each, or "No holidays hidden.". The rows clone `#settings-holiday-template`. M25 adds the Export button, the Import control (a labelled `<input type="file" accept=".json,application/json">` styled as a button, reachable by keyboard, cleared after each pick) and the message "The file was refused: it is not a Zuno holidays file. Nothing was changed." (`role="alert"`), shown while `holidayImport` is `refused`. `main.js` passes its factory to `settings.js`. | `domain/format.js` | HOL-006 to HOL-012 |
| `views/picker.js`, `views/day-selector.js` | The picker card (M14, M26, M28). `picker.js` owns the panel: its width of `pickerHours` hour slots (it sets `--picker-hours` on the panel; `layout.css` multiplies it by `--picker-slot`), the hour axis (labelled with the first place's local time every `pickerAxisLabelEveryHours`, from the window's start to its end, past midnight when the window is longer than the day), one row per place with its name, offset from UTC and (when they apply) city and country, its local time in bold with the date after it on the same line (in the style of the offset: caption size, muted colour) and, below, the Hijri date (while Hijri is on) at the marker, and its coloured stretches (a 28 px band) with hour lines, and the marker line with its handle under the rows, moved by dragging or by arrow keys in steps of `pickerStepMinutes`. The card has no heading: its section carries the accessible name "Meeting time". A row is only as tall as its text (padding 8 px above and below, 10 px at the sides, 6 px between the text and the band). The card ends with the picker's part of the legend (a slot that `views/legend.js` fills). It builds the resize handle (a button centred on the card's left border) and the hover label of each row from the templates in `index.html` and passes them to `picker-resize.js` and `picker-hover.js` (the factories `makeResize` and `makeHover` that `main.js` supplies, because a view imports no other view), telling them the number of hour slots and the window and zones of the rows on every render. Each row's marker time sits just right of the marker line (just left when it does not fit), and the name takes the wider space that is left. The axis is sticky inside the scrolling rows, so it shares their width and stays in view (LAY-001). `day-selector.js` owns the previous-day and next-day buttons, the date button, which shows the window's first and last date (`formatDateRange` of `windowDates`, PCK-009), and its month calendar on the selected day (Escape closes it and returns the focus). `main.js` passes `picker.js` the lookups it may not import (`localDateTime`, `zoneOffset`, `placeFacts`), the steps from `config.js` and the day-selector, resize and hover factories, and passes `day-selector.js` `monthWeeks`. | `domain/format.js` | PCK-001 to PCK-003, PCK-005 to PCK-007, PCK-009, LAY-001, DSP-001, DSP-002 |
| `views/picker-resize.js` | The resize handle of the picker card (M27, M28): dragging the button centred on the card's left border (pointer capture), or the left and right arrow keys on it, adds or removes hour slots. One slot width to the left (the computed `--picker-slot`) is one more hour. It dispatches `setPickerHours` with whole hours, only when the number changes, never below `pickerMinHours` or above `pickerMaxHours` (both passed in from `config.js` by `main.js`), and stops widening when the map column left of the card would get narrower than `--map-min-width` (320 px, in `theme.css`; it never narrows the panel because of that limit). The handle is hidden in the one-column layout under 60rem. The controller saves the width (LAY-003). | none | LAY-002, LAY-003, DEC-019 |
| `views/picker-hover.js` | The hover label of the picker rows (M27): while the pointer is over a row's band, a label above the band, at the pointer, shows that place's local time and date there (`formatTime`, a space, a middle dot, a space, `formatDate`; for example `8:00 PM · 19-Nov-26`). The instant is the window's start plus the pointer's fraction of the band, rounded to the `pickerStepMinutes` grid; the local time comes from `localAt` with the row's zone. View state only: no action, nothing saved. The label goes when the pointer leaves the band, catches no pointer events and is aligned to the band's end near its left or right end. `picker.js` tells it the window and the zones. | `domain/format.js` | PCK-008, DSP-001, DSP-002, DEC-019 |
| `views/map.js` | The world map (M17): clones the static SVG outline (DEC-026) and draws one pin per place, rebuilt on every render so the tick updates the times. Each pin is a location icon (M28: an inline SVG in the pin template, 24 by 22 px, its tip on the place; DEC-026) placed by the CSS custom properties `--pin-left` and `--pin-top`, with a label of the place's name (following the country-name setting), time and date, which the view puts beside (18 px from the tip), above (28 px) or below (8 px) the icon, wherever it covers no other label or icon. `main.js` passes `placeName` and `placePin`. `layout.css` puts the map and the month grid in one left column as one joined card, the map (rounded at the top) taking the height the grid (rounded at the bottom) leaves, and the picker as its own card at the right, a card gap (20 px) away and inside the page's padding (one column on narrow screens). On a short map the labels shrink (a container query in `map.css`). | none | MAP-001, CLK-001, CLK-003 |
| `views/month-grid.js` | The month grid (M15): previous and next month buttons, day headers (a two-letter weekday above the day number), one row per place (its name, and its country below it while country names are on) with a blank cell per day (weekend, holiday, split by a diagonal gradient, today outlined, the selected holiday outlined in the text colour) and the holiday card beside the place's name, which opens from a holiday cell's button and closes on its close button or Escape. The card has a Hide button for a service holiday (dispatches `hideHoliday`) and a Remove button for one the user added (dispatches `removeHoliday`); either way the controller closes the card. `main.js` passes `isAddedHoliday`, so the card knows which button to show. The rows scroll inside `.month-grid-scroll` while the day headers stay sticky. The card ends with the month grid's part of the legend (a slot that `views/legend.js` fills). `main.js` passes `dispatch`, `placeFacts` and the Hijri-note factory. While Hijri is on (M16) it adds a Hijri month band above the day headers (one cell per Hijri month of the first place, with the information button in the corner), the two-digit Hijri day in each cell, and the Hijri date in the holiday card. | `domain/format.js` | CAL-001 to CAL-007, LAY-001, HIJ-001, DSP-003 |
| `views/hijri-note.js` | The information button beside the Hijri month band and its card with the note that Hijri dates are calculated (M16). The button toggles the card; Escape closes it and returns the focus to the button. `main.js` passes its factory to `month-grid.js`. | none | HIJ-004 |
| `views/legend.js` | The legend (LEG-001, M28), in two parts. The month-grid and picker templates each hold an empty part (`data-legend="month"` and `data-legend="picker"`); `legend.js` fills each from `#legend-month-template` (weekend, public holiday, weekend and holiday, today) and `#legend-picker-template` (working hours, non-working hours, day off: weekend or holiday) and empties them on the empty page. It renders after the month grid and the picker, so their parts exist. `legend.css` draws each part under a hairline at the bottom of its card; no banner is fixed to the page bottom. | none | LEG-001, DEC-020 |
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
| `src/` | Source. Holds `index.html`, `main.js`, `config.js`, `log.js`, `api.js`, `storage.js`, `files.js`, `clock.js`, `controller.js`, `controller-holidays.js` and the sheets `styles.css` (imports the others), `theme.css`, `base.css`, `layout.css` plus one sheet per view (`map.css` styles the world map and its location icons; `month-grid.css` styles the month grid; `picker.css` styles the picker card, the day selector and its calendar; `legend.css` styles the two legend parts and the notices button, badge and card; `settings.css` styles the settings panel). `layout.css` also styles the page area (the joined map and month grid card, the picker card and the gaps), the header, the empty page and the error screen. Each component's sheet sets its own corner radius from the `--radius-*` tokens of `theme.css`; `base.css` sets only the buttons'. |
| `src/domain/` | Pure logic modules from section 2.1. |
| `src/views/` | View modules, one per screen part. |
| `data/` | Input data. `cities.js` (the city table, DEC-015), read by `domain/cities.js`. With DEC-024: `holiday-table.js`, generated by `scripts/make-holiday-table.mjs`, read by `domain/holiday-table.js`. With DEC-026: `ne_110m_land.geojson`, downloaded once, and `map-outline.svg`, generated from it by `scripts/make-map.mjs` and read by `scripts/build.mjs`. Generated files are never edited by hand. |
| `dist/` | The built one-file page. Generated by `scripts/build.mjs`; not committed. |
| `tests/unit/` | `node --test` tests, one file per source module. |
| `tests/e2e/` | Workflow tests through `controller.js` with fakes for `api`, `storage` and `clock`. |
| `tests/e2e/ui/` | Playwright tests of the built file. |
| `scripts/` | Adds `build.mjs` and, with DEC-024 and DEC-026, the development scripts `make-holiday-table.mjs` and `make-map.mjs`. The other scripts are unchanged. |
| `.github/workflows/` | With DEC-023: `pages.yml`, the workflow that builds the page and publishes it to GitHub Pages. |
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
| `holidaysFileName` | `zuno-holidays.json` | Name of the exported holidays file. HOL-010. Added to `config.js` in M25. |
| `defaultCityIds` | `tokyo`, `cairo`, `new-delhi`, `madrid`, `bogota`, `riyadh`, `islamabad` | The default places, in order. SET-014 |
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
| GitHub Pages and GitHub Actions | Publishes the built page | DEC-023 | Needs the public repository on the `alkashef` account. Free for public repositories. | Prepared on 2026-11-18; not run yet |
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
and read from the user's own machine and never sent anywhere (DEC-018). At development time only,
and with no user data: one download of the map data (DEC-026) and the installation of the holiday
library (DEC-024). Publishing (DEC-023) sends the built page, which holds no user data, to GitHub.

## 3. Data model

All types are JSDoc `@typedef`s in the module that owns them.

| Type | Fields | Owner and rules |
| --- | --- | --- |
| `Place` | `id` (string, unique), `cityId` (id of a `City`), `countryCode` and `zone` (filled in from the city, not chosen), `label` (display name, empty means the city name), `region` (code, empty means national only), `weekendDays` (list of days, 1 = Monday to 7 = Sunday, or `null` for the country's weekend; an edit that sets exactly the country's days stores `null`, SET-017), `hijriVariant` (`umalqura` or `tabular`), `hijriAdjust` (-1, 0 or 1) | `domain/places.js`. The list order is the display order; the first place is the picker's reference (PCK-006). SET-002, SET-016. |
| `Settings` | `version` (2), `places` (list of `Place`), `workStartMinutes`, `workEndMinutes`, `showCountry` (false by default), `showHijri` (false by default), `theme` (`light`, `dark` or `auto`; `auto` by default), `pickerHours` (whole number from `pickerMinHours` to `pickerMaxHours`) | `domain/settings.js`. Saved as one JSON record. Start must be before end. A record without `pickerHours` gets `pickerDefaultHours`; hours outside the limits make the record invalid. DEC-016. |
| `City` | `id` (slug, never changes), `name`, `countryCode` (ISO 3166-1 alpha-2), `zone` (IANA name), `latitude`, `longitude` | `data/cities.js`. The 55 rows of the spec's section 9, in that order. DEC-015. |
| `UserHolidays` | `version` (1), `added` and `hidden` (lists of `{ countryCode, date, name }`, `date` as `YYYY-MM-DD`) | `domain/user-holidays.js`. Saved as one JSON record and exported in the same shape. No two entries of one list share country, date and name. DEC-017. |
| `Holiday` | `date` (`YYYY-MM-DD`), `name`, `regions` (list of codes, or empty for national) | `domain/holidays.js`, made from the service record (only type `Public` is kept) or from a row of the built-in holiday table (DEC-024). |
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
  `domain/settings.parseSettings(value, limits) -> Settings | null` drops the unlisted places and refuses
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
  owns the badge and card; `views/legend.js` owns the two legend parts. CSS class names are `block-element` in lower case with hyphens (`header-title`), the form
  `stylelint-config-standard` checks; the HTML and CSS rule says the same since 2026-11-18 (user decision).
- Map: one pin per place with the place name, current time and date. Pins stay at their coordinates
  as the map grows and shrinks (the map stretches to fill its space; DEC-026). Each pin is a location icon; each label sits beside,
  above or below its pin, wherever it covers no other label or pin.
- Month grid: previous and next month buttons (32 px, DEC-020) around the month title; the corner label "Day"; a Hijri month band and Hijri day in each cell only
  while Hijri is on (the Hijri day as DEC-027 describes); selecting a holiday cell outlines it and opens a card beside that place's name
  with the holiday's name, date and (if Hijri is on) Hijri date. The card's close button or Escape
  closes it. While Hijri is on, an information button beside the Hijri month band opens a card with the
  note that Hijri dates are calculated and may differ from official announcements (HIJ-004). The header and Hijri band stay in view while the rows scroll vertically.
- Picker panel (a card on the right, with a 20 px gap to the map and the page's padding on its right; no heading, the section is named "Meeting time"): a resize handle centred on its left border
  (dragged, or moved by the left and right arrow keys, one hour slot at a time); the day selector
  (previous day, a date button that opens a month calendar and shows the window's dates, next
  day); the hour axis; one row per place with the marker (the time in bold with the date after it, then the Hijri date while Hijri is on); the picker's legend at the bottom of the card, under a hairline. The marker can be
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
  message when an imported file was refused; with DEC-024 one credit line for the built-in holiday
  table). The footer: the sentence about saved changes and, with DEC-025, the version. Regions are listed by the service's code (for
  example `ES-MD`). The panel gets the default working hours (`defaultHours`) from `main.js`.
- Holiday card in the month grid: a holiday from the service or from the built-in holiday table has a Hide button (HOL-008); one the
  user added has a Remove button (HOL-007).
- Empty page: prompt to add a place, shown only while the settings hold no places (SET-007).

Keyboard and accessibility: every control is a real `<button>`, `<a>`, `<input>` or `<select>`;
every icon-only button has an `aria-label`; popovers close on Escape and return focus to the button
that opened them. The hover time of the picker (PCK-008) needs a pointer; a keyboard user reads the
same times by moving the marker with the arrow keys (accepted by the user on 2026-11-18, spec
section 7).

**Validation and errors.** Invalid input (a working-hours end before the start, no city chosen)
is refused by `domain/settings.js` and the view shows the field as invalid; it is not an error.
Everything else follows DEC-006 and the top-level handler.

## 5. Unresolved risks and design checks

| Issue and references | Owner | Evidence needed | Blocks what? |
| --- | --- | --- | --- |
| Weekend data lags a recent country change. DEC-003 | Accepted risk | EX-002 in four browsers. | None. |
| The built-in holiday table ends with 2028, and its Islamic holidays are calculated. DEC-024 | User | Generate the table again before 2029; correct a wrong day by hiding it and adding the right one. | None. |
| The newer workflows (picker resize and hover, the holidays the user adds and hides, the day selector) run in the browser tests in Chromium only. NFR-002, DEC-011 | Implementation | The same workflows in Firefox, WebKit and Edge. | None; a milestone in the plan. |
| Publishing needs a public repository on the `alkashef` account and this clone's remote pointing to it. DEC-023 | User | The repository exists and a push succeeds. | The Pages milestone. |
| The Hijri day at about 3.1:1 on the holiday colour. DEC-027 | Accepted risk (user, 2026-11-18) | The browser test measures the real ratio. | None. |
