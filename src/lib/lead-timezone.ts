/**
 * Deterministic Lead Timezone Resolver for ClientForge CRM
 * Roadmap #4: Lead Local-Time Awareness
 *
 * Implements strict NO-GUESS RULE:
 * If location information cannot resolve a timezone confidently, returns null (UNKNOWN).
 * Never fabricates or guesses a timezone.
 */

import { isValidTimeZone } from "./timezone";

export interface LeadLocationInput {
  country?: string | null;
  city?: string | null;
  region?: string | null;
}

/**
 * Normalizes user-entered country strings into canonical ISO alpha-2 codes.
 */
export function normalizeCountry(country?: string | null): string | null {
  if (!country || typeof country !== "string") return null;
  const raw = country.trim().toLowerCase();
  if (!raw) return null;

  const COUNTRY_SYNONYMS: Record<string, string> = {
    // United Kingdom
    uk: "GB",
    "united kingdom": "GB",
    "great britain": "GB",
    gb: "GB",
    england: "GB",
    scotland: "GB",
    wales: "GB",
    "northern ireland": "GB",

    // United States
    usa: "US",
    us: "US",
    "united states": "US",
    "united states of america": "US",

    // United Arab Emirates
    uae: "AE",
    ae: "AE",
    "united arab emirates": "AE",
    dubai: "AE",
    "abu dhabi": "AE",

    // Australia
    au: "AU",
    australia: "AU",

    // Canada
    ca: "CA",
    canada: "CA",

    // Philippines
    ph: "PH",
    philippines: "PH",

    // Malaysia
    my: "MY",
    malaysia: "MY",

    // Thailand
    th: "TH",
    thailand: "TH",

    // Singapore
    sg: "SG",
    singapore: "SG",

    // India
    in: "IN",
    india: "IN",
  };

  return COUNTRY_SYNONYMS[raw] || (raw.length === 2 ? raw.toUpperCase() : null);
}

/**
 * Single-timezone target markets where country level is 100% operationally deterministic.
 */
const SINGLE_ZONE_COUNTRIES: Record<string, string> = {
  GB: "Europe/London",
  PH: "Asia/Manila",
  MY: "Asia/Kuala_Lumpur",
  AE: "Asia/Dubai",
  TH: "Asia/Bangkok",
  SG: "Asia/Singapore",
  IN: "Asia/Kolkata",
};

/**
 * US State / Region mappings.
 */
const US_STATE_TIMEZONES: Record<string, string> = {
  // Eastern
  ny: "America/New_York",
  "new york": "America/New_York",
  fl: "America/New_York",
  florida: "America/New_York",
  ga: "America/New_York",
  georgia: "America/New_York",
  nc: "America/New_York",
  "north carolina": "America/New_York",
  sc: "America/New_York",
  "south carolina": "America/New_York",
  va: "America/New_York",
  virginia: "America/New_York",
  ma: "America/New_York",
  massachusetts: "America/New_York",
  md: "America/New_York",
  maryland: "America/New_York",
  pa: "America/New_York",
  pennsylvania: "America/New_York",
  nj: "America/New_York",
  "new jersey": "America/New_York",
  ct: "America/New_York",
  connecticut: "America/New_York",
  dc: "America/New_York",
  "district of columbia": "America/New_York",
  washington_dc: "America/New_York",
  oh: "America/New_York",
  ohio: "America/New_York",
  mi: "America/New_York",
  michigan: "America/New_York",
  me: "America/New_York",
  maine: "America/New_York",
  nh: "America/New_York",
  "new hampshire": "America/New_York",
  vt: "America/New_York",
  vermont: "America/New_York",
  ri: "America/New_York",
  "rhode island": "America/New_York",
  wv: "America/New_York",
  "west virginia": "America/New_York",
  de: "America/New_York",
  delaware: "America/New_York",

  // Central
  il: "America/Chicago",
  illinois: "America/Chicago",
  tx: "America/Chicago",
  texas: "America/Chicago",
  mo: "America/Chicago",
  missouri: "America/Chicago",
  mn: "America/Chicago",
  minnesota: "America/Chicago",
  wi: "America/Chicago",
  wisconsin: "America/Chicago",
  la: "America/Chicago",
  louisiana: "America/Chicago",
  al: "America/Chicago",
  alabama: "America/Chicago",
  ms: "America/Chicago",
  mississippi: "America/Chicago",
  tn: "America/Chicago",
  tennessee: "America/Chicago",
  ar: "America/Chicago",
  arkansas: "America/Chicago",
  ok: "America/Chicago",
  oklahoma: "America/Chicago",
  ks: "America/Chicago",
  kansas: "America/Chicago",
  ne: "America/Chicago",
  nebraska: "America/Chicago",
  ia: "America/Chicago",
  iowa: "America/Chicago",

  // Mountain
  co: "America/Denver",
  colorado: "America/Denver",
  ut: "America/Denver",
  utah: "America/Denver",
  nm: "America/Denver",
  "new mexico": "America/Denver",
  wy: "America/Denver",
  wyoming: "America/Denver",
  mt: "America/Denver",
  montana: "America/Denver",

  // Arizona (Does NOT observe DST — strictly America/Phoenix)
  az: "America/Phoenix",
  arizona: "America/Phoenix",

  // Pacific
  ca: "America/Los_Angeles",
  california: "America/Los_Angeles",
  wa: "America/Los_Angeles",
  washington: "America/Los_Angeles",
  or: "America/Los_Angeles",
  oregon: "America/Los_Angeles",
  nv: "America/Los_Angeles",
  nevada: "America/Los_Angeles",

  // Alaska & Hawaii
  ak: "America/Anchorage",
  alaska: "America/Anchorage",
  hi: "Pacific/Honolulu",
  hawaii: "Pacific/Honolulu",
};

