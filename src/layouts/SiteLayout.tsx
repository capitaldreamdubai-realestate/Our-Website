import { useEffect, useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { useCms } from '../contexts/CmsContext'
import { trackPageView } from '../lib/analytics/trackPageView'
import { CampaignPopupOverlay } from '../components/CampaignPopupOverlay'
import { CookieConsentBanner } from '../components/CookieConsentBanner'
import { FloatingWhatsappButton } from '../components/FloatingWhatsappButton'
import { Navbar } from '../components/Navbar'
import { Noise } from '../components/Noise'
import { PageFrame } from '../components/PageFrame'
import { PropertyFilterDock } from '../components/PropertyFilterDock'

/**
 * Scrolls to the top on navigation, unless the URL has a #hash (e.g. ads landing on
 * /offplan#enquire). Then it waits for that section to render (CMS data loads async)
 * and scrolls to it.
 */
function ScrollToTopOnNavigate() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const id = decodeURIComponent(hash.replace(/^#/, ''))
    if (!id) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      return
    }
    // The page renders in stages (CMS data, images), which can reset or shift the scroll,
    // so keep re-aligning to the section until it has stayed in place for a few ticks,
    // for at most ~8s, and stop as soon as the visitor scrolls themselves.
    let tries = 0
    let settled = 0
    let found = false
    let timer = 0
    let userMoved = false
    const stop = () => {
      userMoved = true
    }
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchmove', stop, { passive: true })
    window.addEventListener('keydown', stop)
    const seek = () => {
      if (userMoved) return
      const el = document.getElementById(id)
      if (el) {
        found = true
        const offset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
        const delta = el.getBoundingClientRect().top - offset
        if (Math.abs(delta) > 24) {
          // 'instant' bypasses the html { scroll-behavior: smooth } rule, whose animation
          // would restart on every tick and never arrive.
          window.scrollTo({ top: window.scrollY + delta, left: 0, behavior: 'instant' as ScrollBehavior })
          settled = 0
        } else {
          settled += 1
        }
        if (settled >= 12) return
      }
      if (++tries < 80) timer = window.setTimeout(seek, 100)
      else if (!found) window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    seek()
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchmove', stop)
      window.removeEventListener('keydown', stop)
    }
  }, [pathname, hash])
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
        <CookieConsentBanner />
      </div>
    </>
  )
}
