/** Keys stored in `site_settings` for Integrations / branding engine. */
export const INTEGRATION_KEYS = {
  heroBannerUrl: 'hero_banner_url',
  fullBleedYoutubeId: 'full_bleed_youtube_id',
  brandPrimaryHex: 'brand_primary_hex',
  brandSurfaceHex: 'brand_surface_hex',
  brandCardRadiusPx: 'brand_card_radius_px',
  adminGlassPanels: 'admin_glass_panels',
  /** ISO timestamp written by Edge Function `sync-property-finder` */
  pfLastSyncAt: 'pf_last_sync_at',
  /** JSON summary string from last PF sync */
  pfLastSyncSummary: 'pf_last_sync_summary',
  /** JSON `{ rates, source, rateDate, at }` written daily by Edge Function `refresh-exchange-rates` */
  fxRatesFromAed: 'fx_rates_from_aed',
  /** JSON array for floating social bubble icons */
  floatingSocialLinks: 'floating_social_links',
} as const

export const DEFAULT_BRAND_PRIMARY = '#a67d32'
export const DEFAULT_BRAND_SURFACE = '#f8f3ef'
export const DEFAULT_CARD_RADIUS = '24'
