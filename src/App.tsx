import React, { useState, useEffect, useMemo } from 'react';
import { COUNTRIES } from './data/countries';
import { Country } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Globe, 
  MapPin, 
  Phone, 
  Briefcase, 
  DollarSign, 
  Info, 
  X,
  Sun,
  Moon
} from 'lucide-react';

// Common timezone overrides for countries where the standard Continent/Capital formula has special IANA database names
const TIMEZONE_OVERRIDES: Record<string, string> = {
  "India": "Asia/Kolkata",
  "United States": "America/New_York",
  "United Kingdom": "Europe/London",
  "Spain": "Europe/Madrid",
  "Germany": "Europe/Berlin",
  "Japan": "Asia/Tokyo",
  "China": "Asia/Shanghai",
  "Australia": "Australia/Sydney",
  "Canada": "America/Toronto",
  "Brazil": "America/Sao_Paulo",
  "Russia": "Europe/Moscow",
  "South Africa": "Africa/Johannesburg",
  "Singapore": "Asia/Singapore",
  "Saudi Arabia": "Asia/Riyadh",
  "United Arab Emirates": "Asia/Dubai",
  "South Korea": "Asia/Seoul",
  "France": "Europe/Paris",
  "Italy": "Europe/Rome",
  "Netherlands": "Europe/Amsterdam",
  "Belgium": "Europe/Brussels",
  "Switzerland": "Europe/Zurich",
  "Sweden": "Europe/Stockholm",
  "Norway": "Europe/Oslo",
  "Denmark": "Europe/Copenhagen",
  "Finland": "Europe/Helsinki",
  "New Zealand": "Pacific/Auckland",
  "Turkey": "Europe/Istanbul",
  "Argentina": "America/Argentina/Buenos_Aires",
  "Mexico": "America/Mexico_City",
  "Ireland": "Europe/Dublin",
  "Philippines": "Asia/Manila",
  "Egypt": "Africa/Cairo",
  "Kenya": "Africa/Nairobi",
  "Nigeria": "Africa/Lagos",
  "Vietnam": "Asia/Ho_Chi_Minh",
  "Thailand": "Asia/Bangkok",
  "Indonesia": "Asia/Jakarta",
  "Malaysia": "Asia/Kuala_Lumpur",
  "Israel": "Asia/Jerusalem",
  "Greece": "Europe/Athens",
  "Poland": "Europe/Warsaw",
  "Ukraine": "Europe/Kyiv",
  "Romania": "Europe/Bucharest",
  "Portugal": "Europe/Lisbon",
  "Austria": "Europe/Vienna",
  "Hungary": "Europe/Budapest",
  "Czechia": "Europe/Prague",
  "Slovakia": "Europe/Bratislava",
  "Croatia": "Europe/Zagreb",
  "Chile": "America/Santiago",
  "Colombia": "America/Bogota",
  "Peru": "America/Lima",
  "Venezuela": "America/Caracas",
  "Pakistan": "Asia/Karachi",
  "Bangladesh": "Asia/Dhaka",
  "Sri Lanka": "Asia/Colombo",
  "Nepal": "Asia/Kathmandu",
  "Qatar": "Asia/Doha",
  "Kuwait": "Asia/Kuwait",
  "Oman": "Asia/Muscat",
  "Jordan": "Asia/Amman",
  "Lebanon": "Asia/Beirut",
  "Iraq": "Asia/Baghdad",
  "Iran": "Asia/Tehran",
  "Morocco": "Africa/Casablanca",
  "Algeria": "Africa/Algiers",
  "Tunisia": "Africa/Tunis",
  "Ghana": "Africa/Accra",
  "Iceland": "Atlantic/Reykjavik",
  "Greenland": "America/Nuuk",
};

