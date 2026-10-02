import { useMemo } from 'react'
import type { Property } from '@/components/PropertyCard'
import { useCms } from '@/contexts/CmsContext'
import type { PublicSalesperson } from '@/lib/cms/loadCmsSnapshot'
import { resolvePropertyDetail } from '@/lib/resolvePropertyDetail'

export function usePropertyDetail(paramId: string | undefined): {
  property: Property | null
  salesperson: PublicSalesperson | null
  loading: boolean
} {
  const { mode, catalogProperties, salespeopleById, loading: cmsLoading } =
    useCms()

  return useMemo(() => {
    if (!paramId) {
      return { property: null, salesperson: null, loading: cmsLoading }
    }
    if (mode === 'static') {
      const property = resolvePropertyDetail(paramId)
      const sid = property?.salespersonId
      const salesperson =
        sid && salespeopleById[sid] ? salespeopleById[sid] : null
      return { property, salesperson, loading: cmsLoading }
    }
    const found =
      catalogProperties.find((p) => p.id === paramId) ??
      catalogProperties.find((p) => p.slug === paramId)
    if (!found) {
      return { property: null, salesperson: null, loading: cmsLoading }
    }
    const property = found
    const sid = property.salespersonId
    const salesperson = sid ? (salespeopleById[sid] ?? null) : null
    return { property, salesperson, loading: cmsLoading }
  }, [paramId, mode, catalogProperties, salespeopleById, cmsLoading])
}
