const SB_URL = 'https://nkztkzrkbeacyltidqwr.supabase.co';
const SB_KEY = 'sb_publishable_gSNbsrsq5ZV0glBJBeCZmQ_kBajhUPn';
const FOOTBALL_DATA_TOKEN = ''; // Register free at football-data.org and paste token here
const sb = supabase.createClient(SB_URL, SB_KEY);

const PLAYERS = ['Anton', 'Chris', 'Dan', 'Laurie', 'Pat', 'Steven'];

const ownerColors = {
  Anton: 'owner-anton', Chris: 'owner-chris', Dan: 'owner-dan',
  Laurie: 'owner-laurie', Pat: 'owner-pat', Steven: 'owner-steven',
};

// Per-player sponsor tag shown next to their name (leaderboard, awards, player cards…).
// Each entry has a `name` plus either a `logo` (image URL) or an `emoji` mark.
// Players not listed get no sponsor tag.
const PLAYER_SPONSORS = {
  Anton:  { name: 'Original Joker', emoji: '🃏' },
  Laurie: { name: 'Coca-Cola', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo.svg' },
  Steven: { name: 'Microsoft XP', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Unofficial_fan_made_Windows_XP_logo_variant.svg' },
};

const ownerHexColors = {
  Anton:  '#39d353',
  Chris:  '#3b82f6',
  Dan:    '#22c55e',
  Laurie: '#a855f7',
  Pat:    '#f97316',
  Steven: '#ef4444',
};

const FIFA_RANK = {
  Argentina: 1, France: 2, Spain: 3, England: 4, Brazil: 5,
  Morocco: 6, Netherlands: 7, Germany: 8, Portugal: 9, Belgium: 10,
  Mexico: 11, Colombia: 12, 'United States': 13, Croatia: 15, Japan: 16,
  Senegal: 17, Switzerland: 18, Uruguay: 19, Austria: 21, Iran: 22,
  'South Korea': 23, Australia: 25, Egypt: 26, Norway: 27, Canada: 28,
  Algeria: 29, Ecuador: 30, 'Ivory Coast': 31, Turkey: 32, Sweden: 36,
  Paraguay: 37, Panama: 40, Scotland: 41, 'DR Congo': 43,
  'Czech Republic': 44, Uzbekistan: 54, Qatar: 57, Tunisia: 58,
  'Saudi Arabia': 59, Iraq: 60, 'South Africa': 61, 'Cape Verde': 63,
  'Bosnia & Herzegovina': 64, Ghana: 65, Jordan: 68,
  'Curaçao': 81, 'New Zealand': 84, Haiti: 87,
};

const VENUE_DATA = {
  'Estadio Azteca': {
    city: 'Mexico City', country: 'MX', lat: 19.3029, lng: -99.1505,
    matches: ['Mexico|South Africa|2026-06-11','Uzbekistan|Colombia|2026-06-17','Czech Republic|Mexico|2026-06-24']
  },
  'Estadio Akron': {
    city: 'Guadalajara', country: 'MX', lat: 20.6867, lng: -103.4678,
    matches: ['South Korea|Czech Republic|2026-06-11','Mexico|South Korea|2026-06-18','Colombia|DR Congo|2026-06-23','Uruguay|Spain|2026-06-26']
  },
  'Estadio BBVA': {
    city: 'Monterrey', country: 'MX', lat: 25.6696, lng: -100.2440,
    matches: ['Sweden|Tunisia|2026-06-14','Tunisia|Japan|2026-06-20','South Africa|South Korea|2026-06-24']
  },
  'BMO Field': {
    city: 'Toronto', country: 'CA', lat: 43.6333, lng: -79.4181,
    matches: ['Canada|Bosnia & Herzegovina|2026-06-12','Ghana|Panama|2026-06-17','Germany|Ivory Coast|2026-06-20','Panama|Croatia|2026-06-23','Senegal|Iraq|2026-06-26']
  },
  'BC Place': {
    city: 'Vancouver', country: 'CA', lat: 49.2767, lng: -123.1115,
    matches: ['Australia|Turkey|2026-06-13','Canada|Qatar|2026-06-18','New Zealand|Egypt|2026-06-21','Switzerland|Canada|2026-06-24','New Zealand|Belgium|2026-06-26']
  },
  'MetLife Stadium': {
    city: 'New York / NJ', country: 'US', lat: 40.8135, lng: -74.0745,
    matches: ['Brazil|Morocco|2026-06-13','France|Senegal|2026-06-16','Norway|Senegal|2026-06-22','Ecuador|Germany|2026-06-25','Panama|England|2026-06-27']
  },
  'SoFi Stadium': {
    city: 'Los Angeles', country: 'US', lat: 33.9534, lng: -118.3395,
    matches: ['United States|Paraguay|2026-06-12','Iran|New Zealand|2026-06-15','Switzerland|Bosnia & Herzegovina|2026-06-18','Belgium|Iran|2026-06-21','Turkey|United States|2026-06-25']
  },
  'AT&T Stadium': {
    city: 'Dallas', country: 'US', lat: 32.7480, lng: -97.0929,
    matches: ['Netherlands|Japan|2026-06-14','England|Croatia|2026-06-17','Argentina|Austria|2026-06-22','Japan|Sweden|2026-06-25','Jordan|Argentina|2026-06-27']
  },
  "Levi's Stadium": {
    city: 'San Francisco', country: 'US', lat: 37.4033, lng: -121.9694,
    matches: ['Qatar|Switzerland|2026-06-13','Austria|Jordan|2026-06-16','Turkey|Paraguay|2026-06-19','Jordan|Algeria|2026-06-22','Paraguay|Australia|2026-06-25']
  },
  'Hard Rock Stadium': {
    city: 'Miami', country: 'US', lat: 25.9580, lng: -80.2389,
    matches: ['Saudi Arabia|Uruguay|2026-06-15','Uruguay|Cape Verde|2026-06-21','Scotland|Brazil|2026-06-24','Colombia|Portugal|2026-06-27']
  },
  'Arrowhead Stadium': {
    city: 'Kansas City', country: 'US', lat: 39.0490, lng: -94.4840,
    matches: ['Argentina|Algeria|2026-06-16','Ecuador|Curaçao|2026-06-20','Tunisia|Netherlands|2026-06-25','Algeria|Austria|2026-06-27']
  },
  'Lincoln Financial Field': {
    city: 'Philadelphia', country: 'US', lat: 39.9008, lng: -75.1675,
    matches: ['Ivory Coast|Ecuador|2026-06-14','Brazil|Haiti|2026-06-19','France|Iraq|2026-06-22','Curaçao|Ivory Coast|2026-06-25','Croatia|Ghana|2026-06-27']
  },
  'Lumen Field': {
    city: 'Seattle', country: 'US', lat: 47.5952, lng: -122.3316,
    matches: ['Belgium|Egypt|2026-06-15','United States|Australia|2026-06-19','Bosnia & Herzegovina|Qatar|2026-06-24','Egypt|Iran|2026-06-26']
  },
  'Mercedes-Benz Stadium': {
    city: 'Atlanta', country: 'US', lat: 33.7555, lng: -84.4009,
    matches: ['Spain|Cape Verde|2026-06-15','Czech Republic|South Africa|2026-06-18','Spain|Saudi Arabia|2026-06-21','Morocco|Haiti|2026-06-24','DR Congo|Uzbekistan|2026-06-27']
  },
  'NRG Stadium': {
    city: 'Houston', country: 'US', lat: 29.6847, lng: -95.4107,
    matches: ['Germany|Curaçao|2026-06-14','Portugal|DR Congo|2026-06-17','Netherlands|Sweden|2026-06-20','Portugal|Uzbekistan|2026-06-23','Cape Verde|Saudi Arabia|2026-06-26']
  },
  'Gillette Stadium': {
    city: 'Boston', country: 'US', lat: 42.0909, lng: -71.2643,
    matches: ['Haiti|Scotland|2026-06-13','Iraq|Norway|2026-06-16','Scotland|Morocco|2026-06-19','England|Ghana|2026-06-23','Norway|France|2026-06-26']
  }
};

const TERRITORY_DATA = [
  {
    name: 'Mesoamerica',
    venues: ['Estadio Azteca', 'Estadio Akron', 'Estadio BBVA'],
    geo: 'country', countryId: 484,
    color: '#243320',
  },
  {
    name: 'The Great North',
    venues: ['BMO Field', 'BC Place'],
    geo: 'states',
    states: ['AK','AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'],
    labelPoint: [-96, 60],
    color: '#1a2a38',
  },
  {
    name: 'Empire',
    venues: ['MetLife Stadium', 'Gillette Stadium', 'Lincoln Financial Field'],
    geo: 'states',
    states: ['ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD'],
    labelPoint: [-75, 41],
    color: '#1e1e38',
  },
  {
    name: 'Dixie',
    venues: ['Hard Rock Stadium', 'Mercedes-Benz Stadium'],
    geo: 'states',
    states: ['VA','WV','NC','SC','GA','FL','AL','MS','TN','KY','AR','LA'],
    labelPoint: [-84, 32],
    color: '#382020',
  },
  {
    name: 'The Frontier',
    venues: ['AT&T Stadium', 'NRG Stadium', 'Arrowhead Stadium'],
    geo: 'states',
    states: ['TX','OK','KS','MO','NE','IA','MN','WI','IL','IN','OH','MI','ND','SD'],
    labelPoint: [-93, 40],
    color: '#281e32',
  },
  {
    name: 'El Pacífico',
    venues: ['SoFi Stadium', "Levi's Stadium", 'Lumen Field'],
    geo: 'states',
    states: ['CA','OR','WA','NV','AZ','ID','MT','WY','CO','NM','UT','HI'],
    labelPoint: [-118, 37],
    color: '#1a2e32',
  },
];
