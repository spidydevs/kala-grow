/* TypeScript */
import { AdminManagement } from '@/components/enterprise/AdminManagement'

/**
 * RoleManagement now delegates to the centralized AdminManagement component.
 * This removes duplicate role/admin UIs while preserving existing imports.
 */
export const RoleManagement = AdminManagement
export default RoleManagement
