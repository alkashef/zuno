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
- A fixed list of cities to choose places from, custom places (a person, or a city that is not in the list),
  and a set of default places (SET-013, SET-014, SET-018).
- Live local time with daylight saving (DST) rules.
- A month grid: one row per place, one column per day, weekends and public holidays coloured.
- A time picker in the style of the Android time-zone converter.
- Hijri (lunar) calendar alongside the Gregorian calendar, switched off by default (SET-011).
- A world map with each place's local time (MAP-001).
- Display names for places, and optional country names (SET-009, SET-010).
- Light and dark themes that follow the operating system (THM-001).
- A refresh button.
- A picker panel whose width the user can change (LAY-002, LAY-003).
- A border between the map and the month grid that the user can move (LAY-004, LAY-005).
- A settings view that covers the whole page (SET-019).
- Public holidays that the user adds or hides (HOL-006 to HOL-009), and personal vacations of a place, both added
  from a right-click menu on a day of the month grid (HOL-015, VAC-001 to VAC-006).
- Export to and import from a CSV file of the holidays and vacations, with its format described to the user and a
  confirmation before an import adds anything (HOL-010 to HOL-012, HOL-016 to HOL-018).
- A list of the imported files, each of which the user can delete to undo what only it added (HOL-020 to HOL-023).
- A built-in table of public holidays for the seven countries that the holiday service does not cover (HOL-013).
- A version, shown in the settings panel (VER-001).

**Exclusions.**
- Phones and small screens (NFR-002).
- Working hours per place (SET-005 is one global setting).
- Observances that are not days off, such as Valentine's Day.
- Separate day and night colouring in the picker (PCK-003).
- Non-colour cues for colour-blind users (LEG-001, accepted risk).
- Sharing saved settings between browsers or users (SET-004), except through the holidays file, which also carries vacations (HOL-010, HOL-011).

**Binding constraints.**
- One file, with no separate script or stylesheet files.
- Public-holiday data comes from free public holiday services, fetched at run time (user decision, 2026-11-16;
  more than one service allowed by user decision, 2026-11-18). Each holiday service
  is a flow of data to an external service that the user approves separately. The design must record each as a
  `DEC-NNN`. No other flow of data to an external service is approved.
- For the countries that the holiday services do not cover, public-holiday data comes from a table built into
  the page at development time (user decision, 2026-11-18). It adds no request at run time.

**Evaluation after use.** Deferred by the user (2026-11-17): the user judges informally. No measure is recorded.

## 2. Roles and glossary

- **User**: a member of a global team who uses the page. The only role. They configure and read the page.
- **Place**: one entry in the settings, shown as one row in both views: a person or a city, with a name, a country
  or territory and a time zone. A place from the city list takes its country and time zone from the city
  (SET-002); a custom place takes the ones the user enters (SET-018).
- **City list**: the fixed list of cities in section 9. It is a shortcut for adding a place (SET-013).
- **Custom place**: a place that the user adds by entering its name, time zone and country or territory, instead of
  choosing a city from the city list (SET-018). Its name can be a person's.
- **Vacation**: a span of days, with a start date, an end date and an optional label, that belongs to one place
  (VAC-002). It is not a public holiday.
- **Day menu**: the menu that a right-click on a day in a place's row of the month grid shows (VAC-001).
- **Imported file**: a CSV file that the user imported. The page lists it and remembers which holidays and
  vacations came from it (HOL-020).
- **Public holiday**: a national public holiday of a place's country or territory, as returned by a holiday service
  or listed in the built-in holiday table (HOL-013), or a holiday the user added for that country or territory (HOL-006). A holiday the user hid is not one (HOL-008).
- **Built-in holiday table**: the public holidays, stored in the page, of the countries that the holiday
  service does not cover (HOL-013).
- **Holidays file**: a CSV file on the user's machine that holds the holidays a user added and hid, and the
  vacations of the user's places (HOL-010, HOL-011). Its format is described to the user (HOL-016).
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
  current local time, moves the marker in the picker, and reads each place's local date and time and its
  working-hours, non-working-hours and day-off colouring. Alternate: a place is on a different date than the user's. Observable result:
  the user knows each attendee's local date and time for the chosen moment.
  Source: user statement (2026-11-16). Status: confirmed by the user (2026-11-18, dialog).
