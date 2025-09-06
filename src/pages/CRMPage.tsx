/* TypeScript */
import { EnhancedCRMPage } from './EnhancedCRMPage'

/**
 * CRMPage now delegates to the single consolidated EnhancedCRMPage implementation.
 * This prevents duplicate CRM implementations while preserving existing imports.
 */
export const CRMPage = EnhancedCRMPage
export default CRMPage
