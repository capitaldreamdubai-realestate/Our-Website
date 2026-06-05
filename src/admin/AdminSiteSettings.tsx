import { Navigate } from 'react-router-dom'

/** Legacy route — integrations are temporarily unavailable. */
export function AdminSiteSettings() {
  return <Navigate to="/admin" replace />
}
