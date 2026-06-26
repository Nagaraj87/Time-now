export interface TimezoneInfo {
  name: string;
  offset: number; // Offset from UTC in hours, can be negative or decimal (e.g., -5, 5.5, 5.75)
  abbr: string;
}

export interface Country {
  name: string;
  continent: 'Africa' | 'Asia' | 'Europe' | 'North America' | 'Oceania' | 'South America';
  flag: string; // Emoji
  capital: string;
  currency: string;
  currencyCode: string;
  currencySymbol: string;
  dialCode: string;
  timezones: TimezoneInfo[];
  description: string;
}
