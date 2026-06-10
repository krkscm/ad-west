/** Menus hidden from Admin Management → Menu Access toggles (super-admin config only). */
export const ADMIN_MENU_GRANT_EXCLUDED_KEYS = new Set([
  'settings-approval-workflows',
  'settings-approval-workflows-form',
  'ai-chatbot',
]);

export function isAdminMenuGrantSelectable(menuKey: string): boolean {
  return !ADMIN_MENU_GRANT_EXCLUDED_KEYS.has(menuKey);
}