/**
 * Curated list of unambiguous major US cities.
 * Cities with ambiguous multi-state presence (e.g. Springfield, Portland, Richmond, Columbus)
 * are excluded from this table so they require explicit state context.
 */
const UNAMBIGUOUS_US_CITIES: Record<string, string> = {
  // Eastern
  "new york": "America/New_York",
  "new york city": "America/New_York",
  nyc: "America/New_York",
  brooklyn: "America/New_York",
  manhattan: "America/New_York",
  queens: "America/New_York",
  bronx: "America/New_York",
  "staten island": "America/New_York",
  boston: "America/New_York",
  miami: "America/New_York",
  atlanta: "America/New_York",
  philadelphia: "America/New_York",
  "washington dc": "America/New_York",
  "washington, dc": "America/New_York",
  "washington, d.c.": "America/New_York",
  baltimore: "America/New_York",
  tampa: "America/New_York",
  orlando: "America/New_York",
  charlotte: "America/New_York",
  pittsburgh: "America/New_York",
  cincinnati: "America/New_York",
  cleveland: "America/New_York",
  detroit: "America/New_York",

  // Central
  chicago: "America/Chicago",
  dallas: "America/Chicago",
  houston: "America/Chicago",
  austin: "America/Chicago",
  "san antonio": "America/Chicago",
  "fort worth": "America/Chicago",
  nashville: "America/Chicago",
  "new orleans": "America/Chicago",
  memphis: "America/Chicago",
  indianapolis: "America/Chicago",
  milwaukee: "America/Chicago",
  minneapolis: "America/Chicago",
  "saint paul": "America/Chicago",
  "st. louis": "America/Chicago",
  "st louis": "America/Chicago",
  "kansas city": "America/Chicago",
  oklahoma_city: "America/Chicago",
  "oklahoma city": "America/Chicago",

  // Mountain
  denver: "America/Denver",
  "salt lake city": "America/Denver",
  "colorado springs": "America/Denver",
  aurora: "America/Denver",
  albuquerque: "America/Denver",
  boise: "America/Denver",

  // Arizona (Strictly America/Phoenix — No DST)
  phoenix: "America/Phoenix",
  tucson: "America/Phoenix",
  mesa: "America/Phoenix",
  chandler: "America/Phoenix",
  scottsdale: "America/Phoenix",
  glendale: "America/Phoenix",
  tempe: "America/Phoenix",

  // Pacific
  "los angeles": "America/Los_Angeles",
  la: "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  sf: "America/Los_Angeles",
  "san diego": "America/Los_Angeles",
  seattle: "America/Los_Angeles",
  "san jose": "America/Los_Angeles",
  sacramento: "America/Los_Angeles",
  oakland: "America/Los_Angeles",
  "long beach": "America/Los_Angeles",
  fresno: "America/Los_Angeles",
  "las vegas": "America/Los_Angeles",
  reno: "America/Los_Angeles",
  spokane: "America/Los_Angeles",
  tacoma: "America/Los_Angeles",
  arcadia: "America/Los_Angeles",
};

/**
 * Known ambiguous city names that exist across multiple US states/zones.
 * Explicitly rejected when provided without state/region context.
 */
const AMBIGUOUS_US_CITIES = new Set([
  "springfield",
  "portland", // OR (Pacific) vs ME (Eastern)
  "richmond",  // VA (Eastern) vs CA (Pacific)
  "columbus",  // OH (Eastern) vs GA (Eastern) vs IN/MS/NE
  "franklin",
  "clinton",
  "madison",
  "greenville",
  "marion",
  "salem",
  "jackson",
  "bristol",
  "arlington",
  "peoria",
  "decatur",
  "lafayette",
]);

/**
 * Australian State / Territory mappings.
 */
