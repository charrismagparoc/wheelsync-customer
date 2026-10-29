import { useEffect, useState } from 'react'
import { api } from './api'

// Destinations on the Pardz Car Rental price sheet, in the sheet's order.
export const DESTINATIONS = [
  'CDO',
  'Tagoloan',
  'Villanueva',
  'Jasaan',
  'Balingasag',
  'Salay',
  'Lagonglong',
  'Binuangan',
  'Sugbongcogon',
  'Kinoguitan',
  'Balingoan',
  'Medina',
  'Gingoog',
  'Magsaysay',
  'Carmen',
  'Nasipit',
  'Buenavista',
  'Butuan',
  'Bayugan',
  'San Francisco', // "SAN FRANCE" on the sheet: San Francisco, Agusan del Sur
  'Trento',
  'Surigao City',
  'Siargao',
  'Tandag',
  'Dahilayan Manolo',
  'Malaybalay',
  'Valencia',
  'Maramag',
  'Davao',
  'Gensan',
  'El Salvador',
  'Laguindingan',
  'Initao',
  'Libertad',
  'Manticao',
  'Lugait',
  'Iligan',
  'Marawi',
  'Pagadian',
  'Ipil',
  'Aurora',
  'Zamboanga City',
  'Dipolog',
  'Ozamis',
  'Jimenez',
  'Dapitan',
  'Camiguin', // handwritten below the printed list
]

// Value of the "Custom destination" choice; the customer then types the destination themselves.
export const OTHER_DESTINATION = '__other__'

// The admin manages the live list (Destinations page); the list above is the fallback when it can't be loaded.
export function useDestinations() {
  const [destinations, setDestinations] = useState(DESTINATIONS)
  useEffect(() => {
    let active = true
    api.get('/public/locations')
      .then((rows) => { if (active && rows?.length) setDestinations(rows.map((row) => row.name)) })
      .catch((error) => console.error('Unable to load destinations, using the built-in list:', error.message))
    return () => { active = false }
  }, [])
  return destinations
}
