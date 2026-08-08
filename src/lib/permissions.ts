/**
 * Permessi granulari per la moderazione.
 *
 * Il campo `role` sull'utente distingue artista da organizzatore: è il ruolo
 * di prodotto. Questi permessi sono un asse diverso — chi può moderare, bandire,
 * leggere i log — e vanno tenuti separati perché un artista può essere anche
 * moderatore senza smettere di essere un artista.
 */
export const PERMISSIONS = {
  CONTENT_VIEW: "content_view",
  CONTENT_MODERATE: "content_moderate",
  CONTENT_DELETE: "content_delete",

  USERS_VIEW: "users_view",
  USERS_EDIT: "users_edit",
  USERS_BAN: "users_ban",
  USERS_DELETE: "users_delete",

  EVENTS_MODERATE: "events_moderate",

  ROLES_VIEW: "roles_view",
  ROLES_ASSIGN: "roles_assign",

  SYSTEM_SETTINGS: "system_settings",
  SYSTEM_LOGS: "system_logs",
  SYSTEM_ANALYTICS: "system_analytics",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ADMIN_ROLES = ["NONE", "MODERATOR", "ADMIN", "SUPERADMIN"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  NONE: [],
  MODERATOR: [
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_MODERATE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.EVENTS_MODERATE,
  ],
  ADMIN: [
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_MODERATE,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_BAN,
    PERMISSIONS.EVENTS_MODERATE,
    PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.SYSTEM_ANALYTICS,
  ],
  SUPERADMIN: Object.values(PERMISSIONS),
};

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const list = ROLE_PERMISSIONS[role as AdminRole];
  return Array.isArray(list) && list.includes(permission);
}

export function permissionsFor(role: string | null | undefined): readonly Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role as AdminRole] ?? [];
}

/** Guardia per le route API: restituisce una Response se il permesso manca. */
// `requirePermission()` stava qui e non la chiamava nessuno: tutte le rotte
// usano `guard()` di lib/api.ts, che fa sessione e limite in una riga. Due
// modi di negare un accesso sono uno di troppo — quello meno usato invecchia
// senza che nessuno se ne accorga, ed è quello che qualcuno sceglierà per
// caso il giorno in cui non è più allineato.
