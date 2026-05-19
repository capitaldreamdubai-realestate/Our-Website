import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from '../components/Footer'
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

export function SiteLayout() {
  return (
    <>
      <ScrollToTopOnNavigate />
      <Noise patternAlpha={12} patternRefreshInterval={3} />
      <div className="relative z-10">
        <Navbar />
        <PageFrame>
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
