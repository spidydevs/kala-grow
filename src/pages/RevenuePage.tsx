/* TypeScript */
import { UnifiedFinanceHub } from './UnifiedFinanceHub'

/**
 * RevenuePage now delegates to the consolidated UnifiedFinanceHub implementation.
 * Removes duplicated revenue page while preserving imports.
 */
export const RevenuePage = UnifiedFinanceHub
export default RevenuePage
