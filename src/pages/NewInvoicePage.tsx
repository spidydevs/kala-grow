/* TypeScript */
import { UnifiedFinanceHub } from './UnifiedFinanceHub'

/**
 * NewInvoicePage delegates to UnifiedFinanceHub (Invoices tab).
 * Keeps existing imports working while removing duplicate invoice creation flows.
 */
export const NewInvoicePage = UnifiedFinanceHub
export default NewInvoicePage
