/** Email that is allowed to manage PUMWI Exhibitions (create, edit, delete). */
export const EXHIBITION_ADMIN_EMAIL = 'taewan0819g@gmail.com'

export function isExhibitionAdminEmail(
  email: string | null | undefined
): boolean {
  return email === EXHIBITION_ADMIN_EMAIL
}
