# Spec — Zuno

Status: Approved

What to build. Written with `/write-spec`. Change only with the user's approval. Each requirement is
in EARS syntax and has an ID that tests cite.

## 1. Purpose and scope

**Problem.** People on a global team need to (a) find a meeting time that works across countries and
(b) choose vacation dates that avoid weekends and public holidays. Today this means looking up each
country's time, weekend days, and holidays separately.

**Desired improvement.** One page that shows, for a configured set of places, the local time, the
weekends, the public holidays, and the Hijri date next to the Gregorian date, and that converts a
chosen time across all places.

**In scope.**
- A single self-contained HTML file (HTML, CSS and JavaScript in one file).
- Settings for the set of places and the working hours.
- Live local time with daylight saving (DST) rules.
- A month grid: one row per place, one column per day, weekends and public holidays coloured.
- A time picker in the style of the Android time-zone converter.
- Hijri (lunar) calendar alongside the Gregorian calendar, switched off by default (SET-011).
- A world map with each place's local time (MAP-001).
- Display names for places, and optional country names (SET-009, SET-010).
- Light and dark themes that follow the operating system (THM-001).
- A refresh button.

**Exclusions.**
- Phones and small screens (NFR-002).
- Working hours per place (SET-005 is one global setting).
- Observances that are not days off, such as Valentine's Day.
- Separate day and night colouring in the picker (PCK-003).
- Non-colour cues for colour-blind users (LEG-001, accepted risk).
- Sharing saved settings between browsers or users (SET-004).

**Binding constraints.**
- One file, with no separate script or stylesheet files.
- Public-holiday data comes from a free public holiday service, fetched at run time (user decision, 2026-11-16).
  This is the one approved flow of data to an external service. The design must record it as a `DEC-NNN`.

**Evaluation after use.** Deferred by the user (2026-11-17): the user judges informally. No measure is recorded.

## 2. Roles and glossary

- **User**: a member of a global team who uses the page. The only role. They configure and read the page.
- **Place**: one entry in the settings: a country and one time zone. It defaults to the country's capital.
  The user may choose another city's zone (SET-003). One row per place in both views.
- **Public holiday**: a national public holiday of a place's country, as returned by the holiday service.
- **Weekend**: the days of the week that are the non-working weekend in a place's country. They differ by country.
- **Working hours**: one start and one end time of day, in the user's settings, applied to every place's local time.
- **Marker**: the chosen date and time in the time picker.
- **Hijri date**: the date in the Islamic lunar calendar.

## 3. User scenarios

- **SCN-001 — Set a meeting.** Actor: a team member. Goal: pick a time that is inside working hours for as many
  countries as possible. Trigger: a meeting needs scheduling. Main path: the user opens the page, sees each place's
  current local time, moves the marker in the picker, and reads each place's local date and time and its day,
  night and working-hours colouring. Alternate: a place is on a different date than the user's. Observable result:
  the user knows each attendee's local date and time for the chosen moment.
  Source: user statement (2026-11-16). Status: proposed scenario, partly confirmed.
- **SCN-002 — Schedule a vacation.** Actor: a team member. Goal: pick dates that avoid weekends and public holidays
  in the relevant countries. Trigger: vacation planning. Main path: the user opens the month grid, pages to the
  month, and reads which days are weekends or holidays in each place. Alternate: the holiday service is unavailable.
  Observable result: the user knows which days are working days in each place.
  Source: user statement (2026-11-16). Status: proposed scenario, partly confirmed.

## 4. Functional requirements

