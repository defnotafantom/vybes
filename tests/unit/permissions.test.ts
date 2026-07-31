import { describe, it, expect } from "vitest";
import { hasPermission, permissionsFor, PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/permissions";

describe("permessi per ruolo", () => {
  it("un utente senza ruolo admin non può niente", () => {
    expect(permissionsFor("NONE")).toHaveLength(0);
    expect(hasPermission("NONE", PERMISSIONS.CONTENT_MODERATE)).toBe(false);
  });

  it("il moderatore modera ma non cancella", () => {
    expect(hasPermission("MODERATOR", PERMISSIONS.CONTENT_MODERATE)).toBe(true);
    expect(hasPermission("MODERATOR", PERMISSIONS.CONTENT_DELETE)).toBe(false);
    expect(hasPermission("MODERATOR", PERMISSIONS.USERS_BAN)).toBe(false);
  });

  it("il superadmin ha tutti i permessi definiti", () => {
    for (const p of Object.values(PERMISSIONS)) {
      expect(hasPermission("SUPERADMIN", p)).toBe(true);
    }
  });

  it("i ruoli crescono per inclusione", () => {
    for (const p of ROLE_PERMISSIONS.MODERATOR) {
      expect(ROLE_PERMISSIONS.ADMIN).toContain(p);
    }
  });

  it("un ruolo sconosciuto o assente non concede niente", () => {
    expect(hasPermission("PIRATA", PERMISSIONS.CONTENT_VIEW)).toBe(false);
    expect(hasPermission(null, PERMISSIONS.CONTENT_VIEW)).toBe(false);
    expect(hasPermission(undefined, PERMISSIONS.CONTENT_VIEW)).toBe(false);
  });
});
