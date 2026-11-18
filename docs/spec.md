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
- A fixed list of cities to choose places from, and a set of default places (SET-013, SET-014).
- Live local time with daylight saving (DST) rules.
- A month grid: one row per place, one column per day, weekends and public holidays coloured.
- A time picker in the style of the Android time-zone converter.
- Hijri (lunar) calendar alongside the Gregorian calendar, switched off by default (SET-011).
- A world map with each place's local time (MAP-001).
- Display names for places, and optional country names (SET-009, SET-010).
- Light and dark themes that follow the operating system (THM-001).
- A refresh button.
- A picker panel whose width the user can change (LAY-002, LAY-003).
- Public holidays that the user adds or hides, with export to and import from a holidays file (HOL-006 to HOL-012).

**Exclusions.**
- Phones and small screens (NFR-002).
- Working hours per place (SET-005 is one global setting).
- Observances that are not days off, such as Valentine's Day.
- Separate day and night colouring in the picker (PCK-003).
- Non-colour cues for colour-blind users (LEG-001, accepted risk).
- Sharing saved settings between browsers or users (SET-004), except through the holidays file (HOL-010, HOL-011).

**Binding constraints.**
- One file, with no separate script or stylesheet files.
- Public-holiday data comes from free public holiday services, fetched at run time (user decision, 2026-11-16;
  more than one service allowed by user decision, 2026-11-18). Each holiday service
  is a flow of data to an external service that the user approves separately. The design must record each as a
  `DEC-NNN`. No other flow of data to an external service is approved.

**Evaluation after use.** Deferred by the user (2026-11-17): the user judges informally. No measure is recorded.

## 2. Roles and glossary

- **User**: a member of a global team who uses the page. The only role. They configure and read the page.
- **Place**: one entry in the settings: a city from the city list, with that city's country or territory and
  its time zone (SET-002). One row per place in both views.
- **City list**: the fixed list of cities in section 9. The user can add only these cities (SET-013).
- **Public holiday**: a national public holiday of a place's country or territory, as returned by a holiday service,
  or a holiday the user added for that country or territory (HOL-006). A holiday the user hid is not one (HOL-008).
- **Holidays file**: a file on the user's machine that holds the holidays a user added and hid (HOL-010, HOL-011).
- **Weekend**: the days of the week that are the non-working weekend of a place. They default to the weekend of
  the place's country or territory, which differs by country; the user can change them for a place (SET-016).
