type PageViewEvent = {
  event: 'page_view'
  page_path: string
  page_title: string
  page_location: string
}

declare global {
  interface Window {
    dataLayer?: Array<PageViewEvent | Record<string, unknown>>
  }
}

/**
 * SPA page views for Google Tag Manager container GTM-NQ2VQZ9C.
 *
 * Do not also paste the gtag.js snippet for G-JJP0H9SXLL. Load analytics
 * only through this container, or each page view is counted twice.
 *
 * In https://tagmanager.google.com for GTM-NQ2VQZ9C:
 * 1. Add a GA4 Configuration tag with Measurement ID G-JJP0H9SXLL.
 * 2. Turn off "Send a page view event when this configuration loads".
 * 3. Add a GA4 Event tag named page_view.
 * 4. Fire that event from a Custom Event trigger whose event name is page_view.
 * 5. Map page_path, page_title, and page_location from the dataLayer onto the event.
 *
 * Search Console: after deploy, submit https://capitaldreamdubai.com/sitemap.xml,
 * then in GA4 Admin → Product links, link property G-JJP0H9SXLL to the
 * capitaldreamdubai.com Search Console property.
 * HTML-tag verification needs the google-site-verification token in index.html.
 * A DNS TXT record in Hostinger verifies the property without a code change.
 */
export function trackPageView(pagePath: string) {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event: 'page_view',
    page_path: pagePath,
    page_title: document.title,
    page_location: window.location.href,
  })
}
