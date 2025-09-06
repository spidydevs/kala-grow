/* TypeScript */
import { DashboardPage } from './DashboardPage'

/**
 * ConversationalDashboard now delegates to the primary DashboardPage implementation.
 * Keeps existing imports working while removing a duplicate page implementation.
 */
export const ConversationalDashboard = DashboardPage
export default ConversationalDashboard
