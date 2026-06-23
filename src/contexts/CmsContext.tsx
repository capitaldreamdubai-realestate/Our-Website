import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import type { Property } from '@/components/PropertyCard'
import type { Article } from '@/data/articles'
import type { ConciergeService } from '@/data/conciergeServices'
import { FULL_BLEED_YOUTUBE_VIDEO_ID } from '@/config/fullBleedYoutube'
import { articles as staticArticles } from '@/data/articles'
import { conciergeServices as staticConcierge } from '@/data/conciergeServices'
import { heroNeighbourhoods as staticHero } from '@/data/heroNeighbourhoods'
import {
  bannerVillaDusk,
  catalogProperties as staticCatalog,
  featuredProperties as staticFeatured,
  moreHomes as staticMore,
} from '@/data/properties'
import { getSupabase, isSupabaseConfigured } from '@/integrations/supabase/client'
import type { ArticleDetailFromDb } from '@/lib/cms/mapArticle'
import type { FaqSection } from '@/lib/cms/mapFaq'
import {
  FALLBACK_UAE_EMIRATE_NAMES,
  loadCmsSnapshot,
  staticSalespeopleListForSite,
  type HeroNeighbourhoodItem,
  type MarketingPage,
  type DeveloperWithListings,
  type PublicDeveloper,
  type PublicSalesperson,
  type PublicTestimonial,
  type SiteSettings,
} from '@/lib/cms/loadCmsSnapshot'
import type { PublicOffplanProject } from '@/lib/cms/mapOffplanProject'
import type { OffplanLaunchStatus } from '@/lib/offplanLaunchStatus'
import { DEFAULT_FLOATING_SOCIAL_LINKS } from '@/lib/socialFloatingLinks'

type CmsMode = 'static' | 'live'

type CmsContextValue = {
  mode: CmsMode
  loading: boolean
  cmsEmpty: boolean
  catalogProperties: Property[]
  featuredProperties: Property[]
  moreHomes: Property[]
  featuredPropertyIds: Set<string>
  articles: Article[]
  articleDetailsBySlug: Record<string, ArticleDetailFromDb>
  heroNeighbourhoods: HeroNeighbourhoodItem[]
  /** Canonical emirate names from `uae_emirates` (or fallback) for filter dropdowns. */
  uaeEmirateNames: string[]
  marketingBySlug: Record<string, MarketingPage>
  siteSettings: SiteSettings
  salespeopleById: Record<string, PublicSalesperson>
  salespeopleList: PublicSalesperson[]
  experiences: ConciergeService[]
  faqSections: FaqSection[]
  testimonials: PublicTestimonial[]
  propertyDevelopersList: PublicDeveloper[]
  developersBySlug: Record<string, PublicDeveloper>
  developersWithListings: DeveloperWithListings[]
  offplanProjects: PublicOffplanProject[]
  offplanProjectsBySlug: Record<string, PublicOffplanProject>
  offplanProjectsByStatus: Record<OffplanLaunchStatus, PublicOffplanProject[]>
  offplanProjectsByDeveloperId: Record<string, PublicOffplanProject[]>
  refetch: () => Promise<void>
}

const CmsContext = createContext<CmsContextValue | null>(null)

function initialCatalog(): Property[] {
  return isSupabaseConfigured ? [] : staticCatalog
}

function initialFeatured(): Property[] {
  return isSupabaseConfigured ? [] : staticFeatured
}

function initialMoreHomes(): Property[] {
  return isSupabaseConfigured ? [] : staticMore
}

function initialArticles(): Article[] {
  return isSupabaseConfigured ? [] : staticArticles
}

function initialHero(): HeroNeighbourhoodItem[] {
  return isSupabaseConfigured
    ? []
    : staticHero.map((h) => ({ id: h.id, label: h.label, to: h.to }))
}