- **SCN-002 — Schedule a vacation.** Actor: a team member. Goal: pick dates that avoid weekends and public holidays
  in the relevant countries. Trigger: vacation planning. Main path: the user opens the month grid, pages to the
  month, and reads which days are weekends or holidays in each place. Alternate: the holiday service is unavailable.
  Alternate: neither the holiday service nor the built-in holiday table has a country's holidays for the year, so
  the user adds them or imports a holidays file.
  Alternate: the user marks a personal vacation in a place's row and reads which of its days are working days.
  Observable result: the user knows which days are working days in each place.
  Source: user statement (2026-11-16). Status: confirmed by the user (2026-11-18, dialog).

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
| CAL-006 | While the pointer is over a public-holiday cell or a vacation cell, or the cell has keyboard focus, the system shall show a card beside the place's name with the holiday's name and date, or the vacation's label and its start and end dates. | Should | Confirmed | A colour alone does not say which holiday or vacation it is, and a hover is quicker than a click. | Agent inference; changed by user decision (2026-11-17); changed by user request (2026-11-23, "appears on hover ... rather than by clicking") | SCN-002 | |
| HIJ-001 | Where the Hijri calendar is on, the system shall show the Hijri day in each cell of the month grid, the Hijri month above the grid, and each place's Hijri date beside the marker's date in the picker. | Must | Confirmed (calendar variant open) | User asked for lunar/Hijri as well as the regular calendar. | User request; changed by user decision (2026-11-17) | SCN-002 | EX-010 |
| PCK-001 | The system shall provide a time picker with one row per place and a marker for the chosen date and time. | Must | Confirmed | Converts a time across all places. | User decision | SCN-001 | EX-003 |
| PCK-002 | When the user moves the marker, the system shall update the local date and time shown beside the marker, over the hour slots of each row. | Must | Confirmed | Core of the converter. The label over the slots leaves the left of the row to the place's name (PCK-010). | User decision; changed by user request (2026-11-23, "move it downwards over the time slots") | SCN-001 | EX-003, EX-033 |
| PCK-003 | The system shall colour each row of the picker over the picker window (PCK-006), with one colour for the working hours and another for the non-working hours of that place. | Must | Confirmed | User decision (2026-11-16): working and non-working hours, no separate day and night. | User decision | SCN-001 | EX-008 |
| PCK-005 | The system shall colour the part of a picker row that falls on a weekend day, public holiday or vacation day of that place with a third colour, different from the working-hours and non-working-hours colours. | Must | Confirmed | A day off must be visible when choosing a meeting time. | User decision (2026-11-16); one shared colour for weekend and holiday confirmed 2026-11-17; vacation days added by user decision (2026-11-23, dialog) | SCN-001 | EX-009, EX-029 |
| PCK-006 | The system shall show the picker window as hour slots of one fixed width, starting at midnight of the selected day in the first place of the list and covering at least that whole day (24 hours, or 23 or 25 on a day when that place's clock changes), with every row covering the same instants. | Must | Confirmed | The marker is then one vertical line across all rows, and date differences between places are visible. A wider picker shows more hours instead of stretching them. | User decision (2026-11-16); first place as reference confirmed 2026-11-17; fixed slots and "24 hours or more" by user decision (2026-11-18, canvas comment and dialog) | SCN-001 | EX-003 |
| PCK-004 | When the page opens, the system shall place the marker at the current date and time. | Should | Confirmed | Natural starting point. | Agent inference; confirmed by the user (2026-11-18, dialog) | SCN-001 | |
| HIJ-002 | Where the Hijri calendar is on, the system shall let the user choose, for each place, the Hijri calendar variant: Umm al-Qura or tabular, with Umm al-Qura as the default. | Must | Confirmed | Teams in different countries follow different Hijri calendars. | User decision (2026-11-16); an Egyptian variant was added and withdrawn on 2026-11-23 (HIJ-005) | SCN-002 | |
| HIJ-003 | Where the Hijri calendar is on, the system shall let the user adjust, for each place, the Hijri date by a whole number of days, from -1 to +1. | Must | Confirmed | Official moon-sighting dates can differ from the calculated date. | User decision (2026-11-16); range confirmed 2026-11-17 | SCN-002 | |
| HIJ-004 | Where the Hijri calendar is on, the system shall provide an information button beside the Hijri month band that shows a note that Hijri dates are calculated and may differ from official announcements. | Should | Confirmed | Avoids false confidence around Ramadan and Eid. | Agent inference; changed by user decision (2026-11-17) | SCN-002 | |
| LEG-001 | The system shall show a legend that names each colour used for weekends, public holidays, vacations, working hours, non-working hours and days off. | Must | Confirmed | User decision (2026-11-16, option 2): colour plus legend, no other non-colour cue. | User decision; vacations added by user decision (2026-11-23, dialog) | SCN-001, SCN-002 | |
| DSP-001 | The system shall show every Gregorian date in the format dd-mmm-yy (for example 16-Nov-26), except in the version (VER-001). | Must | Confirmed | User decision (2026-11-16). | User statement; exception by user decision (2026-11-18, dialog) | SCN-001, SCN-002 | EX-005 |
| DSP-002 | The system shall show every time of day in 12-hour format with an uppercase AM or PM suffix, a space before the suffix, and no leading zero (for example 9:25 AM). | Must | Confirmed | User decision (2026-11-16); corrected from "9:25am" to "9:25 AM". | User statement | SCN-001 | EX-006 |
| DSP-003 | The system shall show every Hijri date as the two-digit day, the full month name and the four-digit year, separated by hyphens (for example 06-Jumada II-1448), except in a month-grid cell, which shows the two-digit day, with the month name and year in the band above the grid. | Must | Confirmed | User decision (2026-11-17). | User statement; changed by user decision (2026-11-17, dialog) | SCN-002 | EX-010 |
| REF-001 | When the user presses the refresh button, the system shall recompute all local times and fetch the public-holiday data again. | Must | Confirmed | User request ("gets updated (refresh button)"). | User request | SCN-001, SCN-002 | |
| REF-002 | If the holiday service cannot be reached, then the system shall keep showing times and any holidays already loaded, and tell the user which countries have no holiday data. | Must | Confirmed | The page should still be useful offline. | Agent inference; confirmed by the user (2026-11-18, dialog) | SCN-002 | |
| HOL-003 | The system shall treat as a place's public holidays the national public holidays of its country, the public holidays of its region when one is chosen, and the holidays the user added for its country, without the holidays the user hid. | Must | Confirmed | User decision (2026-11-16, option 2). Observances that are not days off are excluded. The user's own entries complete or correct the service's data. | User decision; changed by user decision (2026-11-18) | SCN-002 | |
| HOL-004 | If regional holiday data is unavailable for a chosen region, then the system shall show the national holidays and tell the user that regional holidays are missing for that place. | Must | Confirmed | Free services cover regions unevenly; the user must not trust an incomplete grid. | User decision (2026-11-17) | SCN-002 | |
| HOL-001 | The system shall get each place's public holidays from a free public holiday service, except for the countries of the built-in holiday table (HOL-013). | Must | Confirmed | User decision (option 1). | User decision; changed by user decision (2026-11-18, dialog) | SCN-002 | EX-004 |
| HOL-002 | The system shall send the holiday service only a country code and a year. | Must | Confirmed | Privacy: nothing else about the user leaves the machine. | Agent inference from project rules; confirmed by the user (2026-11-18, dialog) | SCN-002 | |
| MAP-001 | The system shall show a world map with a pin for each place, labelled with the place's name and its current local time and date. | Must | Confirmed | The user sees every place's time at a glance. | User decision (2026-11-17) | SCN-001 | |
| SET-009 | Where the user enters a display name for a place, the system shall show that name instead of the city name wherever the place is named; with no display name, the system shall show the city name. | Must | Confirmed | Teams name places by person or office, not by city. | User decision (2026-11-17) | SCN-001, SCN-002 | |
| SET-010 | Where the user turns on country names, the system shall show each place's country next to the place's name; with country names off, which is the default, the system shall show the place's name alone. | Must | Confirmed | Country names add clutter; most users do not need them. | User decision (2026-11-17) | SCN-001, SCN-002 | |
| SET-011 | The system shall provide a setting that turns the Hijri calendar on or off, with the Hijri calendar off by default. | Must | Confirmed | Not every team needs the Hijri calendar. | User decision (2026-11-17) | SCN-002 | EX-010 |
| PCK-007 | When the user chooses the previous day, the next day, or a day in a calendar, the system shall make that day the selected day and move the marker to it, keeping the marker's time of day in the first place. | Must | Confirmed | Meetings are planned for days other than today. The picker window follows the selected day, not the marker, so it stays still while the marker moves into the next day's hours. | User decision (2026-11-17); changed by user decision (2026-11-18) | SCN-001 | |
| PCK-009 | While the picker window covers more than one date in the first place, the system shall show the first and the last of those dates in the day selector (for example 20–21-Nov-26). | Must | Confirmed | The user sees which days the hour slots cover. | User request (2026-11-18, canvas comment: "when the slots span more than one day the date displays those days: 20-21") | SCN-001 | |
| LAY-001 | While the places do not all fit in the picker or in the month grid, the system shall make that list scroll vertically and keep the hour axis or the day headers in view. | Must | Confirmed | The page must stay usable with many places. | User decision (2026-11-17) | SCN-001, SCN-002 | |
| THM-001 | The system shall show the light theme or the dark theme that the theme setting (SET-012) chooses, and, while that setting is Auto, the theme that the operating system's colour-scheme setting asks for. | Must | Confirmed | Comfortable reading in any lighting. | User decision (2026-11-17); changed by user request (2026-11-18) | SCN-001, SCN-002 | |
| SET-012 | The system shall provide a theme setting with the choices Light, Dark and Auto, with Auto as the default. | Must | Confirmed | Some users want a different theme from their system's. | User request (2026-11-18, "add the dark/light to the settings, follow the canvas") | SCN-001, SCN-002 | |
| SET-013 | The system shall offer the cities of the city list (section 9) as a shortcut for adding a place, and shall also let the user add a custom place (SET-018). | Must | Confirmed | A short list is quicker to choose from than every country, and the team also needs places that are not in it. | User request (2026-11-18, "use these cities only in the app"); changed by user request (2026-11-23, "add a city that is not in the list") | SCN-001, SCN-002 | |
| SET-014 | While no settings are saved in the browser, the system shall show the default places Tokyo, Cairo, New Delhi, Madrid, Bogotá, Riyadh and Islamabad, in that order. | Must | Confirmed | A first visit shows a working page for the team's main cities. | User request (2026-11-18, "as a default in the app", "use the capital cities"); Tokyo once by user decision (2026-11-18, dialog) | SCN-001, SCN-002 | |
| SET-015 | If the saved settings hold a place that is neither a city of the city list nor a valid custom place (a name, a time zone that the browser knows and a country or territory that the page knows), then the system shall remove that place when the page opens. | Must | Confirmed | Settings saved before the city list, or damaged settings, must not break the page. | User decision (2026-11-18, dialog); changed with SET-013 (2026-11-23) | SCN-001, SCN-002 | |
| HOL-005 | Withdrawn on 2026-11-18, the day it was added. It read: "The system shall provide public-holiday data for every country and territory in the city list." Holidays the user adds (HOL-006) replace it. | Must | Withdrawn | Vacation planning must work for every city the team can choose, including the default places. | User decision (2026-11-18, dialog: find a second source); withdrawn by user decision (2026-11-18, dialog: manual replaces it) | SCN-002 | |
| HOL-006 | The system shall let the user add a public holiday, with a date and a name, to a country or territory of the city list or of a custom place. | Must | Confirmed | The holiday service has no data for some countries, and can miss a holiday in others. | User request (2026-11-18, "I want the user to be able to add public holidays if the system can't find them"); per country by user decision (dialog); custom places added with SET-013 (2026-11-23) | SCN-002 | EX-015, EX-028 |
| HOL-007 | The system shall let the user remove a public holiday that the user added. | Must | Confirmed | A mistyped holiday must be correctable. | User decision (2026-11-18, dialog) | SCN-002 | |
| HOL-008 | The system shall let the user hide a public holiday that came from the holiday service or from the built-in holiday table, and show it again. | Must | Confirmed | The service can list a day that is not a day off for the team. | User decision (2026-11-18, dialog: add and hide) | SCN-002 | |
| HOL-009 | When the user adds, removes, hides or shows a holiday, the system shall save the change in the browser and restore it on the next visit. | Must | Confirmed | The user should not re-enter holidays each time. | User decision (2026-11-18, dialog) | SCN-002 | |
| HOL-010 | When the user chooses to export, the system shall save the user's added holidays, hidden holidays and vacations to one CSV file on the user's machine, with one row per entry. | Must | Confirmed | One person enters a country's holidays or a team's vacations and shares the file with the team; a CSV opens in a spreadsheet. | User decision (2026-11-18, dialog); changed to CSV with vacations by user request (2026-11-23, "import and export vacations should be a csv"); one file with a Type column by user decision (2026-11-23, dialog) | SCN-002 | EX-017, EX-031 |
| HOL-011 | When the user chooses Add in the import dialog (HOL-017), the system shall add the rows of the file that can be imported to the holidays and vacations already saved, and shall not add a place. | Must | Confirmed | A teammate loads a shared file without losing their own entries or changing their list of places. | User decision (2026-11-18, dialog); merging approved by the user as an assumption; changed by user decision (2026-11-23, dialog: match a vacation to a place by name, skip and report the unmatched) | SCN-002 | EX-017, EX-032 |
| HOL-012 | If an imported file is not a CSV file with the header row described to the user (HOL-016), then the system shall change nothing and tell the user that the file was refused. | Must | Confirmed | A wrong file must not damage the saved holidays. | Agent inference, approved by the user (2026-11-18) | SCN-002 | |
| LAY-002 | When the user drags the left edge of the picker panel, the system shall change the panel's width to follow the drag by adding or removing hour slots at the end of the picker window, within the limits the design sets. | Must | Confirmed | The user chooses how much room the map and the picker get, and how many hours the picker shows. | User request (2026-11-18, canvas comments; confirmed in dialogs) | SCN-001 | |
| LAY-003 | When the user changes the picker panel's width, the system shall save it in the browser and restore it on the next visit. | Must | Confirmed | The user sets the width once. | User decision (2026-11-18, dialog) | SCN-001 | |
| LAY-004 | When the user drags the border between the map and the month grid, the system shall change the map's height to follow the drag, within the limits the design sets, and give the month grid the rest of the column. | Must | Confirmed | The user chooses how much room the map and the month grid get. | User request (2026-11-19, canvas: "make the border between the monthly and the world map container movable too") | SCN-001, SCN-002 | |
| LAY-005 | When the user changes the map's height, the system shall save it in the browser and restore it on the next visit. | Must | Confirmed | The user sets the height once. | User request (2026-11-19, "app remembers location") | SCN-001, SCN-002 | |
| SET-016 | The system shall let the user choose, for each place, which days of the week are its weekend, with the weekend of the place's country or territory as the default. | Must | Confirmed | The built-in weekend of a country can differ from a team's real days off. | User request (2026-11-18, canvas comment: "add weekend days, in case the user wants to override the defaults") | SCN-001, SCN-002 | |
| PCK-008 | While the pointer is over a picker row's window (PCK-006), the system shall show that place's local time and date at the pointer's position. | Must | Confirmed | The user reads a place's time at any point without moving the marker. | User request (2026-11-18, canvas comment: "when the user hovers over a time slot, the local time is displayed") | SCN-001 | |
| HOL-013 | The system shall take the national public holidays of India, Israel, Malaysia, Pakistan, Saudi Arabia, Taiwan and the United Arab Emirates, for the years 2026 to 2028, from a holiday table built into the page. | Must | Confirmed | The holiday service has no data for these countries, which hold 12 of the 55 cities and 3 of the 7 default places. | User decision (2026-11-18, dialog: built-in table from an open-source holiday library) | SCN-002 | EX-022, EX-023 |
| HOL-014 | While the user has added at least one public holiday for a country or territory, the system shall leave that country or territory out of the list of countries that have no holiday data (REF-002). | Must | Confirmed | A team that entered or imported its holidays should not keep seeing the notice. | User decision (2026-11-18, dialog) | SCN-002 | EX-023 |
| SET-017 | When the user sets a place's weekend days to exactly the weekend of the place's country or territory, the system shall store no weekend choice for that place, so that the place follows the default again (SET-016). | Must | Confirmed | What the user sees is the whole state; a place that looks like the default behaves like the default. | User decision (2026-11-18, dialog) | SCN-002 | EX-024 |
| DSP-004 | The system shall name each country or territory as the city list (section 9) names it. | Must | Confirmed | The browser's own name for Hong Kong is "Hong Kong SAR China"; the user's list says "Hong Kong". | User decision (2026-11-18, dialog) | SCN-001, SCN-002 | EX-025 |
| VER-001 | The system shall show its version in the settings panel, written as the word "Version" and the date and time of its build in UTC as year, month, day, and hour with minute, separated by full stops (for example Version 2026.11.18.1432). | Must | Confirmed | A teammate with a copy of the file can say which build they have. | User request (2026-11-18, "add versioning and add the version no to the ui"); build date, place and wording by user decision (dialogs) | SCN-001, SCN-002 | EX-026 |
| SET-018 | When the user adds a custom place, the system shall ask for its name, its time zone and its country or territory, and add a place with those values. | Must | Confirmed | A team has people, and cities, that the city list does not hold; a row can be a person. | User request (2026-11-23, "add it by writing its name, setting the time zone and the country for public holiday"; "can be a person/city. Not a city only") | SCN-001, SCN-002 | EX-012, EX-027 |
| SET-019 | While the settings are open, the system shall show them over the whole page, with a button that closes them. | Must | Confirmed | The settings hold more with each change, and a full page gives them room (agent inference). | User request (2026-11-23, "The settings window when open take the whole page") | SCN-001, SCN-002 | |
| MAP-002 | The system shall put the map pin of a custom place at the reference city of its time zone. | Must | Confirmed | A custom place has no coordinates of its own, and its pin should agree with its time. | User decision (2026-11-23, dialog) | SCN-001 | EX-027 |
| VAC-001 | When the user right-clicks a day in a place's row of the month grid, the system shall show a menu with the choices Add public holiday and Add vacation. | Must | Confirmed | The entry is made on the day the user is looking at. | User request (2026-11-23, "right click on a day and add a custom public holiday or a personal vacation") | SCN-002 | EX-028, EX-029 |
| VAC-002 | When the user chooses Add vacation, the system shall ask for a start date (preset to the clicked day), an end date and an optional label, and add the vacation to that row's place. | Must | Confirmed | A vacation is a span of days that the user takes once. | User request (2026-11-23); date range by user decision (2026-11-23, dialog) | SCN-002 | EX-029 |
| VAC-003 | If the end date of a vacation is before its start date, then the system shall not save the vacation and shall tell the user. | Must | Confirmed | A reversed range has no meaning. | Agent inference, approved by the user (2026-11-23, chat) | SCN-002 | |
| VAC-004 | The system shall mark each vacation day in the place's row of the month grid with a vacation colour, different from the weekend and public-holiday colours; where the day is also a weekend day or a public holiday, the system shall show the cell split diagonally, with the vacation colour on one half and the weekend or holiday colour on the other. | Must | Confirmed | The user sees which vacation days are working days. | User decision (2026-11-23, dialog: own colour in the grid, day-off colour in the picker); the split cell is an agent inference, approved by the user (2026-11-23, chat) | SCN-002 | EX-029 |
| VAC-005 | When the user right-clicks a day of a vacation, the system shall also offer Edit vacation and Remove vacation in the day menu, and shall change or delete the whole vacation when the user chooses one. | Must | Confirmed | A wrong range or a cancelled trip must be correctable where the vacation is. | User decision (2026-11-23, dialog) | SCN-002 | |
| VAC-006 | When the user adds, changes or removes a vacation, the system shall save the change in the browser and restore it on the next visit. | Must | Confirmed | The user should not re-enter vacations each time. | Agent inference from SET-004 and HOL-009, approved by the user (2026-11-23, chat) | SCN-002 | EX-029 |
| HOL-015 | When the user chooses Add public holiday in the day menu, the system shall ask for the holiday's name and date (preset to the clicked day) and add the holiday for the country or territory of that row's place, as HOL-006 does. | Must | Confirmed | A missing holiday is added on the day where it is missed. | User request (2026-11-23, "right click on a day and add a custom public holiday") | SCN-002 | EX-028 |
| HOL-016 | The system shall describe the CSV format of the holidays file beside its export and import buttons: the header row, the columns and what each holds, the date format, and an example. | Must | Confirmed | A user who edits the file in a spreadsheet needs to know what the page accepts. | User request (2026-11-23, "described to the user") | SCN-002 | EX-031 |
| HOL-017 | When the user picks a CSV file to import, the system shall first show a dialog that says how many of the file's rows can be imported out of the total and which places are missing, with the choices Add and Cancel. A row cannot be imported if it is invalid, or if it is a vacation that names a place the user does not have. | Must | Confirmed | The user sees what an import will do before it changes anything. | User decision (2026-11-23, dialog); shown on every import by assumption, approved by the user (2026-11-23, chat) | SCN-002 | EX-017, EX-032 |
| HOL-018 | When the user chooses Cancel in the import dialog (HOL-017), the system shall change nothing. | Must | Confirmed | A user who sees a bad count can back out. | User decision (2026-11-23, dialog) | SCN-002 | EX-032 |
| PCK-010 | The system shall show each place's name at the left end of its picker row, whatever the position of the marker. | Must | Confirmed | The names stay in one place, so the user can read them without searching (agent inference). | User request (2026-11-23, "keep the city names pinned to the left") | SCN-001 | EX-033 |
| PCK-011 | The system shall give the local date and time of a picker row (PCK-002) a see-through background, as the map labels (MAP-001) have, so the colours of the hour slots show through it. | Must | Confirmed | The label over the slots must not hide which hours are working hours. | User request (2026-11-23, "transparent bg color ... similar to the map") | SCN-001 | EX-033 |
| HOL-019 | When the user right-clicks a public-holiday day, the system shall also offer Hide public holiday, or Remove public holiday for a holiday the user added, in the day menu. | Must | Confirmed | The hover card (CAL-006) has no buttons, so a holiday is hidden or removed in the day menu (HOL-007, HOL-008). | Agent inference from the design (DEC-031), approved by the user (2026-11-23, chat) | SCN-002 | EX-016 |
| HOL-020 | The system shall list each imported file with its name, the time and date of its import and the number of holidays, hidden holidays and vacations that came from it. | Must | Confirmed | The user sees what came from which file. | User request (2026-11-23, canvas comment "add a list of imported files and allow thier deletion") | SCN-002 | EX-034 |
| HOL-021 | When the user chooses to delete an imported file, the system shall first show a dialog that says how many entries the deletion removes and how many stay, with the choices Delete and Cancel. | Must | Confirmed | Deleting removes saved data, so the user sees the effect first. | User request (2026-11-23); the dialog approved by the user (2026-11-23, chat) | SCN-002 | EX-034 |
| HOL-022 | When the user chooses Delete in that dialog, the system shall remove the file from the list and remove the holidays, hidden holidays and vacations that came only from that file; entries that the user added, or that another imported file also lists, stay. | Must | Confirmed | Deleting a file undoes what it added. | User decision (2026-11-23, dialog: undo what it added) | SCN-002 | EX-034 |
| HOL-023 | When the user imports a file or deletes an imported file, the system shall save the list of imported files in the browser and restore it on the next visit. | Must | Confirmed | The list, and which entries came from which file, must survive a reload. | Agent inference from HOL-009, approved by the user (2026-11-23, chat) | SCN-002 | EX-034 |
| HIJ-005 | Withdrawn on 2026-11-23, the day it was added. It read: "Where the Hijri calendar is on and a place uses the Egyptian General Authority of Survey variant, the system shall take that place's Hijri date from the table of the Authority's month starts built into the page and, for a date outside the table's years, shall show the Umm al-Qura date and say so in the Hijri note (HIJ-004)." No source for the table was found, so the variant is not built. | Must | Withdrawn | Egyptian teams follow the dates that their own authority publishes, which the browser's calendars do not give. | User request (2026-11-23, canvas comment "add egyptain authority"); withdrawn by user decision (2026-11-23, chat: "drop the Egyptian Hijri variant from all docs") | SCN-002 | |

## 5. Non-functional requirements

| ID | EARS requirement | Priority | Status | Business reason | Source | Acceptance evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-001 | The system shall make no network requests other than the holiday-service requests of HOL-001. | Must | Confirmed | No telemetry; no outside fonts or scripts, so the page is self-contained. | Agent inference from project rules; confirmed by the user (2026-11-18, dialog) | Automated check of the requests the page makes. |

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
| EX-011 | SET-014 | No settings are saved in the browser. The page opens. | The places are Tokyo, Cairo, New Delhi, Madrid, Bogotá, Riyadh and Islamabad, in that order. | User (2026-11-18) |
| EX-012 | SET-002, SET-013, SET-018 | The user adds the city Mumbai. | A place named Mumbai, in India, at UTC+5:30. The list of cities to add has the 55 cities of section 9; Nairobi is not in it, so the user can add Nairobi only as a custom place (SET-018). | User (2026-11-18); changed 2026-11-23 (chat) |
| EX-013 | SET-015 | The saved settings hold London, a place that is neither a city of the city list nor a valid custom place, and the valid custom place Sara of EX-027. The page opens. | London and Sara are shown. The invalid place is removed. | User (2026-11-18); changed 2026-11-23 (chat) |
| EX-014 | SET-016, CAL-002 | A New Delhi place with its weekend set to Saturday and Sunday, and a Riyadh place left unchanged. November 2026. | New Delhi: 2026-11-21 and 2026-11-22 are marked weekend. Riyadh: Friday 2026-11-20 and Saturday 2026-11-21 are marked weekend. | User (2026-11-18) |
| EX-015 | HOL-006, HOL-003 | The user adds the holiday "Diwali" on 2026-11-08 for India. Places: Mumbai and Pune. | Both rows show 2026-11-08 as a public holiday named Diwali. | User (2026-11-18) |
| EX-016 | HOL-008, HOL-003 | A New York place, December 2026 (EX-004). The user hides Christmas Day, 2026-12-25, then shows it again. | While hidden, 2026-12-25 is not a holiday for New York. Shown again, it is. | User (2026-11-18) |
| EX-017 | HOL-010, HOL-011, HOL-017 | Browser A holds the added holiday of EX-015 and exports it to a CSV file. Browser B holds "Iqbal Day", 2026-11-09, Pakistan, and imports that file, then chooses Add in the dialog. | The dialog says that 1 of 1 rows can be imported. Browser B holds both holidays. | User (2026-11-18); changed 2026-11-23 (chat) |
| EX-018 | HOL-012 | The user imports a file whose text is `hello`. | The saved holidays are unchanged and the page says the file was refused. | User (2026-11-18) |
| EX-019 | PCK-006, PCK-009, LAY-002, LAY-003 | First place Tokyo, selected day 2026-11-20, the picker at 24 slots. Then the user widens it by 6 slots. Then the page is reloaded. | At 24 slots the window runs from 12:00 AM on 20-Nov-26 to 12:00 AM on 21-Nov-26 in Tokyo and the day selector shows 20-Nov-26. At 30 slots the window ends at 6:00 AM on 21-Nov-26, each slot is as wide as before, and the day selector shows 20–21-Nov-26. After the reload the picker still has 30 slots. | User (2026-11-18) |
| EX-020 | PCK-006, PCK-007 | EX-019 at 30 slots. The user drags the marker to 2:00 AM on 21-Nov-26 in Tokyo, then chooses the next day. | After the drag the window still starts at 12:00 AM on 20-Nov-26. After "next day" the selected day is 2026-11-21 and the marker is at 2:00 AM on 21-Nov-26 in Tokyo. | User (2026-11-18) |
| EX-021 | PCK-008 | First place Tokyo, selected day 2026-11-20, and a Bogotá place. The pointer is over Bogotá's row at 10:00 AM Tokyo time. | The page shows 8:00 PM · 19-Nov-26 for Bogotá. | User (2026-11-18) |
| EX-022 | HOL-013, CAL-003 | A Riyadh place, September 2026, and a New Delhi place, January 2026. The holiday service returns nothing for Saudi Arabia and India. | Riyadh: 2026-09-23 is marked as a public holiday (Saudi National Day). New Delhi: 2026-01-26 is marked as a public holiday (Republic Day). | User (2026-11-18) |
| EX-023 | HOL-013, HOL-014, REF-002 | A Riyadh place, January 2029 (after the table's last year). Then the user adds the holiday "Founding Day" on 2029-02-22 for Saudi Arabia. | Before: no day of January 2029 is a public holiday for Riyadh, and the page lists Saudi Arabia as having no holiday data. After: the page no longer lists Saudi Arabia. | User (2026-11-18) |
| EX-024 | SET-017, SET-016 | A Madrid place (Spain's weekend is Saturday and Sunday). The user sets its weekend to Friday and Saturday, then back to Saturday and Sunday. | After the first change the place stores Friday and Saturday. After the second it stores no weekend choice and shows Saturday and Sunday as weekend. | User (2026-11-18) |
| EX-025 | DSP-004, SET-010 | Country names are on. A Hong Kong place. | The place reads "Hong Kong, Hong Kong", and the list of cities to add offers "Hong Kong, Hong Kong". | User (2026-11-18) |
| EX-026 | VER-001 | The page was built on 2026-11-18 at 14:32 UTC. The user opens the settings panel. | The panel shows "Version 2026.11.18.1432". | User (2026-11-18) |
| EX-027 | SET-018, MAP-002, SET-016, CLK-002, HOL-003 | The user adds a custom place named Sara, with the time zone Europe/Lisbon and the country Portugal. Instants 2026-07-01 12:00 UTC and 2026-12-01 12:00 UTC. December 2026; the holiday service returns Portugal's holidays. | A row named Sara in the month grid, the picker and the map, with the map pin at Lisbon. Local time 1:00 PM on 2026-07-01 and 12:00 PM on 2026-12-01. Saturday and Sunday are marked weekend. 2026-12-25 is marked as a public holiday. | User (2026-11-23, chat) |
| EX-028 | VAC-001, HOL-015, HOL-006 | A Mumbai place (India), November 2026. The user right-clicks 2026-11-08 in Mumbai's row, chooses Add public holiday, and enters the name Diwali. | The date in the dialog is preset to 08-Nov-26. After adding, 2026-11-08 is a public holiday named Diwali in every India row. | User (2026-11-23, chat) |
| EX-029 | VAC-001, VAC-002, VAC-004, VAC-005, VAC-006, PCK-005, CAL-006 | The place Sara of EX-027, first in the list, and a New York place; December 2026. The user right-clicks 2026-12-21 in Sara's row, chooses Add vacation, sets the end date 2026-12-31 and the label "Winter break". Then the page is reloaded, and the pointer is over 2026-12-22 in Sara's row. | The start date in the dialog is preset to 21-Dec-26. Sara's row shows 21 to 31 December in the vacation colour; 2026-12-25 is split holiday and vacation, and 2026-12-26 and 2026-12-27 are split weekend and vacation. New York's row shows no vacation. With the selected day 2026-12-22, Sara's whole picker row has the day-off colour. After the reload the vacation is still there, and the card shows "Winter break", 21-Dec-26 and 31-Dec-26. | User (2026-11-23, chat) |
| EX-030 | CAL-006 | A United States place, December 2026. The pointer moves over 2026-12-25 in its row, then away. | While the pointer is over the cell, a card beside the place's name shows "Christmas Day" and 25-Dec-26. When the pointer leaves, the card is gone. No click is needed. | User (2026-11-23, chat) |
| EX-031 | HOL-010, HOL-016 | The browser holds the added holiday Diwali (India, 2026-11-08), the hidden holiday Christmas Day (United States, 2026-12-25) and the vacation Winter break of the place Sara (2026-12-21 to 2026-12-31). The user exports. | One CSV file with a header row and three rows:<br>`Type,Country,Place,Start date,End date,Name`<br>`holiday,India,,08-Nov-26,,Diwali`<br>`hidden holiday,United States,,25-Dec-26,,Christmas Day`<br>`vacation,,Sara,21-Dec-26,31-Dec-26,Winter break`<br>The page describes these columns beside the export and import buttons. | User (2026-11-23, chat) |
| EX-032 | HOL-011, HOL-017, HOL-018 | Browser B holds the places Sara and London. It imports a file of four rows: the holiday Diwali (India), two vacations of Sara, and one vacation of a place named Omar. | The dialog says that 3 of 4 rows can be imported and that the place Omar is missing. If the user chooses Add, the holiday and Sara's two vacations are added, and no place is added. If the user chooses Cancel, nothing changes. | User (2026-11-23, chat) |
| EX-033 | PCK-002, PCK-010, PCK-011 | London and New York places. The marker is at 10:45 AM on 24-Nov-26 in London. Then the user drags the marker to the right end of the picker window. | London's row shows its name at the left end and "10:45 AM 24-Nov-26" over its hour slots beside the marker, with the slot colours visible through the label's background. New York's label reads "5:45 AM 24-Nov-26". At the right end both names are still at the left end of their rows, and each label is still inside its row. | User (2026-11-23, chat) |
| EX-034 | HOL-020, HOL-021, HOL-022, HOL-023 | The user added the holiday Y ("Test day", India, 2026-11-10) by hand. File A is imported: the holidays X ("Diwali", India, 2026-11-08) and Z ("Founders Day", India, 2026-11-12) and two vacations of Sara, V1 and V2. Then file B is imported: X again and one vacation of Sara, V3. | The list shows A (2 holidays, 2 vacations) and B (1 holiday, 1 vacation). Deleting A: the dialog says that 3 entries go (Z, V1 and V2) and that 1 stays (X, which B also lists). After Delete the list holds only B, and X, Y and V3 remain. Deleting B afterwards removes X and V3; Y remains. After a reload the list is the same. | User (2026-11-23, chat) |

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
| Example where the Umm al-Qura and tabular variants differ | EX-010 gives the same date in both variants. | Tests might not catch a wrong variant. | Design | Resolved: the unit test `test_hij_002_umalqura_and_tabular_differ_on_a_chosen_date` uses 2026-06-16, where the variants differ. |
| The offsets in the city list (section 9) | Assumption, stated to the user on 2026-11-18: they are each city's standard-time offset, for reference. The system keeps applying daylight-saving rules (CLK-002), so Sydney shows UTC+11 in November. | If the user meant fixed offsets, times are an hour off for part of the year in cities with daylight saving. | User | Revisit if a shown time differs from what the user expects. |
| Hong Kong's holidays and weekend | User decision (2026-11-18, dialog): Hong Kong is its own territory for public holidays and weekends, although the user's list named China as its country. | With mainland China's holidays, Hong Kong's days off would be wrong. | User | Resolved 2026-11-18. |
| Holiday data for seven countries | The approved holiday service (DEC-005) lists no data for India, Israel, Malaysia, Pakistan, Saudi Arabia, Taiwan and the United Arab Emirates (its list of countries, read 2026-11-18): 12 of the 55 cities, 3 of the 7 default places. The user first decided to find a second source (HOL-005) and then, the same day, that holidays added by the user replace it (HOL-006); HOL-005 is withdrawn and nothing waits for a second source. | Those countries show no holidays until a user adds them or imports a holidays file. | User | Changed on 2026-11-18, later the same day: a built-in holiday table covers these countries for 2026 to 2028 (HOL-013). A search found no second service fit to use: the one free service without a key that claims these countries answered a request for one country with another country's holidays. |
| A holiday the user adds (HOL-006) | Assumption, approved by the user on 2026-11-18: it is a single date and does not repeat every year. | Fixed-date holidays must be entered again for each year. | User | Revisit if yearly re-entry proves a burden. |
| Importing a holidays file (HOL-011) | Assumption, approved by the user on 2026-11-18: an import adds to the saved holidays and never replaces them. Export and import use local files only, so NFR-001 still holds. | A user who wants to start over must remove entries one by one. | User | Revisit if users ask for "replace all". |
| Acceptance examples for the 2026-11-18 requirements | EX-011 to EX-021, approved by the user on 2026-11-18 in a dialog. HOL-007, HOL-009 and LAY-003's saving are covered inside EX-015 to EX-019. | Tests would rest on unreviewed expectations. | User | Resolved 2026-11-18. |
| Limits of the picker panel's width (LAY-002) | The lower limit is the whole day (PCK-006), so the panel cannot be narrower than its 24 hour slots; the upper limit is left to the design. | A panel too wide hides the map; on a small screen the map gets only what the 24 slots leave. | Design | Resolved 2026-11-18: 24 to 48 hours, confirmed by the user in a dialog. |
| The data of the built-in holiday table (HOL-013) | It is generated at development time with the open-source library `date-holidays`, whose data is under CC BY-SA 3.0 and needs a credit. Islamic holidays in it are calculated, so a date can differ by a day from the official announcement. | A vacation plan could rest on a holiday that is one day off. The user can hide a wrong day and add the right one (HOL-006, HOL-008). | User | Revisit if a calculated date proves wrong for a team. |
| The last year of the built-in holiday table | The table ends with 2028 (HOL-013). | From 2029 the seven countries show no holidays and appear in the no-data notice, until the table is generated again. | User | Generate the table again before 2029. |
| Terms of the holiday service | Read on 2026-11-18 (terms last updated 2023-09-15): the service is free "for private or non-profit projects", asks for sponsorship "for commercial purposes", forbids running a holiday portal, and gives no warranty. User decision (2026-11-18, dialog): Zuno is a private, free, non-profit project and uses the service under that clause. | If a company adopts Zuno as an official tool, its use could count as commercial. | User | Revisit before a company adopts the page officially. |
| Accepted risk: contrast of the Hijri day on a public-holiday cell | User decision (2026-11-18, dialog): the Hijri day has no background of its own and a slightly darker shade of the Hijri colour, which has about 3.1:1 contrast on the public-holiday colour. | The 11 px Hijri day is hard to read on a holiday cell for some users. | User | Revisit if users cannot read it. |
| Accepted: the hover time (PCK-008) needs a pointer | User decision (2026-11-18, dialog): a keyboard user reads the same information by moving the marker with the arrow keys (PCK-002). | A keyboard user loses the chosen time while looking at another one. | User | Revisit if a keyboard-only user needs the page. |
| When a place's weekend equals its country's (SET-017) | User decision (2026-11-18, dialog): the place follows the country again. | A user cannot pin those exact days against a later change of the country's weekend. | User | Revisit if a user needs to pin them. |
| Pin of a custom place (MAP-002) | User decision (2026-11-23, dialog): the pin is at the reference city of the place's time zone; the user does not place it on the map. | Two custom places in one time zone share a pin, and a person far from the zone's main city is shown a few hundred kilometres off. | User | Revisit if the pins mislead. |
| Vacations and custom places (VAC-002, VAC-006, SET-018) | Assumptions approved by the user on 2026-11-23: a vacation belongs to its place, and removing the place deletes its vacations; to change a custom place's time zone or country the user removes the place and adds it again, which loses its vacations; a custom place may use any country or territory from the browser's list, named in the browser's English except where the city list names it (DSP-004). | A user who must correct a time zone loses the place's vacations. A country that neither the holiday service nor the built-in table covers shows the "no holiday data" notice (REF-002). | User | Revisit if re-entry proves a burden. |
| Overlapping and repeated vacations (VAC-002, HOL-011) | User decision (2026-11-23, dialog): two vacations of one place may overlap; adding or importing a vacation that equals a saved one (same place, start, end and label) changes nothing. | An overlap is drawn as one vacation colour; the hover card lists each vacation that covers the day. | User | Resolved 2026-11-23. |
| Accepted: no keyboard route to the day menu (VAC-001) | User decision (2026-11-23, dialog): the day menu opens only with a pointer. | A keyboard-only user cannot add or edit a holiday or a vacation, or hide a holiday, from the grid; they can still remove an added holiday and show a hidden one in the settings. | User | Revisit if a keyboard-only user needs the page. |
| Hover card and import dialog (CAL-006, HOL-017) | Assumptions approved by the user on 2026-11-23: the hover card also serves public-holiday cells; keyboard focus on a cell shows the same card, because hover needs a pointer; the import dialog shows on every import, even when nothing is missing. | A dialog with nothing to report is one extra click. | User | Revisit if the dialog annoys. |
| Colours of a vacation day (VAC-004) | Agent inference, to confirm: when a day is a vacation day, a public holiday and a weekend day, the other half of the cell shows the holiday colour. | The cell hides the weekend. | User | Confirm in the design canvas. |
| The CSV file (HOL-010 to HOL-017) | Assumptions approved by the user on 2026-11-23: the columns are Type (`holiday`, `hidden holiday` or `vacation`), Country, Place, Start date, End date and Name; the country is written as the page names it; CSV replaces JSON, so an old `.json` holidays file cannot be imported, while holidays already saved in the browser stay. User decision (2026-11-23, dialog): dates in the page format dd-mmm-yy (DSP-001), with a two-digit year read as 20yy. | Accepted risk: a spreadsheet, especially in a non-English region, may misread a month name or rewrite the dates when the user saves, and the next import then refuses or skips those rows. | User | Revisit if an import fails after a spreadsheet edit. |
| Accepted risk: contrast of the picker label (PCK-011) | Assumption approved by the user on 2026-11-23, as for the map label (MAP-001): text on a see-through background over the slot colours may fall below 4.5:1. | The label is hard to read on some slot colours. | User | Revisit if users cannot read it. |
| Position of the picker label (PCK-002) | Assumptions approved by the user on 2026-11-23: the label sits beside the marker line, on its right, and switches to the left near the right end so that it stays inside the row; the Hijri date stays in it when the Hijri calendar is on (HIJ-001); the hover time (PCK-008) stays above the band. | A label on the wrong side hides the marker or leaves the row. | Design | Settled in `/write-design`; test EX-033. |
| Wording of the examples of 2026-11-23 | The user approved the list and the substance of EX-027 to EX-033 and of the changes to EX-012, EX-013 and EX-017, in chat on 2026-11-23. The agent wrote the full texts from that substance (the CSV rows of EX-031, the dates of EX-029, the New York time of EX-033). | Tests would rest on wording the user has not read in full. | User | Read section 6 at the next review. |
| The term "settings panel" | SET-001 and VER-001 still say "settings panel"; since SET-019 the settings fill the page. | None for behaviour. | Design | The design may rename the term. |
| Imported files (HOL-020 to HOL-023) | User decision (2026-11-23, dialog): deleting a file undoes what only it added. Assumptions approved the same day with the design: an entry that two files list stays until both are deleted; an entry the user typed is never removed by a deletion; a file with no importable row makes no list entry; the same file imported twice makes two entries. | A user who expects a deletion to remove a shared entry sees it stay. | User | Revisit if the sharing rule confuses. |

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
(changed PCK-006 and PCK-007, new PCK-009, new glossary entry). The user approved the acceptance examples EX-011 to
EX-021 on 2026-11-18, in a dialog.

Changes approved by the user on 2026-11-18, in a dialog, after deciding them one at a time in a third
dialog round: new requirements HOL-013, HOL-014, SET-017, DSP-004 and VER-001; changed requirements
HOL-001, HOL-008 and DSP-001; PCK-004, REF-002, HOL-002 and NFR-001 confirmed as written; SCN-001 and
SCN-002 confirmed, with the colouring of SCN-001 corrected and a second alternate path in SCN-002; the
built-in holiday table in the scope, the constraints and the glossary; the new and the resolved items in
section 7; and the acceptance examples EX-022 to EX-026.

Changes approved by the user on 2026-11-19, in a dialog: new requirements LAY-004 and LAY-005 (a
movable border between the map and the month grid, saved in the browser), from the canvas.

Changes approved by the user on 2026-11-23, in chat, after dialogs on the pin of a custom place, the
vacation's span and colours, the CSV file, the import match and the way to edit a vacation: new
requirements SET-018, SET-019, MAP-002, VAC-001 to VAC-006, HOL-015 to HOL-018, PCK-010 and PCK-011;
changed requirements SET-013, SET-015, CAL-006, PCK-002, PCK-005, LEG-001, HOL-006, HOL-010, HOL-011 and
HOL-012; the reworded scope, glossary (Place, City list, Holidays file, and the new Custom place, Vacation and
Day menu), section 9 and SCN-002 (a new alternate path); EX-012, EX-013 and EX-017 changed; new examples
EX-027 to EX-033; and the new items in section 7. The user approved the nine assumptions and the three
assumptions about the picker label listed with the change. Two questions were still open then and are decided below: overlapping and
repeated vacations, and a keyboard route to the day menu.

Changes approved by the user on 2026-11-23, in chat, after the design was shown on the canvas and after a dialog
on each open point: new requirements HOL-019 (Hide and Remove a holiday in the day menu), HOL-020 to HOL-023
(the list of imported files, its deletion that undoes what only the file added, and saving it); HIJ-005 (the
Egyptian General Authority of Survey variant) was added and withdrawn the same day; EX-031 corrected (the hidden
holiday keeps its name); new example EX-034; and section 7: the two open questions turned into decisions
(vacations may overlap and an identical one is skipped; no keyboard route to the day menu) and three new
items. The user approved the design as a whole, DEC-029 to DEC-035, in the same message.

## 9. City list

The cities the user can add from the list (SET-013), as given by the user on 2026-11-18. Any other place is a
custom place (SET-018). The offset is each city's
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
