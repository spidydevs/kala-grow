/* TypeScript */
import { UnifiedFinanceHub } from './UnifiedFinanceHub'

/**
 * EditInvoicePage now delegates to the consolidated UnifiedFinanceHub (Invoices tab).
 * This prevents duplicate edit-invoice implementations while preserving existing imports.
 */
export const EditInvoicePage = UnifiedFinanceHub
export default EditInvoicePage
