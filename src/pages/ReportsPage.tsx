/* TypeScript */
import { Navigate } from 'react-router-dom'

/**
 * ReportsPage now redirects to the Finance Hub with the reports tab selected.
 * This prevents duplicate reporting implementations while preserving existing route compatibility.
 * Users accessing /reports will be automatically redirected to /finance with the reports tab active.
 */
export const ReportsPage = () => {
  return <Navigate to="/finance?tab=reports" replace />
}

export default ReportsPage
