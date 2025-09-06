/* TypeScript */
import { SystemSettings } from './SystemSettings'

/**
 * SettingsPage now delegates to the single SystemSettings implementation.
 * This reduces duplicated settings pages while preserving existing imports.
 */
export const SettingsPage = SystemSettings
export default SettingsPage
