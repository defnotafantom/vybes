import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type TokenType = "EMAIL_VERIFY" | "PASSWORD_RESET";

const TTL_MS: Record<TokenType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000, // 24 ore
  PASSWORD_RESET: 60 * 60 * 1000, //     1 ora
};

/**
 * Crea un token monouso. Nel database finisce solo l'hash: se il DB viene
 * letto da terzi, i token in circolazione restano inutilizzabili.
 * I token dello stesso tipo già emessi per l'utente vengono invalidati,
 * così l'ultimo link inviato è sempre l'unico valido.
 */
export async function issueToken(userId: string, type: TokenType): Promise<string> {
  const raw = randomBytes(32).toString("base64url");

  await prisma.verificationToken.deleteMany({ where: { userId, type } });
  await prisma.verificationToken.create({
    data: {
      token: hash(raw),
      type,
      userId,
      expiresAt: new Date(Date.now() + TTL_MS[type]),
    },
  });

  return raw;
}

export type TokenCheck =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; reason: "invalid" | "expired" };

export async function verifyToken(raw: string, type: TokenType): Promise<TokenCheck> {
  if (!raw || raw.length < 10) return { ok: false, reason: "invalid" };

  const record = await prisma.verificationToken.findUnique({
    where: { token: hash(raw) },
    select: { id: true, userId: true, type: true, expiresAt: true },
  });

  if (!record || record.type !== type) return { ok: false, reason: "invalid" };

  if (record.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: record.id } });
    return { ok: false, reason: "expired" };
  }

  return { ok: true, userId: record.userId, tokenId: record.id };
}

export async function consumeToken(tokenId: string): Promise<void> {
  await prisma.verificationToken.delete({ where: { id: tokenId } }).catch(() => {
    /* già consumato da una richiesta concorrente */
  });
}

function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Confronto a tempo costante, per usi futuri su codici brevi. */
// `safeEqual()`, un confronto a tempo costante, stava qui e non la usava
// nessuno. Non era una dimenticanza: la difesa vera è un'altra, ed è già in
// funzione. Il token non viene mai confrontato in memoria — nel database
// finisce solo il suo hash, e la verifica è una `findUnique` su quell'hash,
// cioè una ricerca su indice. Non c'è nessuna stringa segreta da paragonare.
//
// Tenerla suggeriva una protezione che non era in uso, ed è il genere di cosa
// che in un riesame di sicurezza si spunta come «fatto» senza verificarlo.