| ID | EARS requirement | Priority | Status | Business reason | Source | Scenarios | Examples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PKG-001 | The system shall be delivered as one HTML file that contains all of its HTML, CSS and JavaScript. | Must | Confirmed | Easy to share and open without setup. | User request | SCN-001, SCN-002 | |
| SET-001 | The system shall provide a settings panel in which the user adds and removes places. | Must | Confirmed | The set of places differs by team. | User decision | SCN-001, SCN-002 | |
| SET-002 | When the user adds a country, the system shall set the place's time zone to that of the country's capital. | Must | Confirmed | Sensible default with no extra input. | User decision | SCN-001 | |
| SET-003 | Where a country has more than one time zone, the system shall let the user choose the time zone of a different city for that place. | Must | Confirmed | A team may work in a non-capital city. | User decision ("default to the capital") | SCN-001 | |
| SET-004 | When the user changes the settings, the system shall save them in the browser and restore them on the next visit. | Must | Confirmed | The user should not re-enter places each time. | User decision (settings panel saved in browser) | SCN-001, SCN-002 | |
| SET-005 | The system shall provide one working-hours setting, a start time and an end time, that applies to every place, with a default of 9:00 AM to 5:00 PM. | Must | Confirmed | Needed to colour working hours in the picker. | User decision (one global setting) | SCN-001 | |
| SET-006 | Where a country has regional public holidays, the system shall let the user choose an optional region for a place; with no region chosen, the system shall use national holidays only. | Must | Confirmed (default "no region = national only" is an inference) | Regional holidays affect days off in states and provinces. | User decision (2026-11-16, option 2) | SCN-002 | |
| SET-008 | When the user moves a place in the list, the system shall reorder the place's rows in both the month grid and the picker to match. | Must | Confirmed | The first place is the picker's reference (PCK-006), so the user needs to change it. | User decision (2026-11-17) | SCN-001 | |
| SET-007 | While no places are saved, the system shall show an empty page with a prompt to add a place. | Must | Confirmed | User decision (2026-11-16, option 1). | User decision | SCN-001, SCN-002 | |
| CLK-001 | The system shall show the current local time and date for each place. | Must | Confirmed | Core need. | User request | SCN-001 | |
| CLK-002 | The system shall apply the daylight-saving rules of each place's time zone to every local time and date it shows, for any date. | Must | Confirmed | Offsets change by date; wrong offsets break meetings. | User request ("account for DST") | SCN-001 | EX-001 |
| CLK-003 | While the page is open, the system shall update the current local time of each place every minute. | Must | Confirmed | The time must stay correct on a page left open. | User decision (2026-11-16) | SCN-001 | |
| CAL-001 | The system shall show a month grid with one row per place and one column per day of the displayed month. | Must | Confirmed | Lets the user plan vacations across countries. | User decision | SCN-002 | |
| CAL-002 | The system shall mark weekend days in each row according to that place's country. | Must | Confirmed | Weekends differ by country. | User request | SCN-002 | EX-002 |
| CAL-003 | The system shall mark public holidays in each row with a colour different from the weekend colour. | Must | Confirmed | Core need. | User decision (colours for vacations and weekends) | SCN-002 | EX-004 |
| CAL-007 | If a public holiday falls on a weekend day of the place, then the system shall show that cell split diagonally, with the weekend colour on one half and the holiday colour on the other. | Must | Confirmed | User decision (2026-11-16). | User decision | SCN-002 | EX-007 |
| CAL-004 | The system shall highlight today's column in each row, using that place's local date. | Must | Confirmed | User asked for "today" in the grid. | User statement | SCN-002 | |
| CAL-005 | When the user chooses the previous or next month, the system shall show that month in the grid. | Must | Confirmed | Vacation planning needs other months. | User decision | SCN-002 | |
| CAL-006 | When the user selects a holiday cell, the system shall show the holiday's name and date in a card beside the place's name, and let the user close it. | Should | Confirmed | A colour alone does not say which holiday it is. | Agent inference; changed by user decision (2026-11-17) | SCN-002 | |
| HIJ-001 | Where the Hijri calendar is on, the system shall show the Hijri day in each cell of the month grid, the Hijri month above the grid, and each place's Hijri date beside the marker's date in the picker. | Must | Confirmed (calendar variant open) | User asked for lunar/Hijri as well as the regular calendar. | User request; changed by user decision (2026-11-17) | SCN-002 | EX-010 |
| PCK-001 | The system shall provide a time picker with one row per place and a marker for the chosen date and time. | Must | Confirmed | Converts a time across all places. | User decision | SCN-001 | EX-003 |
| PCK-002 | When the user moves the marker, the system shall update the local date and time shown on top of each row. | Must | Confirmed | Core of the converter. | User decision | SCN-001 | EX-003 |
| PCK-003 | The system shall colour each row of the picker over a 24-hour window, with one colour for the working hours and another for the non-working hours of that place. | Must | Confirmed | User decision (2026-11-16): working and non-working hours, no separate day and night. | User decision | SCN-001 | EX-008 |
| PCK-005 | The system shall colour the part of a picker row that falls on a weekend day or public holiday of that place with a third colour, different from the working-hours and non-working-hours colours. | Must | Confirmed | A day off must be visible when choosing a meeting time. | User decision (2026-11-16); one shared colour for weekend and holiday confirmed 2026-11-17 | SCN-001 | EX-009 |
| PCK-006 | The system shall show the picker window as the 24 hours from midnight to midnight of the marker's date in the first place of the list (23 or 25 hours on a day when that place's clock changes), with every row covering the same instants. | Must | Confirmed | The marker is then one vertical line across all rows, and date differences between places are visible. | User decision (2026-11-16); first place as reference confirmed 2026-11-17 | SCN-001 | EX-003 |
| PCK-004 | When the page opens, the system shall place the marker at the current date and time. | Should | Proposed (inference) | Natural starting point. | Agent inference | SCN-001 | |
| HIJ-002 | Where the Hijri calendar is on, the system shall let the user choose, for each place, the Hijri calendar variant: Umm al-Qura or tabular, with Umm al-Qura as the default. | Must | Confirmed | Teams in different countries follow different Hijri calendars. | User decision (2026-11-16) | SCN-002 | |
| HIJ-003 | Where the Hijri calendar is on, the system shall let the user adjust, for each place, the Hijri date by a whole number of days, from -1 to +1. | Must | Confirmed | Official moon-sighting dates can differ from the calculated date. | User decision (2026-11-16); range confirmed 2026-11-17 | SCN-002 | |
| HIJ-004 | Where the Hijri calendar is on, the system shall provide an information button beside the Hijri month band that shows a note that Hijri dates are calculated and may differ from official announcements. | Should | Confirmed | Avoids false confidence around Ramadan and Eid. | Agent inference; changed by user decision (2026-11-17) | SCN-002 | |
| LEG-001 | The system shall show a legend that names each colour used for weekends, public holidays, working hours, non-working hours and days off. | Must | Confirmed | User decision (2026-11-16, option 2): colour plus legend, no other non-colour cue. | User decision | SCN-001, SCN-002 | |
| DSP-001 | The system shall show every Gregorian date in the format dd-mmm-yy (for example 16-Nov-26). | Must | Confirmed | User decision (2026-11-16). | User statement | SCN-001, SCN-002 | EX-005 |
| DSP-002 | The system shall show every time of day in 12-hour format with an uppercase AM or PM suffix, a space before the suffix, and no leading zero (for example 9:25 AM). | Must | Confirmed | User decision (2026-11-16); corrected from "9:25am" to "9:25 AM". | User statement | SCN-001 | EX-006 |
| DSP-003 | The system shall show every Hijri date as the two-digit day, the full month name and the four-digit year, separated by hyphens (for example 06-Jumada II-1448), except in a month-grid cell, which shows the two-digit day, with the month name and year in the band above the grid. | Must | Confirmed | User decision (2026-11-17). | User statement; changed by user decision (2026-11-17, dialog) | SCN-002 | EX-010 |
| REF-001 | When the user presses the refresh button, the system shall recompute all local times and fetch the public-holiday data again. | Must | Confirmed | User request ("gets updated (refresh button)"). | User request | SCN-001, SCN-002 | |
| REF-002 | If the holiday service cannot be reached, then the system shall keep showing times and any holidays already loaded, and tell the user which countries have no holiday data. | Must | Proposed (inference) | The page should still be useful offline. | Agent inference | SCN-002 | |
| HOL-003 | The system shall treat as a place's public holidays the national public holidays of its country and, when a region is chosen, the public holidays of that region. | Must | Confirmed | User decision (2026-11-16, option 2). Observances that are not days off are excluded. | User decision | SCN-002 | |
| HOL-004 | If regional holiday data is unavailable for a chosen region, then the system shall show the national holidays and tell the user that regional holidays are missing for that place. | Must | Confirmed | Free services cover regions unevenly; the user must not trust an incomplete grid. | User decision (2026-11-17) | SCN-002 | |
| HOL-001 | The system shall get each place's public holidays from a free public holiday service. | Must | Confirmed | User decision (option 1). | User decision | SCN-002 | EX-004 |
| HOL-002 | The system shall send the holiday service only a country code and a year. | Must | Proposed (inference) | Privacy: nothing else about the user leaves the machine. | Agent inference from project rules | SCN-002 | |
| MAP-001 | The system shall show a world map with a pin for each place, labelled with the place's name and its current local time and date. | Must | Confirmed | The user sees every place's time at a glance. | User decision (2026-11-17) | SCN-001 | |
| SET-009 | Where the user enters a display name for a place, the system shall show that name instead of the city name wherever the place is named; with no display name, the system shall show the city name. | Must | Confirmed | Teams name places by person or office, not by city. | User decision (2026-11-17) | SCN-001, SCN-002 | |
| SET-010 | Where the user turns on country names, the system shall show each place's country next to the place's name; with country names off, which is the default, the system shall show the place's name alone. | Must | Confirmed | Country names add clutter; most users do not need them. | User decision (2026-11-17) | SCN-001, SCN-002 | |
| SET-011 | The system shall provide a setting that turns the Hijri calendar on or off, with the Hijri calendar off by default. | Must | Confirmed | Not every team needs the Hijri calendar. | User decision (2026-11-17) | SCN-002 | EX-010 |
| PCK-007 | When the user chooses the previous day, the next day, or a day in a calendar, the system shall move the marker to that date and keep the marker's time of day in the first place. | Must | Confirmed | Meetings are planned for days other than today. | User decision (2026-11-17) | SCN-001 | |
| LAY-001 | While the places do not all fit in the picker or in the month grid, the system shall make that list scroll vertically and keep the hour axis or the day headers in view. | Must | Confirmed | The page must stay usable with many places. | User decision (2026-11-17) | SCN-001, SCN-002 | |
| THM-001 | The system shall show a light theme or a dark theme according to the operating system's colour-scheme setting. | Must | Confirmed | Comfortable reading in any lighting. | User decision (2026-11-17) | SCN-001, SCN-002 | |

