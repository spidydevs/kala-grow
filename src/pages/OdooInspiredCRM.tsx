/* TypeScript */
import { EnhancedCRMPage } from './EnhancedCRMPage'

/**
 * OdooInspiredCRM now delegates to the consolidated EnhancedCRMPage
 * to remove duplicate CRM implementations while preserving imports.
 */
export const OdooInspiredCRM = EnhancedCRMPage
export default OdooInspiredCRM