- **Working hours**: one start and one end time of day, in the user's settings, applied to every place's local time.
- **Marker**: the chosen date and time in the time picker.
- **Selected day**: the date chosen in the day selector. The picker window starts at its midnight in the first
  place (PCK-006). The marker's date can be one day later when the marker is on the next day's hours.
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
| SET-002 | When the user adds a city, the system shall set the place's name, country or territory, and time zone to those of that city. | Must | Confirmed | One choice gives a complete place with no extra input. | User decision; changed by user decision (2026-11-18, dialog: pick a city) | SCN-001 | |
| SET-003 | Withdrawn on 2026-11-18. It read: "Where a country has more than one time zone, the system shall let the user choose the time zone of a different city for that place." Choosing the city itself replaces it (SET-002, SET-013). | Must | Withdrawn | A team may work in a non-capital city. | User decision ("default to the capital"); withdrawn by user decision (2026-11-18, dialog) | SCN-001 | |
| SET-004 | When the user changes the settings, the system shall save them in the browser and restore them on the next visit. | Must | Confirmed | The user should not re-enter places each time. | User decision (settings panel saved in browser) | SCN-001, SCN-002 | |
| SET-005 | The system shall provide one working-hours setting, a start time and an end time, that applies to every place, with a default of 9:00 AM to 5:00 PM. | Must | Confirmed | Needed to colour working hours in the picker. | User decision (one global setting) | SCN-001 | |
| SET-006 | Where a country has regional public holidays, the system shall let the user choose an optional region for a place; with no region chosen, the system shall use national holidays only. | Must | Confirmed (default "no region = national only" is an inference) | Regional holidays affect days off in states and provinces. | User decision (2026-11-16, option 2) | SCN-002 | |
| SET-008 | When the user moves a place in the list, the system shall reorder the place's rows in both the month grid and the picker to match. | Must | Confirmed | The first place is the picker's reference (PCK-006), so the user needs to change it. | User decision (2026-11-17) | SCN-001 | |
| SET-007 | While the saved settings hold no places, the system shall show an empty page with a prompt to add a place. | Must | Confirmed | User decision (2026-11-16, option 1). With default places (SET-014), the page is empty only after the user removes every place. | User decision; changed by user decision (2026-11-18) | SCN-001, SCN-002 | |
| CLK-001 | The system shall show the current local time and date for each place. | Must | Confirmed | Core need. | User request | SCN-001 | |
| CLK-002 | The system shall apply the daylight-saving rules of each place's time zone to every local time and date it shows, for any date. | Must | Confirmed | Offsets change by date; wrong offsets break meetings. | User request ("account for DST") | SCN-001 | EX-001 |
| CLK-003 | While the page is open, the system shall update the current local time of each place every minute. | Must | Confirmed | The time must stay correct on a page left open. | User decision (2026-11-16) | SCN-001 | |
| CAL-001 | The system shall show a month grid with one row per place and one column per day of the displayed month. | Must | Confirmed | Lets the user plan vacations across countries. | User decision | SCN-002 | |
| CAL-002 | The system shall mark weekend days in each row according to that place's weekend days (SET-016). | Must | Confirmed | Weekends differ by country, and a team's days off can differ from its country's. | User request; changed by user decision (2026-11-18) | SCN-002 | EX-002 |
| CAL-003 | The system shall mark public holidays in each row with a colour different from the weekend colour. | Must | Confirmed | Core need. | User decision (colours for vacations and weekends) | SCN-002 | EX-004 |
| CAL-007 | If a public holiday falls on a weekend day of the place, then the system shall show that cell split diagonally, with the weekend colour on one half and the holiday colour on the other. | Must | Confirmed | User decision (2026-11-16). | User decision | SCN-002 | EX-007 |
| CAL-004 | The system shall highlight today's column in each row, using that place's local date. | Must | Confirmed | User asked for "today" in the grid. | User statement | SCN-002 | |
| CAL-005 | When the user chooses the previous or next month, the system shall show that month in the grid. | Must | Confirmed | Vacation planning needs other months. | User decision | SCN-002 | |
| CAL-006 | When the user selects a holiday cell, the system shall show the holiday's name and date in a card beside the place's name, and let the user close it. | Should | Confirmed | A colour alone does not say which holiday it is. | Agent inference; changed by user decision (2026-11-17) | SCN-002 | |
| HIJ-001 | Where the Hijri calendar is on, the system shall show the Hijri day in each cell of the month grid, the Hijri month above the grid, and each place's Hijri date beside the marker's date in the picker. | Must | Confirmed (calendar variant open) | User asked for lunar/Hijri as well as the regular calendar. | User request; changed by user decision (2026-11-17) | SCN-002 | EX-010 |
| PCK-001 | The system shall provide a time picker with one row per place and a marker for the chosen date and time. | Must | Confirmed | Converts a time across all places. | User decision | SCN-001 | EX-003 |
| PCK-002 | When the user moves the marker, the system shall update the local date and time shown on top of each row. | Must | Confirmed | Core of the converter. | User decision | SCN-001 | EX-003 |
| PCK-003 | The system shall colour each row of the picker over the picker window (PCK-006), with one colour for the working hours and another for the non-working hours of that place. | Must | Confirmed | User decision (2026-11-16): working and non-working hours, no separate day and night. | User decision | SCN-001 | EX-008 |
| PCK-005 | The system shall colour the part of a picker row that falls on a weekend day or public holiday of that place with a third colour, different from the working-hours and non-working-hours colours. | Must | Confirmed | A day off must be visible when choosing a meeting time. | User decision (2026-11-16); one shared colour for weekend and holiday confirmed 2026-11-17 | SCN-001 | EX-009 |
| PCK-006 | The system shall show the picker window as hour slots of one fixed width, starting at midnight of the selected day in the first place of the list and covering at least that whole day (24 hours, or 23 or 25 on a day when that place's clock changes), with every row covering the same instants. | Must | Confirmed | The marker is then one vertical line across all rows, and date differences between places are visible. A wider picker shows more hours instead of stretching them. | User decision (2026-11-16); first place as reference confirmed 2026-11-17; fixed slots and "24 hours or more" by user decision (2026-11-18, canvas comment and dialog) | SCN-001 | EX-003 |
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
| HOL-003 | The system shall treat as a place's public holidays the national public holidays of its country, the public holidays of its region when one is chosen, and the holidays the user added for its country, without the holidays the user hid. | Must | Confirmed | User decision (2026-11-16, option 2). Observances that are not days off are excluded. The user's own entries complete or correct the service's data. | User decision; changed by user decision (2026-11-18) | SCN-002 | |
| HOL-004 | If regional holiday data is unavailable for a chosen region, then the system shall show the national holidays and tell the user that regional holidays are missing for that place. | Must | Confirmed | Free services cover regions unevenly; the user must not trust an incomplete grid. | User decision (2026-11-17) | SCN-002 | |
| HOL-001 | The system shall get each place's public holidays from a free public holiday service. | Must | Confirmed | User decision (option 1). | User decision | SCN-002 | EX-004 |
| HOL-002 | The system shall send the holiday service only a country code and a year. | Must | Proposed (inference) | Privacy: nothing else about the user leaves the machine. | Agent inference from project rules | SCN-002 | |
| MAP-001 | The system shall show a world map with a pin for each place, labelled with the place's name and its current local time and date. | Must | Confirmed | The user sees every place's time at a glance. | User decision (2026-11-17) | SCN-001 | |
| SET-009 | Where the user enters a display name for a place, the system shall show that name instead of the city name wherever the place is named; with no display name, the system shall show the city name. | Must | Confirmed | Teams name places by person or office, not by city. | User decision (2026-11-17) | SCN-001, SCN-002 | |
| SET-010 | Where the user turns on country names, the system shall show each place's country next to the place's name; with country names off, which is the default, the system shall show the place's name alone. | Must | Confirmed | Country names add clutter; most users do not need them. | User decision (2026-11-17) | SCN-001, SCN-002 | |
| SET-011 | The system shall provide a setting that turns the Hijri calendar on or off, with the Hijri calendar off by default. | Must | Confirmed | Not every team needs the Hijri calendar. | User decision (2026-11-17) | SCN-002 | EX-010 |
| PCK-007 | When the user chooses the previous day, the next day, or a day in a calendar, the system shall make that day the selected day and move the marker to it, keeping the marker's time of day in the first place. | Must | Confirmed | Meetings are planned for days other than today. The picker window follows the selected day, not the marker, so it stays still while the marker moves into the next day's hours. | User decision (2026-11-17); changed by user decision (2026-11-18) | SCN-001 | |
| PCK-009 | While the picker window covers more than one date in the first place, the system shall show the first and the last of those dates in the day selector (for example 20–21-Nov-26). | Must | Confirmed | The user sees which days the hour slots cover. | User request (2026-11-18, canvas comment: "when the slots span more than one day the date displays those days: 20-21") | SCN-001 | |
| LAY-001 | While the places do not all fit in the picker or in the month grid, the system shall make that list scroll vertically and keep the hour axis or the day headers in view. | Must | Confirmed | The page must stay usable with many places. | User decision (2026-11-17) | SCN-001, SCN-002 | |
| THM-001 | The system shall show the light theme or the dark theme that the theme setting (SET-012) chooses, and, while that setting is Auto, the theme that the operating system's colour-scheme setting asks for. | Must | Confirmed | Comfortable reading in any lighting. | User decision (2026-11-17); changed by user request (2026-11-18) | SCN-001, SCN-002 | |
| SET-012 | The system shall provide a theme setting with the choices Light, Dark and Auto, with Auto as the default. | Must | Confirmed | Some users want a different theme from their system's. | User request (2026-11-18, "add the dark/light to the settings, follow the canvas") | SCN-001, SCN-002 | |
| SET-013 | The system shall offer, as the places the user can add, only the cities of the city list (section 9). | Must | Confirmed | The team works in a known set of cities; a short list is quicker to choose from than every country. | User request (2026-11-18, "use these cities only in the app") | SCN-001, SCN-002 | |
| SET-014 | While no settings are saved in the browser, the system shall show the default places Tokyo, Cairo, New Delhi, Madrid, Bogotá, Riyadh and Islamabad, in that order. | Must | Confirmed | A first visit shows a working page for the team's main cities. | User request (2026-11-18, "as a default in the app", "use the capital cities"); Tokyo once by user decision (2026-11-18, dialog) | SCN-001, SCN-002 | |
| SET-015 | If the saved settings hold a place that is not in the city list, then the system shall remove that place when the page opens. | Must | Confirmed | The rule "only these cities" must hold for settings saved before the city list. | User decision (2026-11-18, dialog) | SCN-001, SCN-002 | |
| HOL-005 | Withdrawn on 2026-11-18, the day it was added. It read: "The system shall provide public-holiday data for every country and territory in the city list." Holidays the user adds (HOL-006) replace it. | Must | Withdrawn | Vacation planning must work for every city the team can choose, including the default places. | User decision (2026-11-18, dialog: find a second source); withdrawn by user decision (2026-11-18, dialog: manual replaces it) | SCN-002 | |
| HOL-006 | The system shall let the user add a public holiday, with a date and a name, to a country or territory of the city list. | Must | Confirmed | The holiday service has no data for some countries, and can miss a holiday in others. | User request (2026-11-18, "I want the user to be able to add public holidays if the system can't find them"); per country by user decision (dialog) | SCN-002 | |
| HOL-007 | The system shall let the user remove a public holiday that the user added. | Must | Confirmed | A mistyped holiday must be correctable. | User decision (2026-11-18, dialog) | SCN-002 | |
| HOL-008 | The system shall let the user hide a public holiday that came from the holiday service, and show it again. | Must | Confirmed | The service can list a day that is not a day off for the team. | User decision (2026-11-18, dialog: add and hide) | SCN-002 | |
| HOL-009 | When the user adds, removes, hides or shows a holiday, the system shall save the change in the browser and restore it on the next visit. | Must | Confirmed | The user should not re-enter holidays each time. | User decision (2026-11-18, dialog) | SCN-002 | |
| HOL-010 | When the user chooses to export, the system shall save the user's added and hidden holidays to a file on the user's machine. | Must | Confirmed | One person enters a country's holidays and shares the file with the team. | User decision (2026-11-18, dialog) | SCN-002 | |
| HOL-011 | When the user imports a holidays file, the system shall add its holidays to those already saved. | Must | Confirmed | A teammate loads a shared file without losing their own entries. | User decision (2026-11-18, dialog); merging approved by the user as an assumption | SCN-002 | |
| HOL-012 | If an imported file is not a valid holidays file, then the system shall change nothing and tell the user that the file was refused. | Must | Confirmed | A wrong file must not damage the saved holidays. | Agent inference, approved by the user (2026-11-18) | SCN-002 | |
| LAY-002 | When the user drags the left edge of the picker panel, the system shall change the panel's width to follow the drag by adding or removing hour slots at the end of the picker window, within the limits the design sets. | Must | Confirmed | The user chooses how much room the map and the picker get, and how many hours the picker shows. | User request (2026-11-18, canvas comments; confirmed in dialogs) | SCN-001 | |
| LAY-003 | When the user changes the picker panel's width, the system shall save it in the browser and restore it on the next visit. | Must | Confirmed | The user sets the width once. | User decision (2026-11-18, dialog) | SCN-001 | |
| SET-016 | The system shall let the user choose, for each place, which days of the week are its weekend, with the weekend of the place's country or territory as the default. | Must | Confirmed | The built-in weekend of a country can differ from a team's real days off. | User request (2026-11-18, canvas comment: "add weekend days, in case the user wants to override the defaults") | SCN-001, SCN-002 | |
| PCK-008 | While the pointer is over a picker row's window (PCK-006), the system shall show that place's local time and date at the pointer's position. | Must | Confirmed | The user reads a place's time at any point without moving the marker. | User request (2026-11-18, canvas comment: "when the user hovers over a time slot, the local time is displayed") | SCN-001 | |

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
| The offsets in the city list (section 9) | Assumption, stated to the user on 2026-11-18: they are each city's standard-time offset, for reference. The system keeps applying daylight-saving rules (CLK-002), so Sydney shows UTC+11 in November. | If the user meant fixed offsets, times are an hour off for part of the year in cities with daylight saving. | User | Revisit if a shown time differs from what the user expects. |
| Hong Kong's holidays and weekend | User decision (2026-11-18, dialog): Hong Kong is its own territory for public holidays and weekends, although the user's list named China as its country. | With mainland China's holidays, Hong Kong's days off would be wrong. | User | Resolved 2026-11-18. |
| Holiday data for seven countries | The approved holiday service (DEC-005) lists no data for India, Israel, Malaysia, Pakistan, Saudi Arabia, Taiwan and the United Arab Emirates (its list of countries, read 2026-11-18): 12 of the 55 cities, 3 of the 7 default places. The user first decided to find a second source (HOL-005) and then, the same day, that holidays added by the user replace it (HOL-006); HOL-005 is withdrawn and nothing waits for a second source. | Those countries show no holidays until a user adds them or imports a holidays file. | User | Resolved 2026-11-18. A second holiday service may be added later as an improvement; it would need the user's approval as a new outside data flow. |
| A holiday the user adds (HOL-006) | Assumption, approved by the user on 2026-11-18: it is a single date and does not repeat every year. | Fixed-date holidays must be entered again for each year. | User | Revisit if yearly re-entry proves a burden. |
| Importing a holidays file (HOL-011) | Assumption, approved by the user on 2026-11-18: an import adds to the saved holidays and never replaces them. Export and import use local files only, so NFR-001 still holds. | A user who wants to start over must remove entries one by one. | User | Revisit if users ask for "replace all". |
| Acceptance examples for the 2026-11-18 requirements | None written yet for SET-013 to SET-016, HOL-006 to HOL-012, LAY-002, LAY-003 and PCK-008. | Tests would rest on unreviewed expectations. | User | Propose examples and have the user review them before `/write-plan`. |
| Limits of the picker panel's width (LAY-002) | The lower limit is the whole day (PCK-006), so the panel cannot be narrower than its 24 hour slots; the upper limit is left to the design. | A panel too wide hides the map; on a small screen the map gets only what the 24 slots leave. | Design | Set and justify the limits in `/write-design`. |

## 8. Review and approval

Approved by the user on 2026-11-17, in chat, for the contents of this spec as of that date.

Changes approved by the user on 2026-11-17, in chat, after the UI design: new requirements MAP-001,
SET-009, SET-010, SET-011, PCK-007, LAY-001 and THM-001; changed requirements HIJ-001, HIJ-002,
HIJ-003 and CAL-006; EX-010 now says the Hijri calendar is on. The user also decided on 2026-11-17,
in a dialog, that HIJ-004 becomes an information button beside the Hijri month band and that
DSP-003 allows the two-digit day in a month-grid cell.

Changes requested by the user on 2026-11-18, in chat: new requirement SET-012 and changed
requirement THM-001 (a Light, Dark or Auto theme setting in the settings panel).

The design settled the two items once deferred to it: the source of each country's weekend days
(DEC-003) and the holiday service (DEC-005, approved separately by the user).

Changes approved by the user on 2026-11-18, in chat, after a dialog of decisions: new requirements
SET-013, SET-014, SET-015, HOL-005, LAY-002 and LAY-003; changed requirements SET-002 and SET-007;
SET-003 withdrawn; the city list (section 9); the reworded holiday-service constraint (section 1)
and glossary (section 2); and the new items in section 7. Approved later the same day, in chat: new
requirements SET-016 and PCK-008, changed requirement CAL-002, and the reworded Weekend entry in
the glossary. Approved after that, in chat, following a second dialog: new requirements HOL-006 to
HOL-012, changed requirement HOL-003, HOL-005 withdrawn, and the three assumptions recorded in
section 7 (single date, import merges, local files only). Approved last, in chat: changed
requirements PCK-006 and LAY-002 (hour slots of a fixed width, at least the whole day, resizing
adds or removes slots) and the matching wording of PCK-003 and PCK-008; then the selected day
(changed PCK-006 and PCK-007, new PCK-009, new glossary entry). The design does not yet reflect
these changes: the next step is `/write-design`.

## 9. City list

The cities the user can add (SET-013), as given by the user on 2026-11-18. The offset is each city's
standard-time offset from UTC, for reference only (section 7). Hong Kong is its own territory
(section 7).

| City | Country or territory | Standard-time offset |
| --- | --- | --- |
| Buenos Aires | Argentina | -03:00 |
| Adelaide | Australia | +09:30 |
| Canberra | Australia | +10:00 |
| Melbourne | Australia | +10:00 |
| Perth | Australia | +08:00 |
| Sydney | Australia | +10:00 |
| Vienna | Austria | +01:00 |
| Brussels | Belgium | +01:00 |
| Brasília | Brazil | -03:00 |
| São Paulo | Brazil | -03:00 |
| Beijing | China | +08:00 |
| Hong Kong | Hong Kong | +08:00 |
| Bogotá | Colombia | -05:00 |
| Prague | Czechia | +01:00 |
| Copenhagen | Denmark | +01:00 |
| Quito | Ecuador | -05:00 |
| Cairo | Egypt | +02:00 |
| Helsinki | Finland | +02:00 |
| Paris | France | +01:00 |
| Berlin | Germany | +01:00 |
| Munich | Germany | +01:00 |
| Hyderabad | India | +05:30 |
| Mumbai | India | +05:30 |
| New Delhi | India | +05:30 |
| Pune | India | +05:30 |
| Jakarta | Indonesia | +07:00 |
| Dublin | Ireland | +00:00 |
| Jerusalem | Israel | +02:00 |
| Tel Aviv | Israel | +02:00 |
| Milan | Italy | +01:00 |
| Rome | Italy | +01:00 |
| Tokyo | Japan | +09:00 |
| Kuala Lumpur | Malaysia | +08:00 |
| Mexico City | Mexico | -06:00 |
| Amsterdam | Netherlands | +01:00 |
| Islamabad | Pakistan | +05:00 |
| Lahore | Pakistan | +05:00 |
| Warsaw | Poland | +01:00 |
| Riyadh | Saudi Arabia | +03:00 |
| Singapore | Singapore | +08:00 |
| Seoul | South Korea | +09:00 |
| Madrid | Spain | +01:00 |
| Stockholm | Sweden | +01:00 |
| Bern | Switzerland | +01:00 |
| Taipei | Taiwan | +08:00 |
| Dubai | United Arab Emirates | +04:00 |
| London | United Kingdom | +00:00 |
| Chicago | United States | -06:00 |
| Los Angeles | United States | -08:00 |
| Minneapolis | United States | -06:00 |
| New York | United States | -05:00 |
| Phoenix | United States | -07:00 |
| San Diego | United States | -08:00 |
| Tallahassee | United States | -05:00 |
| Washington, D.C. | United States | -05:00 |