## 5. Non-functional requirements

| ID | EARS requirement | Priority | Status | Business reason | Source | Acceptance evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-001 | The system shall make no network requests other than the holiday-service requests of HOL-001. | Must | Proposed (inference) | No telemetry; no outside fonts or scripts, so the page is self-contained. | Agent inference from project rules | Automated check of the requests the page makes. |

| NFR-002 | The system shall work in the latest release of desktop Chrome, Edge, Firefox and Safari. | Must | Confirmed | User decision (2026-11-16). Phones are not a target. | User decision | Automated test in a headless browser; the browsers tested are chosen in `/write-design`. |

| NFR-003 | The system shall show all labels, month names, weekday names and holiday names in English. | Must | Confirmed | User decision (2026-11-17). | User decision | Automated check of the page's visible text. |

No load-time limit is set. A page of this size has no stated performance need; add one if that changes.

## 6. Acceptance examples

| ID | Requirement IDs | Situation and input | Expected result | Reviewed by |
| --- | --- | --- | --- | --- |
| EX-001 | CLK-002 | London place. Instants 2026-07-01 12:00 UTC and 2026-12-01 12:00 UTC. | 13:00 on 2026-07-01 (summer time) and 12:00 on 2026-12-01 (winter time). | User (2026-11-17) |
| EX-002 | CAL-002 | Saudi Arabia place, November 2026. | Friday 2026-11-20 and Saturday 2026-11-21 are marked weekend. Sunday 2026-11-22 is not. | User (2026-11-17) |
| EX-003 | PCK-001, PCK-002 | Marker at 2026-11-16 15:00 in London. Places: London, New York, Tokyo. | London 15:00 on 11-16. New York 10:00 on 11-16. Tokyo 00:00 on 11-17. | User (2026-11-17) |
| EX-005 | DSP-001 | Gregorian date 2026-11-16. | Shown as 16-Nov-26. | User (2026-11-17) |
| EX-006 | DSP-002 | Time 09:25 and time 15:00 (24-hour). | Shown as 9:25 AM and 3:00 PM. | User (2026-11-17) |
| EX-007 | CAL-007 | A place whose weekend is Saturday and Sunday, and a public holiday on a Saturday. | The Saturday cell shows both the weekend colour and the holiday colour, split diagonally. | User (2026-11-17) |
| EX-008 | PCK-003, SET-005 | Default working hours (9:00 AM to 5:00 PM). Place with a Monday marker at 2:00 PM local. | The marker sits in the working-hours colour. At 7:00 PM local on the same row it sits in the non-working colour. | User (2026-11-17) |
| EX-009 | PCK-005 | Saudi Arabia place, marker at 2:00 PM local on Friday 2026-11-20. | The row at the marker shows the third (day-off) colour, not the working-hours colour. | User (2026-11-17) |
| EX-010 | HIJ-001, HIJ-002, HIJ-003, SET-011 | Hijri calendar on. Gregorian date 2026-11-16, Umm al-Qura variant, adjustment 0, then +1. Calculated with the browser's built-in calendar on 2026-11-16. | With adjustment 0: 06-Jumada II-1448. With +1: 07-Jumada II-1448. | User (2026-11-17) |
| EX-004 | CAL-003, HOL-001 | United States place, December 2026. | 2026-12-25 is marked as a public holiday (Christmas Day). | User (2026-11-17) |

