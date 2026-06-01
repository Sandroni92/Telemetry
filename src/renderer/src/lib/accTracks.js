/**
 * Database dei circuiti ufficiali di ACC con valori indicativi per GT3.
 *
 * I valori (consumo, tempo sul giro di riferimento, usura gomme) sono stime medie
 * pensate come punto di partenza: l'utente può sovrascriverli con i dati reali
 * provenienti dalla telemetria (vedi override in TrackDatabase).
 *
 *  - fuelPerLap: litri/giro indicativi (GT3, benzina)
 *  - refLapMs:   tempo di riferimento sul giro (ms)
 *  - tyreWear:   usura gomme indicativa per stint -> 'Bassa' | 'Media' | 'Alta'
 *  - lengthKm:   lunghezza tracciato
 */
export const ACC_TRACKS = [
  { slug: 'monza', name: 'Monza', country: '🇮🇹', lengthKm: 5.79, fuelPerLap: 3.15, refLapMs: 108200, tyreWear: 'Bassa' },
  { slug: 'spa', name: 'Spa-Francorchamps', country: '🇧🇪', lengthKm: 7.0, fuelPerLap: 3.4, refLapMs: 138500, tyreWear: 'Media' },
  { slug: 'zandvoort', name: 'Zandvoort', country: '🇳🇱', lengthKm: 4.26, fuelPerLap: 2.7, refLapMs: 96200, tyreWear: 'Alta' },
  { slug: 'brands_hatch', name: 'Brands Hatch', country: '🇬🇧', lengthKm: 3.9, fuelPerLap: 2.6, refLapMs: 84500, tyreWear: 'Alta' },
  { slug: 'misano', name: 'Misano', country: '🇮🇹', lengthKm: 4.23, fuelPerLap: 2.8, refLapMs: 94600, tyreWear: 'Media' },
  { slug: 'paul_ricard', name: 'Paul Ricard', country: '🇫🇷', lengthKm: 5.84, fuelPerLap: 3.1, refLapMs: 113800, tyreWear: 'Media' },
  { slug: 'nurburgring', name: 'Nürburgring GP', country: '🇩🇪', lengthKm: 5.15, fuelPerLap: 3.0, refLapMs: 114700, tyreWear: 'Media' },
  { slug: 'barcelona', name: 'Barcelona', country: '🇪🇸', lengthKm: 4.66, fuelPerLap: 2.9, refLapMs: 105300, tyreWear: 'Alta' },
  { slug: 'hungaroring', name: 'Hungaroring', country: '🇭🇺', lengthKm: 4.38, fuelPerLap: 2.8, refLapMs: 104900, tyreWear: 'Alta' },
  { slug: 'zolder', name: 'Zolder', country: '🇧🇪', lengthKm: 4.01, fuelPerLap: 2.7, refLapMs: 88900, tyreWear: 'Media' },
  { slug: 'silverstone', name: 'Silverstone', country: '🇬🇧', lengthKm: 5.89, fuelPerLap: 3.2, refLapMs: 119400, tyreWear: 'Alta' },
  { slug: 'imola', name: 'Imola', country: '🇮🇹', lengthKm: 4.91, fuelPerLap: 2.9, refLapMs: 102700, tyreWear: 'Media' },
  { slug: 'kyalami', name: 'Kyalami', country: '🇿🇦', lengthKm: 4.52, fuelPerLap: 2.9, refLapMs: 100800, tyreWear: 'Media' },
  { slug: 'suzuka', name: 'Suzuka', country: '🇯🇵', lengthKm: 5.81, fuelPerLap: 3.1, refLapMs: 121300, tyreWear: 'Alta' },
  { slug: 'laguna_seca', name: 'Laguna Seca', country: '🇺🇸', lengthKm: 3.6, fuelPerLap: 2.5, refLapMs: 83400, tyreWear: 'Media' },
  { slug: 'mount_panorama', name: 'Mount Panorama (Bathurst)', country: '🇦🇺', lengthKm: 6.21, fuelPerLap: 3.3, refLapMs: 121800, tyreWear: 'Media' },
  { slug: 'donington', name: 'Donington Park', country: '🇬🇧', lengthKm: 4.02, fuelPerLap: 2.6, refLapMs: 86700, tyreWear: 'Media' },
  { slug: 'oulton_park', name: 'Oulton Park', country: '🇬🇧', lengthKm: 4.31, fuelPerLap: 2.7, refLapMs: 95200, tyreWear: 'Media' },
  { slug: 'snetterton', name: 'Snetterton', country: '🇬🇧', lengthKm: 4.78, fuelPerLap: 2.9, refLapMs: 107500, tyreWear: 'Media' },
  { slug: 'cota', name: 'COTA', country: '🇺🇸', lengthKm: 5.51, fuelPerLap: 3.2, refLapMs: 124600, tyreWear: 'Alta' },
  { slug: 'indianapolis', name: 'Indianapolis', country: '🇺🇸', lengthKm: 4.19, fuelPerLap: 3.0, refLapMs: 96400, tyreWear: 'Media' },
  { slug: 'watkins_glen', name: 'Watkins Glen', country: '🇺🇸', lengthKm: 5.43, fuelPerLap: 3.1, refLapMs: 105800, tyreWear: 'Media' },
  { slug: 'valencia', name: 'Valencia', country: '🇪🇸', lengthKm: 4.0, fuelPerLap: 2.7, refLapMs: 97300, tyreWear: 'Media' },
  { slug: 'red_bull_ring', name: 'Red Bull Ring', country: '🇦🇹', lengthKm: 4.32, fuelPerLap: 2.9, refLapMs: 89600, tyreWear: 'Media' }
]

export const WEATHER_OPTIONS = ['Asciutto', 'Variabile', 'Bagnato', 'Notturno', 'Caldo', 'Freddo']

export function findTrack(slug) {
  return ACC_TRACKS.find((t) => t.slug === slug) || null
}