// Fallback offset matching dictionary to find an appropriate IANA timezone if capital matches fail
const TIMEZONE_BY_OFFSET: Record<number, string> = {
  [-11]: "Pacific/Pago_Pago",
  [-10]: "Pacific/Honolulu",
  [-9.5]: "Pacific/Marquesas",
  [-9]: "America/Anchorage",
  [-8]: "America/Los_Angeles",
  [-7]: "America/Denver",
  [-6]: "America/Chicago",
  [-5]: "America/New_York",
  [-4]: "America/Halifax",
  [-3.5]: "America/St_Johns",
  [-3]: "America/Sao_Paulo",
  [-2]: "America/Noronha",
  [-1]: "Atlantic/Cape_Verde",
  [0]: "Europe/London",
  [1]: "Europe/Paris",
  [2]: "Africa/Cairo",
  [3]: "Europe/Moscow",
  [3.5]: "Asia/Tehran",
  [4]: "Asia/Dubai",
  [4.5]: "Asia/Kabul",
  [5]: "Asia/Karachi",
  [5.5]: "Asia/Kolkata",
  [5.75]: "Asia/Kathmandu",
  [6]: "Asia/Dhaka",
  [6.5]: "Asia/Yangon",
  [7]: "Asia/Bangkok",
  [8]: "Asia/Singapore",
  [8.75]: "Australia/Eucla",
  [9]: "Asia/Tokyo",
  [9.5]: "Australia/Adelaide",
  [10]: "Australia/Sydney",
  [10.5]: "Australia/Lord_Howe",
  [11]: "Pacific/Guadalcanal",
  [12]: "Pacific/Auckland",
  [12.75]: "Pacific/Chatham",
  [13]: "Pacific/Apia",
  [14]: "Pacific/Kiritimati"
};

// Helper to check if the user's current environment supports this specific timezone key
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

// Map any country to its correct and valid IANA Timezone key dynamically
function getIanaTimezone(countryName: string, continent: string, capital: string, defaultOffset: number): string {
  // Check override map first for precise mapping
  if (TIMEZONE_OVERRIDES[countryName] && isValidTimezone(TIMEZONE_OVERRIDES[countryName])) {
    return TIMEZONE_OVERRIDES[countryName];
  }

  // Normalize Continent name for standard database structure
  let resolvedContinent = continent;
  if (continent === 'North America' || continent === 'South America') {
    resolvedContinent = 'America';
  }

  // Sanitize capital city name (replace spaces with underscores, drop special punctuation characters)
  const sanitizedCapital = capital.replace(/\s+/g, '_').replace(/[^a-zA-Z_]/g, '');
  const candidateTz = `${resolvedContinent}/${sanitizedCapital}`;

  if (isValidTimezone(candidateTz)) {
    return candidateTz;
  }

  // Try country name directly if capital fails
  const sanitizedCountry = countryName.replace(/\s+/g, '_').replace(/[^a-zA-Z_]/g, '');
  const countryCandidate = `${resolvedContinent}/${sanitizedCountry}`;
  if (isValidTimezone(countryCandidate)) {
    return countryCandidate;
  }

  // Fallback to offset table matching standard tz
  const fallbackKey = Math.round(defaultOffset);
  const offsetFallback = TIMEZONE_BY_OFFSET[fallbackKey] || TIMEZONE_BY_OFFSET[defaultOffset];
  if (offsetFallback && isValidTimezone(offsetFallback)) {
    return offsetFallback;
  }

  // Global default
  return "UTC";
}

// Dynamically compute the exact timezone offset of an IANA key at a given instant (handles DST automatically!)
function getTimezoneOffset(timeZone: string, date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset'
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart) {
      const val = tzPart.value; // Format: "GMT+05:30", "GMT-08:00", "GMT"
      if (val === 'GMT' || val === 'UTC') return 0;
      const match = val.match(/GMT([+-])(\d+):(\d+)/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const hours = parseInt(match[2], 10);
        const minutes = parseInt(match[3], 10);
        return sign * (hours + minutes / 60);
      }
    }
  } catch (e) {
    // Fail-safe
  }
  return 0;
}