## 7. Assumptions and open questions

| Item | Evidence or assumption | Consequence if wrong | Owner | Resolution or revisit condition |
| --- | --- | --- | --- | --- |
Resolved on 2026-11-17: day-off colour in the picker (PCK-005), reference place and reordering
(PCK-006, SET-008), Hijri adjustment range (HIJ-003), language (NFR-003), post-use evaluation
(deferred, section 1), review of the examples (section 6), and the fallback when regional data is
missing (HOL-004).

| Item | Evidence or assumption | Consequence if wrong | Owner | Resolution or revisit condition |
| --- | --- | --- | --- | --- |
| How the page knows each country's weekend days | Decided in the design: the browser's own data (DEC-003). | A recent weekend change may lag in a browser. | Design | Accepted risk. Test EX-002 in the four browsers. |
| Which free holiday service, and its regional coverage | Decided in the design: Nager.Date, approved by the user 2026-11-17 (DEC-005). Whether it works from a page opened as a file is unverified. | Coverage and reliability vary; some regions may show national holidays only (HOL-004). | Design | Resolved on 2026-11-17: a live request for one country and year returned HTTP 200 with `access-control-allow-origin: *` and the documented fields; the result is in design section 5. |
| Accepted risk: no non-colour cue for colour-blind users | User chose colour plus a legend (LEG-001, 2026-11-16). | Some users cannot tell some states apart. | User | Revisit if a colour-blind user needs the page. |
| Example where the Umm al-Qura and tabular variants differ | EX-010 gives the same date in both variants. | Tests might not catch a wrong variant. | Design | Add a differing-variant example in the milestone tests. |

## 8. Review and approval

Approved by the user on 2026-11-17, in chat, for the contents of this spec as of that date.

Changes approved by the user on 2026-11-17, in chat, after the UI design: new requirements MAP-001,
SET-009, SET-010, SET-011, PCK-007, LAY-001 and THM-001; changed requirements HIJ-001, HIJ-002,
HIJ-003 and CAL-006; EX-010 now says the Hijri calendar is on. The user also decided on 2026-11-17,
in a dialog, that HIJ-004 becomes an information button beside the Hijri month band and that
DSP-003 allows the two-digit day in a month-grid cell.

The design settled the two items once deferred to it: the source of each country's weekend days
(DEC-003) and the holiday service (DEC-005, approved separately by the user).
