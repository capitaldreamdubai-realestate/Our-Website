import { useEffect, useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { useCms } from '../contexts/CmsContext'
import { trackPageView } from '../lib/analytics/trackPageView'
import { CampaignPopupOverlay } from '../components/CampaignPopupOverlay'
import { FloatingWhatsappButton } from '../components/FloatingWhatsappButton'
import { Navbar } from '../components/Navbar'
import { Noise } from '../components/Noise'
import { PageFrame } from '../components/PageFrame'
import { PropertyFilterDock } from '../components/PropertyFilterDock'

function ScrollToTopOnNavigate() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

function TrackPageViews() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    trackPageView(pathname + search)
  }, [pathname, search])
  return null
}

function MarkPrerenderReady() {
  const { loading } = useCms()
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    if (loading) {
      main.removeAttribute('data-prerender-ready')
      return
    }
    main.setAttribute('data-prerender-ready', 'true')
  }, [loading, pathname])
  return null
}

export function SiteLayout() {
  return (
    <>
      <ScrollToTopOnNavigate />
      <TrackPageViews />
      <MarkPrerenderReady />
      <Noise patternAlpha={12} patternRefreshInterval={3} />
      <div className="relative z-10 flex min-h-svh flex-col">
        <Navbar />
        <PageFrame className="min-h-0 flex-1">
          <Outlet />
        </PageFrame>
        <Footer />
        <PropertyFilterDock />
        <FloatingWhatsappButton />
        <CampaignPopupOverlay />
      </div>
    </>
  )
}
