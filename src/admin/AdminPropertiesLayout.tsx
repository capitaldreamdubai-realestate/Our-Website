import { NavLink, Outlet } from 'react-router-dom'
import { adminNavActive, adminNavInactive } from './adminClassNames'

const subLink =
  'rounded-2xl px-3 py-2 text-xs font-semibold transition md:text-sm'

export function AdminPropertiesLayout() {
  return (
    <div className="space-y-6">
      <nav
        className="flex flex-wrap gap-2 border-b border-ink/10 pb-3"
        aria-label="Properties section"
      >
        <NavLink
          to="/admin/properties/listings"
          className={({ isActive }) =>
            `${subLink} ${isActive ? adminNavActive : adminNavInactive}`
          }
        >
          Listings
        </NavLink>
        <NavLink
          to="/admin/properties/neighbourhoods"
          className={({ isActive }) =>
            `${subLink} ${isActive ? adminNavActive : adminNavInactive}`
          }
        >
          Featured neighbourhoods
        </NavLink>
        <NavLink
          to="/admin/properties/listing-tags"
          className={({ isActive }) =>
            `${subLink} ${isActive ? adminNavActive : adminNavInactive}`
          }
        >
          Listing tags
        </NavLink>
        <NavLink
          to="/admin/properties/property-types"
          className={({ isActive }) =>
            `${subLink} ${isActive ? adminNavActive : adminNavInactive}`
          }
        >
          Property types
        </NavLink>
        <NavLink
          to="/admin/properties/emirates"
          className={({ isActive }) =>
            `${subLink} ${isActive ? adminNavActive : adminNavInactive}`
          }
        >
          Emirates
        </NavLink>
        <NavLink
          to="/admin/properties/offplan-projects"
          className={({ isActive }) =>
            `${subLink} ${isActive ? adminNavActive : adminNavInactive}`
          }
        >
          Off-plan projects
        </NavLink>
        <NavLink
          to="/admin/properties/developers"
          className={({ isActive }) =>
            `${subLink} ${isActive ? adminNavActive : adminNavInactive}`
          }
        >
          Developers
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