const AU_STATE_TIMEZONES: Record<string, string> = {
  nsw: "Australia/Sydney",
  "new south wales": "Australia/Sydney",
  act: "Australia/Sydney",
  "australian capital territory": "Australia/Sydney",
  vic: "Australia/Melbourne",
  victoria: "Australia/Melbourne",
  qld: "Australia/Brisbane", // No DST
  queensland: "Australia/Brisbane",
  wa: "Australia/Perth",
  "western australia": "Australia/Perth",
  sa: "Australia/Adelaide",
  "south australia": "Australia/Adelaide",
  tas: "Australia/Hobart",
  tasmania: "Australia/Hobart",
  nt: "Australia/Darwin",
  "northern territory": "Australia/Darwin",
};

/**
 * Curated unambiguous Australian cities.
 */
const UNAMBIGUOUS_AU_CITIES: Record<string, string> = {
  sydney: "Australia/Sydney",
  newcastle: "Australia/Sydney",
  wollongong: "Australia/Sydney",
  canberra: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  geelong: "Australia/Melbourne",
  ballarat: "Australia/Melbourne",
  bendigo: "Australia/Melbourne",
  brisbane: "Australia/Brisbane",
  "gold coast": "Australia/Brisbane",
  "sunshine coast": "Australia/Brisbane",
  townsville: "Australia/Brisbane",
  cairns: "Australia/Brisbane",
  perth: "Australia/Perth",
  fremantle: "Australia/Perth",
  adelaide: "Australia/Adelaide",
  hobart: "Australia/Hobart",
  launceston: "Australia/Hobart",
  darwin: "Australia/Darwin",
};

/**
 * Canadian Provinces and curated major cities.
 */
const CA_STATE_OR_CITY_TIMEZONES: Record<string, string> = {
  on: "America/Toronto",
  ontario: "America/Toronto",
  qc: "America/Toronto",
  quebec: "America/Toronto",
  toronto: "America/Toronto",
  ottawa: "America/Toronto",
  montreal: "America/Toronto",
  "quebec city": "America/Toronto",
  mississauga: "America/Toronto",
  hamilton: "America/Toronto",
  bc: "America/Vancouver",
  "british columbia": "America/Vancouver",
  vancouver: "America/Vancouver",
  victoria: "America/Vancouver",
  surrey: "America/Vancouver",
  burnaby: "America/Vancouver",
  ab: "America/Edmonton",
  alberta: "America/Edmonton",
  calgary: "America/Edmonton",
  edmonton: "America/Edmonton",
  mb: "America/Winnipeg",
  manitoba: "America/Winnipeg",
  winnipeg: "America/Winnipeg",
  ns: "America/Halifax",
  "nova scotia": "America/Halifax",
  halifax: "America/Halifax",
};

/**
 * Resolves an authoritative IANA timezone for a lead given country, city, and region.
 * Returns null (UNKNOWN) if evidence is insufficient or ambiguous.
 */
export function resolveLeadTimezone(input: LeadLocationInput): string | null {
  const countryCode = normalizeCountry(input.country);
  if (!countryCode) return null;

  // 1. Single-timezone target markets
  const singleZone = SINGLE_ZONE_COUNTRIES[countryCode];
  if (singleZone) {
    return isValidTimeZone(singleZone) ? singleZone : null;
  }

  const cleanCity = (input.city || "").trim().toLowerCase();
  const cleanRegion = (input.region || "").trim().toLowerCase();

  // 2. United States
  if (countryCode === "US") {
    // Check state / region first
    if (cleanRegion && US_STATE_TIMEZONES[cleanRegion]) {
      return US_STATE_TIMEZONES[cleanRegion];
    }
    // Check if city is ambiguous without state
    if (cleanCity && AMBIGUOUS_US_CITIES.has(cleanCity)) {
      return null;
    }
    // Check curated unambiguous major US cities
    if (cleanCity && UNAMBIGUOUS_US_CITIES[cleanCity]) {
      return UNAMBIGUOUS_US_CITIES[cleanCity];
    }
    return null; // UNKNOWN (Country only or unmapped city)
  }

  // 3. Australia
  if (countryCode === "AU") {
    // Check state / territory first
    if (cleanRegion && AU_STATE_TIMEZONES[cleanRegion]) {
      return AU_STATE_TIMEZONES[cleanRegion];
    }
    // Check curated major AU cities
    if (cleanCity && UNAMBIGUOUS_AU_CITIES[cleanCity]) {
      return UNAMBIGUOUS_AU_CITIES[cleanCity];
    }
    return null; // UNKNOWN (Country only)
  }

  // 4. Canada
  if (countryCode === "CA") {
    if (cleanRegion && CA_STATE_OR_CITY_TIMEZONES[cleanRegion]) {
      return CA_STATE_OR_CITY_TIMEZONES[cleanRegion];
    }
    if (cleanCity && CA_STATE_OR_CITY_TIMEZONES[cleanCity]) {
      return CA_STATE_OR_CITY_TIMEZONES[cleanCity];
    }
    return null; // UNKNOWN
  }

  return null; // UNKNOWN
}
