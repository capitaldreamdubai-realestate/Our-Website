import { useEffect, useState } from 'react'
import {
  resolveListingCoordinates,
  type ListingCoordinates,
} from '@/lib/geocodeListingLocation'

export function useListingMapCoords(propertyId: string | undefined): ListingCoordinates | null {
  const [coords, setCoords] = useState<ListingCoordinates | null>(null)

  useEffect(() => {
    if (!propertyId) {
      setCoords(null)
      return
    }
    let cancelled = false
    setCoords(null)
    void resolveListingCoordinates(propertyId).then((next) => {
      if (!cancelled) setCoords(next)
    })
    return () => {
      cancelled = true
    }
  }, [propertyId])

  return coords
}
