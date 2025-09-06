/* TypeScript */
import { EnhancedCRMPage } from './EnhancedCRMPage'

/**
 * OdooLikeCRMDashboard now delegates to the consolidated EnhancedCRMPage
 * to avoid duplicate CRM implementations while preserving imports.
 */
export const OdooLikeCRMDashboard = EnhancedCRMPage
export default OdooLikeCRMDashboard