export default function App() {
  // --- States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContinent, setSelectedContinent] = useState<string>('All');
  const [activeCountry, setActiveCountry] = useState<Country | null>(null);
  const [theme, setTheme] = useState<'space' | 'solar'>(() => {
    try {
      return (localStorage.getItem('chronosync-theme') as 'space' | 'solar') || 'space';
    } catch (e) {
      return 'space';
    }
  });
  
  // Real-time ticking clock state
  const [liveTime, setLiveTime] = useState(new Date());

  // Save theme choice
  useEffect(() => {
    try {
      localStorage.setItem('chronosync-theme', theme);
    } catch (e) {
      // Ignored
    }
  }, [theme]);

  const isSpace = theme === 'space';

  // --- Live ticking effect ---
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Formatting Helpers using the Intl IANA API ---
  const formatTimeString = (date: Date, timeZone: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(date);
    } catch (e) {
      return date.toLocaleTimeString('en-US');
    }
  };

  const formatShortTimeString = (date: Date, timeZone: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch (e) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  };

  const formatFullDate = (date: Date, timeZone: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  // --- Offset explanation formatter ---
  const getTimeDifferenceString = (targetOffset: number, baseOffset: number = 5.5) => {
    const diff = targetOffset - baseOffset;
    if (diff === 0) return 'Same as IST';
    const absDiff = Math.abs(diff);
    const hoursPart = Math.floor(absDiff);
    const minsPart = Math.round((absDiff - hoursPart) * 60);
    
    let label = '';
    if (hoursPart > 0) label += `${hoursPart}h `;
    if (minsPart > 0) label += `${minsPart}m `;
    
    return diff > 0 ? `${label}ahead of IST` : `${label}behind IST`;
  };

  const isBusinessHours = (date: Date, timeZone: string) => {
    try {
      // Get hour in target timezone
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        hour12: false
      }).format(date);
      const hr = parseInt(hourStr, 10);
      return hr >= 9 && hr < 18;
    } catch (e) {
      return false;
    }
  };

  // --- Filter and Search Mechanism ---
  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(country => {
      const matchesSearch = 
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.capital.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.currencyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.dialCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesContinent = selectedContinent === 'All' || country.continent === selectedContinent;
      
      return matchesSearch && matchesContinent;
    });
  }, [searchTerm, selectedContinent]);

  const continents = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'];

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-300 ${
      isSpace 
        ? 'bg-[#051424] text-[#d4e4fa] selection:bg-blue-900/50' 
        : 'bg-[#f8fafc] text-[#1e293b] selection:bg-blue-200'
    }`}>
      
      {/* Top Navigation Bar */}
      <header className={`sticky top-0 w-full z-20 flex flex-col sm:flex-row justify-between items-center px-6 py-4 gap-4 transition-colors duration-300 ${
        isSpace 
          ? 'bg-[#051424]/90 backdrop-blur-xl border-b border-[#1c2b3c]' 
          : 'bg-white/90 backdrop-blur-xl border-b border-[#e2e8f0] shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border shadow-sm transition-colors duration-300 ${
            isSpace 
              ? 'bg-[#122131] border-[#273647]' 
              : 'bg-white border-[#e2e8f0]'
          }`}>
            <Globe className={`w-6 h-6 animate-[spin_20s_linear_infinite] transition-colors duration-300 ${
              isSpace ? 'text-[#8ed5ff]' : 'text-blue-500'
            }`} />
          </div>
          <div>
            <div className={`text-xl font-bold tracking-tight flex items-center gap-2 transition-colors duration-300 ${
              isSpace ? 'text-[#8ed5ff]' : 'text-blue-600'
            }`}>
              ChronoSync <span className={`text-xs font-semibold px-2 py-0.5 rounded border transition-colors duration-300 ${
                isSpace 
                  ? 'bg-[#122131] text-[#8ed5ff] border-[#273647]' 
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>Live</span>
            </div>
            <div className={`text-[10px] font-bold tracking-wider uppercase transition-colors duration-300 ${
              isSpace ? 'text-[#bec6e0]' : 'text-slate-400'
            }`}>GLOBAL TIME & IST SYNC DASHBOARD</div>
          </div>
        </div>

        {/* Theme Switch & Live IST Status block */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {/* Live IST Status Badge */}
          <div className={`flex items-center gap-4 rounded-full px-4 py-1.5 shadow-sm border transition-colors duration-300 ${
            isSpace 
              ? 'bg-[#122131] border-[#273647]' 
              : 'bg-white border-[#e2e8f0]'
          }`}>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isSpace ? 'bg-emerald-400' : 'bg-blue-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isSpace ? 'bg-emerald-500' : 'bg-blue-500'
                }`}></span>
              </span>
              <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors duration-300 ${
                isSpace ? 'text-[#bec6e0]' : 'text-slate-500'
              }`}>
                Live Syncing
              </span>
            </div>
            <div className={`w-px h-4 transition-colors duration-300 ${isSpace ? 'bg-[#273647]' : 'bg-slate-200'}`} />
            <div className={`font-mono text-xs font-bold transition-colors duration-300 ${isSpace ? 'text-white' : 'text-slate-800'}`}>
              IST: {formatTimeString(liveTime, 'Asia/Kolkata')}
            </div>
          </div>

          {/* Theme Selector Toggle */}
          <div className={`flex items-center gap-1.5 p-1 rounded-full border shadow-sm transition-colors duration-300 ${
            isSpace ? 'bg-[#122131] border-[#273647]' : 'bg-white border-[#e2e8f0]'
          }`}>
            <button
              onClick={() => setTheme('space')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                isSpace 
                  ? 'bg-[#38bdf8] text-[#051424] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
              title="Switch to Dark Space Theme"
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Space</span>
            </button>
            <button
              onClick={() => setTheme('solar')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                !isSpace 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-[#bec6e0] hover:text-white hover:bg-[#1c2b3c]'
              }`}
              title="Switch to Light Solar Theme"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Solar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-6">

        {/* Main "Discover Countries" Container */}
        <div className={`rounded-2xl p-6 md:p-8 shadow-xl space-y-6 border transition-colors duration-300 ${
          isSpace 
            ? 'bg-[#122131]/60 border-[#1c2b3c]' 
            : 'bg-white border-[#e2e8f0]'
        }`}>
          
          {/* Header section of the container */}
          <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b transition-colors duration-300 ${
            isSpace ? 'border-[#1c2b3c]' : 'border-slate-100'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className={`text-xl md:text-2xl font-bold flex items-center gap-2.5 transition-colors duration-300 ${
                  isSpace ? 'text-white' : 'text-slate-800'
                }`}>
                  <Globe className={`w-6 h-6 transition-colors duration-300 ${isSpace ? 'text-[#8ed5ff]' : 'text-blue-500'}`} /> Discover Countries
                </h2>
              </div>
              <p className={`text-xs md:text-sm transition-colors duration-300 ${
                isSpace ? 'text-[#bec6e0]' : 'text-slate-500'
              }`}>
                Search or select from the list of 195 official countries across 6 continents.
              </p>
            </div>

            {/* Search Input Box */}
            <div className="relative w-full lg:max-w-md group">
              <Search className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                isSpace 
                  ? 'text-[#bec6e0] group-focus-within:text-[#8ed5ff]' 
                  : 'text-slate-400 group-focus-within:text-blue-500'
              }`} />
              <input
                id="country-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search country, capital, currency, dial code..."
                className={`w-full rounded-full pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-4 transition-all shadow-inner border transition-colors duration-300 ${
                  isSpace
                    ? 'bg-[#0d1c2d] border-[#273647] focus:border-[#8ed5ff] text-white placeholder-[#bec6e0]/60 focus:ring-[#8ed5ff]/10'
                    : 'bg-[#f8fafc] border-[#cbd5e1] focus:border-[#3b82f6] text-slate-800 placeholder-slate-400 focus:ring-blue-500/10'
                }`}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                    isSpace ? 'text-[#bec6e0] hover:text-white' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Continent Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {continents.map((continent) => {
              const isActive = selectedContinent === continent;
              return (
                <button
                  id={`filter-pill-${continent.replace(/\s+/g, '-').toLowerCase()}`}
                  key={continent}
                  onClick={() => setSelectedContinent(continent)}
                  className={`text-xs md:text-sm px-4 py-2 rounded-full font-semibold border transition-all duration-200 active:scale-95 ${
                    isActive
                      ? isSpace
                        ? 'bg-[#38bdf8] border-[#38bdf8] text-[#051424] shadow-md shadow-sky-400/10'
                        : 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/10'
                      : isSpace
                        ? 'bg-[#0d1c2d] border-[#273647] text-[#bec6e0] hover:text-white hover:bg-[#1c2b3c] hover:border-[#3e484f]'
                        : 'bg-white border-[#cbd5e1] text-slate-600 hover:text-slate-900 hover:bg-[#f8fafc]'
                  }`}
                >
                  {continent === 'All' ? '🌐 All Continents' : continent}
                </button>
              );
            })}
          </div>

          {/* Country Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredCountries.map((country) => {
              const defaultOffset = country.timezones[0].offset;
              const ianaTz = getIanaTimezone(country.name, country.continent, country.capital, defaultOffset);
              
              // Get live timezone values from Intl database
              const targetOffset = getTimezoneOffset(ianaTz, liveTime);
              const istOffset = getTimezoneOffset('Asia/Kolkata', liveTime); // usually 5.5

              const isLocalBusiness = isBusinessHours(liveTime, ianaTz);
              const differenceStr = getTimeDifferenceString(targetOffset, istOffset);

              return (
                <div
                  id={`country-card-${country.name.replace(/\s+/g, '-').toLowerCase()}`}
                  key={country.name}
                  onClick={() => setActiveCountry(country)}
                  className={`rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden border ${
                    isSpace
                      ? 'bg-[#0d1c2d] border-[#273647] hover:border-[#3e484f] hover:bg-[#122131]/80'
                      : 'bg-white border-[#e2e8f0] hover:border-slate-300 hover:bg-[#f8fafc]/50'
                  }`}
                >
                  {/* Decorative Subtle Line Accent */}
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    isSpace ? 'from-[#8ed5ff]' : 'from-blue-500'
                  }`}></div>

                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl filter drop-shadow-sm select-none" role="img" aria-label={country.name}>
                          {country.flag}
                        </span>
                        <div>
                          <h3 className={`font-bold transition-colors line-clamp-1 ${
                            isSpace 
                              ? 'text-white group-hover:text-[#8ed5ff]' 
                              : 'text-slate-800 group-hover:text-blue-600'
                          }`}>
                            {country.name}
                          </h3>
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider ${
                            isSpace ? 'text-[#bec6e0]' : 'text-slate-400'
                          }`}>
                            {country.continent}
                          </span>
                        </div>
                      </div>

                      {/* Time pill */}
                      <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border ${
                        isSpace
                          ? 'bg-[#122131] border-[#273647] text-white'
                          : 'bg-[#f1f5f9] border-[#cbd5e1] text-blue-600'
                      }`}>
                        {formatShortTimeString(liveTime, ianaTz)}
                      </span>
                    </div>

                    {/* Meta Facts Row */}
                    <div className={`grid grid-cols-3 gap-1.5 p-2.5 rounded-lg text-[11px] border ${
                      isSpace
                        ? 'bg-[#122131]/40 border-[#273647]/50 text-[#bec6e0]'
                        : 'bg-[#f8fafc] border-[#e2e8f0] text-slate-500'
                    }`}>
                      <div className="truncate">
                        <span className={`block text-[9px] font-bold uppercase ${
                          isSpace ? 'text-[#bec6e0]/60' : 'text-slate-400'
                        }`}>Capital</span>
                        <span className={`font-semibold ${isSpace ? 'text-white' : 'text-slate-800'}`}>{country.capital}</span>
                      </div>
                      <div className="truncate">
                        <span className={`block text-[9px] font-bold uppercase ${
                          isSpace ? 'text-[#bec6e0]/60' : 'text-slate-400'
                        }`}>Currency</span>
                        <span className={`font-semibold ${isSpace ? 'text-white' : 'text-slate-800'}`}>{country.currencyCode}</span>
                      </div>
                      <div className="truncate">
                        <span className={`block text-[9px] font-bold uppercase ${
                          isSpace ? 'text-[#bec6e0]/60' : 'text-slate-400'
                        }`}>Dial Code</span>
                        <span className={`font-semibold ${isSpace ? 'text-white' : 'text-slate-800'}`}>{country.dialCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Offset & Business Hours Status Badge */}
                  <div className={`mt-4 pt-3.5 border-t flex items-center justify-between gap-2 text-xs ${
                    isSpace ? 'border-[#273647] text-[#bec6e0]' : 'border-slate-100 text-slate-500'
                  }`}>
                    <span className="font-medium truncate">
                      {differenceStr}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      isSpace 
                        ? isLocalBusiness 
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                          : 'bg-[#122131] border-[#273647] text-[#bec6e0]'
                        : isLocalBusiness
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isLocalBusiness 
                          ? isSpace ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500 animate-pulse' 
                          : isSpace ? 'bg-[#bec6e0]' : 'bg-slate-400'
                      }`}></span>
                      {isLocalBusiness ? 'Active Hours' : 'Closed'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredCountries.length === 0 && (
              <div className={`col-span-full py-16 text-center text-sm border-2 border-dashed rounded-xl space-y-2 ${
                isSpace 
                  ? 'border-[#273647] text-[#bec6e0]' 
                  : 'border-slate-200 text-slate-500'
              }`}>
                <Globe className={`w-8 h-8 mx-auto animate-spin ${isSpace ? 'text-[#bec6e0]/40' : 'text-slate-300'}`} />
                <p className={`font-semibold ${isSpace ? 'text-white' : 'text-slate-800'}`}>No countries matched your query</p>
                <p className={`text-xs ${isSpace ? 'text-[#bec6e0]/60' : 'text-slate-400'}`}>Try adjusting your continent filters or type another keyword.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Area */}
      <footer className={`py-8 px-6 text-center text-xs mt-auto border-t transition-colors duration-300 ${
        isSpace 
          ? 'border-[#1c2b3c] bg-[#051424] text-[#bec6e0]' 
          : 'border-slate-200 bg-white text-slate-500 shadow-inner'
      }`}>
        <div className="max-w-7xl mx-auto space-y-2">
          <p className={`font-bold tracking-wide transition-colors duration-300 ${
            isSpace ? 'text-[#8ed5ff]' : 'text-blue-600'
          }`}>
            ChronoSync Global Sync Dashboard • {isSpace ? 'Dark Blue Space' : 'Solar Light'} Theme
          </p>
          <p className={`text-[11px] leading-relaxed transition-colors duration-300 ${
            isSpace ? 'text-[#bec6e0]/60' : 'text-slate-400'
          }`}>
            Trace 195 nations globally and calculate custom offsets relative to Indian Standard Time (IST). All seasonal daylight saving shifts are automatically computed dynamically using the IANA Database.
          </p>
        </div>
      </footer>

      {/* Selected Country Dossier Modal */}
      <AnimatePresence>
        {activeCountry && (() => {
          const defaultOffset = activeCountry.timezones[0].offset;
          const ianaTz = getIanaTimezone(activeCountry.name, activeCountry.continent, activeCountry.capital, defaultOffset);
          
          const targetOffset = getTimezoneOffset(ianaTz, liveTime);
          const istOffset = getTimezoneOffset('Asia/Kolkata', liveTime);

          const localTimeStr = formatTimeString(liveTime, ianaTz);
          const istTimeStr = formatTimeString(liveTime, 'Asia/Kolkata');
          
          const localDateStr = formatFullDate(liveTime, ianaTz);
          const istDateStr = formatFullDate(liveTime, 'Asia/Kolkata');

          const isLocalBusiness = isBusinessHours(liveTime, ianaTz);
          const differenceStr = getTimeDifferenceString(targetOffset, istOffset);
          
          // Dynamic greeting calculation
          const hourStr = new Intl.DateTimeFormat('en-US', {
            timeZone: ianaTz,
            hour: 'numeric',
            hour12: false
          }).format(liveTime);
          const hours = parseInt(hourStr, 10);
          
          const greeting = hours >= 5 && hours < 12 
            ? 'Good morning' 
            : hours >= 12 && hours < 17 
            ? 'Good afternoon' 
            : hours >= 17 && hours < 22 
            ? 'Good evening' 
            : 'Good night';

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
              onClick={() => setActiveCountry(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className={`rounded-2xl max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border overflow-hidden transition-colors duration-300 ${
                  isSpace 
                    ? 'bg-[#122131] border-[#273647]' 
                    : 'bg-white border-[#e2e8f0]'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header Banner */}
                <div className={`relative p-6 border-b flex items-start justify-between shrink-0 transition-colors duration-300 ${
                  isSpace 
                    ? 'bg-[#0d1c2d] border-[#1c2b3c]' 
                    : 'bg-[#f8fafc] border-[#e2e8f0]'
                }`}>
                  <div className="flex items-center gap-3.5">
                    <span className="text-4xl filter drop-shadow-sm select-none" role="img" aria-label={activeCountry.name}>
                      {activeCountry.flag}
                    </span>
                    <div>
                      <h3 className={`text-xl font-bold transition-colors duration-300 ${isSpace ? 'text-white' : 'text-slate-800'}`}>
                        {activeCountry.name}
                      </h3>
                      <p className={`text-xs font-semibold uppercase tracking-widest mt-0.5 transition-colors duration-300 ${
                        isSpace ? 'text-[#bec6e0]' : 'text-slate-400'
                      }`}>
                        {activeCountry.continent} • {ianaTz}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveCountry(null)}
                    className={`p-1.5 rounded-full transition-colors duration-300 ${
                      isSpace 
                        ? 'hover:bg-[#1c2b3c] text-[#bec6e0] hover:text-white' 
                        : 'hover:bg-slate-100 text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                  {/* Detailed Description */}
                  <p className={`text-sm leading-relaxed border p-4 rounded-xl italic transition-colors duration-300 ${
                    isSpace 
                      ? 'bg-[#0d1c2d] border-[#1c2b3c] text-[#bec6e0]' 
                      : 'bg-[#f8fafc] border-[#e2e8f0] text-slate-600'
                  }`}>
                    "{activeCountry.description}"
                  </p>

                  {/* Dual Clocks Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Selected Country clock */}
                    <div className={`p-4 rounded-xl border shadow-inner flex flex-col justify-between h-32 transition-colors duration-300 ${
                      isSpace 
                        ? 'border-[#273647] bg-[#0d1c2d]' 
                        : 'border-[#e2e8f0] bg-[#f8fafc]'
                    }`}>
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block transition-colors duration-300 ${
                          isSpace ? 'text-[#bec6e0]' : 'text-slate-400'
                        }`}>Local Time (Database standard)</span>
                        <span className={`text-2xl font-mono font-bold block mt-1 transition-colors duration-300 ${
                          isSpace ? 'text-white' : 'text-slate-800'
                        }`}>
                          {localTimeStr}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className={`transition-colors duration-300 ${isSpace ? 'text-[#bec6e0]' : 'text-slate-500'}`}>{localDateStr}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors duration-300 ${
                          isSpace 
                            ? isLocalBusiness 
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                              : 'bg-[#122131] border-[#273647] text-[#bec6e0]'
                            : isLocalBusiness
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                          {isLocalBusiness ? 'Open' : 'Off-Hours'}
                        </span>
                      </div>
                    </div>

                    {/* India Base clock */}
                    <div className={`p-4 rounded-xl border shadow-inner flex flex-col justify-between h-32 transition-colors duration-300 ${
                      isSpace 
                        ? 'border-[#38bdf8]/30 bg-[#38bdf8]/5' 
                        : 'border-blue-200 bg-blue-50/50'
                    }`}>
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block transition-colors duration-300 ${
                          isSpace ? 'text-[#8ed5ff]' : 'text-blue-600'
                        }`}>India Base Time (IST)</span>
                        <span className={`text-2xl font-mono font-bold block mt-1 transition-colors duration-300 ${
                          isSpace ? 'text-[#8ed5ff]' : 'text-blue-600'
                        }`}>
                          {istTimeStr}
                        </span>
                      </div>
                      <div className={`text-xs font-semibold transition-colors duration-300 ${
                        isSpace ? 'text-[#8ed5ff]' : 'text-blue-600'
                      }`}>
                        {istDateStr}
                      </div>
                    </div>
                  </div>

                  {/* Overlap & Status Banner */}
                  <div className={`border rounded-xl p-4 flex items-center justify-between text-xs gap-4 transition-colors duration-300 ${
                    isSpace 
                      ? 'bg-[#0d1c2d] border-[#273647] text-[#bec6e0]' 
                      : 'bg-[#f8fafc] border-[#e2e8f0] text-slate-600'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Info className={`w-4 h-4 shrink-0 transition-colors duration-300 ${isSpace ? 'text-[#8ed5ff]' : 'text-blue-500'}`} />
                      <div>
                        <span className={`font-semibold transition-colors duration-300 ${isSpace ? 'text-white' : 'text-slate-800'}`}>Database Offset:</span> {differenceStr} (UTC{targetOffset >= 0 ? `+${targetOffset}` : targetOffset})
                      </div>
                    </div>
                    <span className={`text-[10px] border font-bold px-2 py-0.5 rounded uppercase shrink-0 transition-colors duration-300 ${
                      isSpace 
                        ? 'bg-[#122131] border-[#273647] text-[#bec6e0]' 
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      {greeting} in {activeCountry.name}
                    </span>
                  </div>

                  {/* Dossier Facts Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className={`border p-3.5 rounded-xl space-y-1 transition-colors duration-300 ${
                      isSpace ? 'bg-[#0d1c2d] border-[#273647]' : 'bg-[#f8fafc] border-[#e2e8f0]'
                    }`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                        isSpace ? 'text-[#bec6e0]' : 'text-slate-400'
                      }`}>
                        <MapPin className={`w-3.5 h-3.5 transition-colors duration-300 ${isSpace ? 'text-[#8ed5ff]' : 'text-blue-500'}`} /> Capital
                      </div>
                      <div className={`text-sm font-semibold transition-colors duration-300 ${isSpace ? 'text-white' : 'text-slate-800'}`}>{activeCountry.capital}</div>
                    </div>

                    <div className={`border p-3.5 rounded-xl space-y-1 transition-colors duration-300 ${
                      isSpace ? 'bg-[#0d1c2d] border-[#273647]' : 'bg-[#f8fafc] border-[#e2e8f0]'
                    }`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                        isSpace ? 'text-[#bec6e0]' : 'text-slate-400'
                      }`}>
                        <DollarSign className={`w-3.5 h-3.5 transition-colors duration-300 ${isSpace ? 'text-[#8ed5ff]' : 'text-blue-500'}`} /> Currency
                      </div>
                      <div className={`text-sm font-semibold transition-colors duration-300 ${isSpace ? 'text-white' : 'text-slate-800'}`}>
                        {activeCountry.currency} ({activeCountry.currencyCode})
                      </div>
                    </div>

                    <div className={`border p-3.5 rounded-xl space-y-1 transition-colors duration-300 ${
                      isSpace ? 'bg-[#0d1c2d] border-[#273647]' : 'bg-[#f8fafc] border-[#e2e8f0]'
                    }`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                        isSpace ? 'text-[#bec6e0]' : 'text-slate-400'
                      }`}>
                        <Phone className={`w-3.5 h-3.5 transition-colors duration-300 ${isSpace ? 'text-[#8ed5ff]' : 'text-blue-500'}`} /> Dialing Code
                      </div>
                      <div className={`text-sm font-semibold transition-colors duration-300 ${isSpace ? 'text-white' : 'text-slate-800'}`}>{activeCountry.dialCode}</div>
                    </div>

                    <div className={`border p-3.5 rounded-xl space-y-1 transition-colors duration-300 ${
                      isSpace ? 'bg-[#0d1c2d] border-[#273647]' : 'bg-[#f8fafc] border-[#e2e8f0]'
                    }`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                        isSpace ? 'text-[#bec6e0]' : 'text-slate-400'
                      }`}>
                        <Briefcase className={`w-3.5 h-3.5 transition-colors duration-300 ${isSpace ? 'text-[#8ed5ff]' : 'text-blue-500'}`} /> Continent
                      </div>
                      <div className={`text-sm font-semibold transition-colors duration-300 ${isSpace ? 'text-white' : 'text-slate-800'}`}>{activeCountry.continent}</div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className={`p-4 border-t flex justify-end shrink-0 transition-colors duration-300 ${
                  isSpace ? 'bg-[#0d1c2d] border-[#1c2b3c]' : 'bg-[#f8fafc] border-[#e2e8f0]'
                }`}>
                  <button
                    onClick={() => setActiveCountry(null)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors duration-300 ${
                      isSpace 
                        ? 'bg-[#1c2b3c] hover:bg-[#273647] text-white' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Close Dossier
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
