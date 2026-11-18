// @ts-check
/**
 * @module data/cities
 * The city table (DEC-015): the 55 cities of the spec's section 9, in that order, each with a
 * stable id, its name, its country or territory code, its IANA time zone and its own map
 * coordinates. It holds data only; `domain/cities.js` looks it up.
 */

/**
 * @typedef {object} City One city the user can add (SET-013).
 * @property {string} id Lower-case slug of the name; never changes, because saved places refer to it.
 * @property {string} name English name, with its accents.
 * @property {string} countryCode ISO 3166-1 alpha-2 code of the country or territory.
 * @property {string} zone IANA time-zone name.
 * @property {number} latitude Degrees, north positive.
 * @property {number} longitude Degrees, east positive.
 */

/** @type {readonly City[]} */
export const cityTable = Object.freeze([
  { id: "buenos-aires", name: "Buenos Aires", countryCode: "AR", zone: "America/Argentina/Buenos_Aires", latitude: -34.6, longitude: -58.38 },
  { id: "adelaide", name: "Adelaide", countryCode: "AU", zone: "Australia/Adelaide", latitude: -34.93, longitude: 138.6 },
  { id: "canberra", name: "Canberra", countryCode: "AU", zone: "Australia/Sydney", latitude: -35.28, longitude: 149.13 },
  { id: "melbourne", name: "Melbourne", countryCode: "AU", zone: "Australia/Melbourne", latitude: -37.81, longitude: 144.96 },
  { id: "perth", name: "Perth", countryCode: "AU", zone: "Australia/Perth", latitude: -31.95, longitude: 115.86 },
  { id: "sydney", name: "Sydney", countryCode: "AU", zone: "Australia/Sydney", latitude: -33.87, longitude: 151.21 },
  { id: "vienna", name: "Vienna", countryCode: "AT", zone: "Europe/Vienna", latitude: 48.21, longitude: 16.37 },
  { id: "brussels", name: "Brussels", countryCode: "BE", zone: "Europe/Brussels", latitude: 50.85, longitude: 4.35 },
  { id: "brasilia", name: "Brasília", countryCode: "BR", zone: "America/Sao_Paulo", latitude: -15.79, longitude: -47.88 },
  { id: "sao-paulo", name: "São Paulo", countryCode: "BR", zone: "America/Sao_Paulo", latitude: -23.55, longitude: -46.63 },
  { id: "beijing", name: "Beijing", countryCode: "CN", zone: "Asia/Shanghai", latitude: 39.9, longitude: 116.41 },
  { id: "hong-kong", name: "Hong Kong", countryCode: "HK", zone: "Asia/Hong_Kong", latitude: 22.32, longitude: 114.17 },
  { id: "bogota", name: "Bogotá", countryCode: "CO", zone: "America/Bogota", latitude: 4.71, longitude: -74.07 },
  { id: "prague", name: "Prague", countryCode: "CZ", zone: "Europe/Prague", latitude: 50.08, longitude: 14.44 },
  { id: "copenhagen", name: "Copenhagen", countryCode: "DK", zone: "Europe/Copenhagen", latitude: 55.68, longitude: 12.57 },
  { id: "quito", name: "Quito", countryCode: "EC", zone: "America/Guayaquil", latitude: -0.18, longitude: -78.47 },
  { id: "cairo", name: "Cairo", countryCode: "EG", zone: "Africa/Cairo", latitude: 30.04, longitude: 31.24 },
  { id: "helsinki", name: "Helsinki", countryCode: "FI", zone: "Europe/Helsinki", latitude: 60.17, longitude: 24.94 },
  { id: "paris", name: "Paris", countryCode: "FR", zone: "Europe/Paris", latitude: 48.86, longitude: 2.35 },
  { id: "berlin", name: "Berlin", countryCode: "DE", zone: "Europe/Berlin", latitude: 52.52, longitude: 13.4 },
  { id: "munich", name: "Munich", countryCode: "DE", zone: "Europe/Berlin", latitude: 48.14, longitude: 11.58 },
  { id: "hyderabad", name: "Hyderabad", countryCode: "IN", zone: "Asia/Kolkata", latitude: 17.39, longitude: 78.49 },
  { id: "mumbai", name: "Mumbai", countryCode: "IN", zone: "Asia/Kolkata", latitude: 19.08, longitude: 72.88 },
  { id: "new-delhi", name: "New Delhi", countryCode: "IN", zone: "Asia/Kolkata", latitude: 28.61, longitude: 77.21 },
  { id: "pune", name: "Pune", countryCode: "IN", zone: "Asia/Kolkata", latitude: 18.52, longitude: 73.86 },
  { id: "jakarta", name: "Jakarta", countryCode: "ID", zone: "Asia/Jakarta", latitude: -6.21, longitude: 106.85 },
  { id: "dublin", name: "Dublin", countryCode: "IE", zone: "Europe/Dublin", latitude: 53.35, longitude: -6.26 },
  { id: "jerusalem", name: "Jerusalem", countryCode: "IL", zone: "Asia/Jerusalem", latitude: 31.77, longitude: 35.21 },
  { id: "tel-aviv", name: "Tel Aviv", countryCode: "IL", zone: "Asia/Jerusalem", latitude: 32.09, longitude: 34.78 },
  { id: "milan", name: "Milan", countryCode: "IT", zone: "Europe/Rome", latitude: 45.46, longitude: 9.19 },
  { id: "rome", name: "Rome", countryCode: "IT", zone: "Europe/Rome", latitude: 41.9, longitude: 12.5 },
  { id: "tokyo", name: "Tokyo", countryCode: "JP", zone: "Asia/Tokyo", latitude: 35.68, longitude: 139.69 },
  { id: "kuala-lumpur", name: "Kuala Lumpur", countryCode: "MY", zone: "Asia/Kuala_Lumpur", latitude: 3.14, longitude: 101.69 },
  { id: "mexico-city", name: "Mexico City", countryCode: "MX", zone: "America/Mexico_City", latitude: 19.43, longitude: -99.13 },
  { id: "amsterdam", name: "Amsterdam", countryCode: "NL", zone: "Europe/Amsterdam", latitude: 52.37, longitude: 4.9 },
  { id: "islamabad", name: "Islamabad", countryCode: "PK", zone: "Asia/Karachi", latitude: 33.69, longitude: 73.05 },
  { id: "lahore", name: "Lahore", countryCode: "PK", zone: "Asia/Karachi", latitude: 31.55, longitude: 74.34 },
  { id: "warsaw", name: "Warsaw", countryCode: "PL", zone: "Europe/Warsaw", latitude: 52.23, longitude: 21.01 },
  { id: "riyadh", name: "Riyadh", countryCode: "SA", zone: "Asia/Riyadh", latitude: 24.71, longitude: 46.68 },
  { id: "singapore", name: "Singapore", countryCode: "SG", zone: "Asia/Singapore", latitude: 1.35, longitude: 103.82 },
  { id: "seoul", name: "Seoul", countryCode: "KR", zone: "Asia/Seoul", latitude: 37.57, longitude: 126.98 },
  { id: "madrid", name: "Madrid", countryCode: "ES", zone: "Europe/Madrid", latitude: 40.42, longitude: -3.7 },
  { id: "stockholm", name: "Stockholm", countryCode: "SE", zone: "Europe/Stockholm", latitude: 59.33, longitude: 18.07 },
  { id: "bern", name: "Bern", countryCode: "CH", zone: "Europe/Zurich", latitude: 46.95, longitude: 7.45 },
  { id: "taipei", name: "Taipei", countryCode: "TW", zone: "Asia/Taipei", latitude: 25.03, longitude: 121.57 },
  { id: "dubai", name: "Dubai", countryCode: "AE", zone: "Asia/Dubai", latitude: 25.2, longitude: 55.27 },
  { id: "london", name: "London", countryCode: "GB", zone: "Europe/London", latitude: 51.51, longitude: -0.13 },
  { id: "chicago", name: "Chicago", countryCode: "US", zone: "America/Chicago", latitude: 41.88, longitude: -87.63 },
  { id: "los-angeles", name: "Los Angeles", countryCode: "US", zone: "America/Los_Angeles", latitude: 34.05, longitude: -118.24 },
  { id: "minneapolis", name: "Minneapolis", countryCode: "US", zone: "America/Chicago", latitude: 44.98, longitude: -93.27 },
  { id: "new-york", name: "New York", countryCode: "US", zone: "America/New_York", latitude: 40.71, longitude: -74.01 },
  { id: "phoenix", name: "Phoenix", countryCode: "US", zone: "America/Phoenix", latitude: 33.45, longitude: -112.07 },
  { id: "san-diego", name: "San Diego", countryCode: "US", zone: "America/Los_Angeles", latitude: 32.72, longitude: -117.16 },
  { id: "tallahassee", name: "Tallahassee", countryCode: "US", zone: "America/New_York", latitude: 30.44, longitude: -84.28 },
  { id: "washington-dc", name: "Washington, D.C.", countryCode: "US", zone: "America/New_York", latitude: 38.91, longitude: -77.04 },
]);
