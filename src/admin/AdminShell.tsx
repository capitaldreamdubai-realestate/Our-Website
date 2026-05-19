import {
  Image,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  Newspaper,
  HelpCircle,
  Plug,
  Shield,
  Sparkles,
  Users,
  MessageSquare,
  Megaphone,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { getSupabase } from '@/integrations/supabase/client'
import {
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_BRAND_SURFACE,
  DEFAULT_CARD_RADIUS,
  INTEGRATION_KEYS,
} from '@/lib/cms/integrationSettingsKeys'
import { AdminDropdownPortalHost } from './AdminDropdownPortalContext'
import { adminNavActive, adminNavInactive } from './adminClassNames'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  to: string
  label: string
  end?: boolean
  icon: LucideIcon
}
type AdminRole = 'owner' | 'admin' | 'editor' | 'viewer'

const nav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', end: true, icon: LayoutGrid },
  { to: '/admin/properties', label: 'Properties', icon: LayoutGrid },
  { to: '/admin/articles', label: 'Articles', icon: Newspaper },
  { to: '/admin/faqs', label: 'FAQs', icon: HelpCircle },
  { to: '/admin/testimonials', label: 'Testimonials', icon: MessageSquare },
  { to: '/admin/experiences', label: 'Experiences', icon: Sparkles },
  { to: '/admin/media', label: 'Media library', icon: Image },
  { to: '/admin/submissions', label: 'Form submissions', icon: Inbox },
  { to: '/admin/salespeople', label: 'Sales team', icon: Users },
  { to: '/admin/users', label: 'User management', icon: Shield },
  { to: '/admin/marketing', label: 'Marketing', icon: Newspaper },
  { to: '/admin/campaign-popups', label: 'Campaign popups', icon: Megaphone },
  { to: '/admin/integrations', label: 'Integrations', icon: Plug },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const { signOut, session } = useAdminAuth()
  const location = useLocation()
  const mainScrollRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [mainScrollable, setMainScrollable] = useState(false)
  const [open, setOpen] = useState(false)
  const [portalStyle, setPortalStyle] = useState<CSSProperties>(
    () =>
      ({
        '--admin-primary': DEFAULT_BRAND_PRIMARY,
        '--admin-surface': DEFAULT_BRAND_SURFACE,
        '--admin-radius-lg': `${DEFAULT_CARD_RADIUS}px`,
      }) as CSSProperties,
  )
  const [glassPanels, setGlassPanels] = useState(false)
  const [currentRole, setCurrentRole] = useState<AdminRole | null>(null)

  const loadBrand = useCallback(async () => {
    const sb = getSupabase()
    if (!sb || !session) return
    const { data } = await sb.from('site_settings').select('key, value')
    const m = new Map((data ?? []).map((r) => [r.key, r.value]))
    const primary =
      m.get(INTEGRATION_KEYS.brandPrimaryHex)?.trim() || DEFAULT_BRAND_PRIMARY
    const surface =
      m.get(INTEGRATION_KEYS.brandSurfaceHex)?.trim() || DEFAULT_BRAND_SURFACE
    const radius =
      m.get(INTEGRATION_KEYS.brandCardRadiusPx)?.trim() || DEFAULT_CARD_RADIUS
    setPortalStyle({
      '--admin-primary': primary,
      '--admin-surface': surface,
      '--admin-radius-lg': `${radius}px`,
    } as CSSProperties)
    setGlassPanels((m.get(INTEGRATION_KEYS.adminGlassPanels) ?? '0') === '1')

    const email = (session.user.email ?? '').trim().toLowerCase()
    const { data: roleRow } = await sb
      .from('admin_users')
      .select('role')
      .or(`auth_user_id.eq.${session.user.id},email.eq.${email}`)
      .limit(1)
      .maybeSingle()
    setCurrentRole((roleRow?.role as AdminRole | undefined) ?? null)
  }, [session])

  const visibleNav = useMemo(() => {
    if (currentRole !== 'editor') return nav
    return nav.filter((item) => item.to !== '/admin/users' && item.to !== '/admin/integrations')
  }, [currentRole])

  useEffect(() => {
    void loadBrand()
  }, [loadBrand])

  useEffect(() => {
    const fn = () => void loadBrand()
    window.addEventListener('capitaldream-admin-brand-updated', fn)
    return () => window.removeEventListener('capitaldream-admin-brand-updated', fn)
  }, [loadBrand])

  const updateMainScrollProgress = useCallback(() => {
    const el = mainScrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const maxScroll = scrollHeight - clientHeight
    if (maxScroll <= 0) {
      setMainScrollable(false)
      setScrollProgress(0)
      return
    }
    setMainScrollable(true)
    setScrollProgress(Math.min(1, Math.max(0, scrollTop / maxScroll)))
  }, [])

  useEffect(() => {
    const main = mainScrollRef.current
    const inner = mainContentRef.current
    if (!main) return
    updateMainScrollProgress()
    main.addEventListener('scroll', updateMainScrollProgress, { passive: true })
    const ro = new ResizeObserver(() => {
      updateMainScrollProgress()
    })
    ro.observe(main)
    if (inner) ro.observe(inner)
    return () => {
      main.removeEventListener('scroll', updateMainScrollProgress)
      ro.disconnect()
    }
  }, [location.pathname, updateMainScrollProgress])

  const linkClass =
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition md:py-2'

  return (
    <div
      className={`admin-portal flex h-svh min-h-0 flex-col overflow-hidden text-ink ${glassPanels ? 'admin-portal--glass' : ''}`}
      style={{
        ...portalStyle,
        backgroundColor: 'var(--admin-surface)',
      }}
    >
      <AdminDropdownPortalHost>
        <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <aside
          className={`admin-aside fixed inset-y-0 left-0 z-50 flex w-[min(88vw,280px)] flex-col border-r border-ink/10 p-4 shadow-xl transition-transform duration-200 md:relative md:inset-auto md:z-0 md:h-full md:w-60 md:shrink-0 md:translate-x-0 md:shadow-none ${
            open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } ${glassPanels ? 'bg-white/75 backdrop-blur-xl' : 'bg-white'}`}
        >
          <div className="mb-6 flex items-center justify-between gap-2">
            <Link
              to="/admin"
              className="font-display text-lg font-semibold tracking-tight text-[var(--admin-primary)]"
            >
              Capital Dream CMS
            </Link>
            <button
              type="button"
              className="rounded-full p-2 text-ink/60 md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {visibleNav.map(({ to, label, end, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `${linkClass} ${isActive ? adminNavActive : adminNavInactive}`
                }
              >
                <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 space-y-2 border-t border-ink/10 pt-4">
            <Link
              to="/"
              className="block rounded-lg px-3 py-2 text-sm text-ink/65 transition hover:bg-ink/5"
            >
              View public site
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink/65 transition hover:bg-red-50 hover:text-red-800"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </div>
        </aside>

        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm md:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className={`admin-header z-30 flex shrink-0 flex-col border-b border-ink/10 backdrop-blur-md ${
              glassPanels ? 'bg-white/70' : 'bg-[var(--admin-surface)]/95'
            }`}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-4">
              <button
                type="button"
                className="rounded-full border border-ink/10 bg-white p-2.5 shadow-sm md:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-5 text-ink" />
              </button>
              <p className="hidden text-xs font-medium uppercase tracking-[0.2em] text-ink/45 md:block">
                Content management
              </p>
              <div className="ml-auto text-right">
                <p className="text-[0.6875rem] font-medium text-ink/50 md:text-xs">
                  Signed in
                </p>
              </div>
            </div>
            <div
              className="h-0.5 w-full shrink-0 bg-ink/10"
              role={mainScrollable ? 'progressbar' : 'none'}
              aria-hidden={!mainScrollable}
              {...(mainScrollable
                ? ({
                    'aria-label': 'Main content scroll position',
                    'aria-valuemin': 0,
                    'aria-valuemax': 100,
                    'aria-valuenow': Math.round(scrollProgress * 100),
                  } as const)
                : {})}
            >
              <div
                className="h-full bg-[var(--admin-primary)]"
                style={{ width: `${scrollProgress * 100}%` }}
              />
            </div>
          </header>
          <div
            ref={mainScrollRef}
            className="admin-main-scroll flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 py-5 md:px-8 md:py-8"
          >
            <div ref={mainContentRef}>{children}</div>
          </div>
        </div>
      </div>
      </AdminDropdownPortalHost>
    </div>
  )
}