export function CmsProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const skipLoad = pathname.startsWith('/admin')

  const [mode, setMode] = useState<CmsMode>('static')
  const [loading, setLoading] = useState(!skipLoad && isSupabaseConfigured)
  const [cmsEmpty, setCmsEmpty] = useState(false)
  const [catalogProperties, setCatalogProperties] =
    useState<Property[]>(initialCatalog)
  const [featuredProperties, setFeaturedProperties] =
    useState<Property[]>(initialFeatured)
  const [moreHomes, setMoreHomes] = useState<Property[]>(initialMoreHomes)
  const [articles, setArticles] = useState<Article[]>(initialArticles)
  const [articleDetailsBySlug, setArticleDetailsBySlug] = useState<
    Record<string, ArticleDetailFromDb>
  >({})
  const [heroNeighbourhoods, setHeroNeighbourhoods] =
    useState<HeroNeighbourhoodItem[]>(initialHero)
  const [uaeEmirateNames, setUaeEmirateNames] =
    useState<string[]>(FALLBACK_UAE_EMIRATE_NAMES)
  const [marketingBySlug, setMarketingBySlug] = useState<
    Record<string, MarketingPage>
  >({})
  const [salespeopleById, setSalespeopleById] = useState<
    Record<string, PublicSalesperson>
  >({})
  const [salespeopleList, setSalespeopleList] = useState<PublicSalesperson[]>(
    () => (isSupabaseConfigured ? [] : staticSalespeopleListForSite()),
  )
  const [experiences, setExperiences] = useState<ConciergeService[]>(() =>
    isSupabaseConfigured ? [] : staticConcierge,
  )
  const [faqSections, setFaqSections] = useState<FaqSection[]>([])
  const [testimonials, setTestimonials] = useState<PublicTestimonial[]>([])
  const [propertyDevelopersList, setPropertyDevelopersList] = useState<PublicDeveloper[]>(
    [],
  )
  const [developersBySlug, setDevelopersBySlug] = useState<
    Record<string, PublicDeveloper>
  >({})
  const [developersWithListings, setDevelopersWithListings] = useState<
    DeveloperWithListings[]
  >([])
  const [offplanProjects, setOffplanProjects] = useState<PublicOffplanProject[]>([])
  const [offplanProjectsBySlug, setOffplanProjectsBySlug] = useState<
    Record<string, PublicOffplanProject>
  >({})
  const [offplanProjectsByStatus, setOffplanProjectsByStatus] = useState<
    Record<OffplanLaunchStatus, PublicOffplanProject[]>
  >({ new: [], existing: [], upcoming: [] })
  const [offplanProjectsByDeveloperId, setOffplanProjectsByDeveloperId] = useState<
    Record<string, PublicOffplanProject[]>
  >({})
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    heroBannerUrl: isSupabaseConfigured ? null : bannerVillaDusk,
    fullBleedYoutubeId: FULL_BLEED_YOUTUBE_VIDEO_ID,
    floatingSocialLinks: DEFAULT_FLOATING_SOCIAL_LINKS,
  })

  const fetchLive = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) {
      setMode('static')
      setCmsEmpty(false)
      setLoading(false)
      return
    }
    setLoading(true)
    const snap = await loadCmsSnapshot(supabase)
    if (!snap) {
      if (isSupabaseConfigured) {
        setMode('live')
        setCmsEmpty(true)
        setCatalogProperties([])
        setFeaturedProperties([])
        setMoreHomes([])
        setArticles([])
        setArticleDetailsBySlug({})
        setHeroNeighbourhoods([])
        setUaeEmirateNames(FALLBACK_UAE_EMIRATE_NAMES)
        setMarketingBySlug({})
        setSalespeopleById({})
        setSalespeopleList([])
        setExperiences([])
        setFaqSections([])
        setTestimonials([])
        setPropertyDevelopersList([])
        setDevelopersBySlug({})
        setDevelopersWithListings([])
        setOffplanProjects([])
        setOffplanProjectsBySlug({})
        setOffplanProjectsByStatus({ new: [], existing: [], upcoming: [] })
        setOffplanProjectsByDeveloperId({})
        setSiteSettings({
          heroBannerUrl: null,
          fullBleedYoutubeId: FULL_BLEED_YOUTUBE_VIDEO_ID,
          floatingSocialLinks: DEFAULT_FLOATING_SOCIAL_LINKS,
        })
      } else {
        setMode('static')
        setCmsEmpty(false)
        setCatalogProperties(staticCatalog)
        setFeaturedProperties(staticFeatured)
        setMoreHomes(staticMore)
        setArticles(staticArticles)
        setArticleDetailsBySlug({})
        setHeroNeighbourhoods(
          staticHero.map((h) => ({ id: h.id, label: h.label, to: h.to })),
        )
        setUaeEmirateNames(FALLBACK_UAE_EMIRATE_NAMES)
        setMarketingBySlug({})
        setSalespeopleById({})
        setSalespeopleList(staticSalespeopleListForSite())
        setExperiences(staticConcierge)
        setFaqSections([])
        setTestimonials([])
        setPropertyDevelopersList([])
        setDevelopersBySlug({})
        setDevelopersWithListings([])
        setOffplanProjects([])
        setOffplanProjectsBySlug({})
        setOffplanProjectsByStatus({ new: [], existing: [], upcoming: [] })
        setOffplanProjectsByDeveloperId({})
        setSiteSettings({
          heroBannerUrl: bannerVillaDusk,
          fullBleedYoutubeId: FULL_BLEED_YOUTUBE_VIDEO_ID,
          floatingSocialLinks: DEFAULT_FLOATING_SOCIAL_LINKS,
        })
      }
    } else {
      setMode('live')
      setCmsEmpty(false)
      setCatalogProperties(snap.catalogProperties)
      setFeaturedProperties(snap.featuredProperties)
      setMoreHomes(snap.moreHomes)
      setArticles(snap.articles)
      setArticleDetailsBySlug(snap.articleDetailsBySlug)
      setHeroNeighbourhoods(snap.heroNeighbourhoods)
      setUaeEmirateNames(snap.uaeEmirateNames)
      setMarketingBySlug(snap.marketingBySlug)
      setSalespeopleById(snap.salespeopleById)
      setSalespeopleList(snap.salespeopleList)
      setExperiences(snap.experiences)
      setFaqSections(snap.faqSections)
      setTestimonials(snap.testimonials)
      setPropertyDevelopersList(snap.propertyDevelopersList)
      setDevelopersBySlug(snap.developersBySlug)
      setDevelopersWithListings(snap.developersWithListings)
      setOffplanProjects(snap.offplanProjects)
      setOffplanProjectsBySlug(snap.offplanProjectsBySlug)
      setOffplanProjectsByStatus(snap.offplanProjectsByStatus)
      setOffplanProjectsByDeveloperId(snap.offplanProjectsByDeveloperId)
      setSiteSettings({
        heroBannerUrl:
          snap.siteSettings.heroBannerUrl ?? bannerVillaDusk,
        fullBleedYoutubeId:
          snap.siteSettings.fullBleedYoutubeId ?? FULL_BLEED_YOUTUBE_VIDEO_ID,
          floatingSocialLinks:
            snap.siteSettings.floatingSocialLinks.length > 0
              ? snap.siteSettings.floatingSocialLinks
              : DEFAULT_FLOATING_SOCIAL_LINKS,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (skipLoad || !isSupabaseConfigured) {
      setLoading(false)
      return
    }
    void fetchLive()
  }, [skipLoad, fetchLive])

  const featuredPropertyIds = useMemo(
    () => new Set(featuredProperties.map((p) => p.id)),
    [featuredProperties],
  )

  const value = useMemo<CmsContextValue>(
    () => ({
      mode,
      loading,
      cmsEmpty,
      catalogProperties,
      featuredProperties,
      moreHomes,
      featuredPropertyIds,
      articles,
      articleDetailsBySlug,
      heroNeighbourhoods,
      uaeEmirateNames,
      marketingBySlug,
      siteSettings,
      salespeopleById,
      salespeopleList,
      experiences,
      faqSections,
      testimonials,
      propertyDevelopersList,
      developersBySlug,
      developersWithListings,
      offplanProjects,
      offplanProjectsBySlug,
      offplanProjectsByStatus,
      offplanProjectsByDeveloperId,
      refetch: fetchLive,
    }),
    [
      mode,
      loading,
      cmsEmpty,
      catalogProperties,
      featuredProperties,
      moreHomes,
      featuredPropertyIds,
      articles,
      articleDetailsBySlug,
      heroNeighbourhoods,
      uaeEmirateNames,
      marketingBySlug,
      siteSettings,
      salespeopleById,
      salespeopleList,
      experiences,
      faqSections,
      testimonials,
      propertyDevelopersList,
      developersBySlug,
      developersWithListings,
      offplanProjects,
      offplanProjectsBySlug,
      offplanProjectsByStatus,
      offplanProjectsByDeveloperId,
      fetchLive,
    ],
  )

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>
}

export function useCms(): CmsContextValue {
  const ctx = useContext(CmsContext)
  if (!ctx) {
    throw new Error('useCms must be used within CmsProvider')
  }
  return ctx
}

