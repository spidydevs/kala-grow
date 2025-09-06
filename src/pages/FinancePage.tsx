/* TypeScript */
import { UnifiedFinanceHub } from './UnifiedFinanceHub'

/**
 * FinancePage now delegates to the consolidated UnifiedFinanceHub implementation.
 * This removes duplicate finance/invoice implementations while preserving imports.
 */
export const FinancePage = UnifiedFinanceHub
export default FinancePage
