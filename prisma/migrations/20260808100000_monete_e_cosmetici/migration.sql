-- Monete interne e oggetti estetici.
--
-- Le monete non si comprano con denaro: si guadagnano usando il sito, e
-- comprano solo estetica. Il confine e' in src/lib/cosmetici.ts (ADR-047):
-- niente di acquistabile puo' toccare reputazione, vetrina, ordinamento della
-- directory o distintivi.
--
-- Il saldo sta su "User" perche' va letto a ogni pagina; il registro sta in
-- "MovimentoMonete" perche' un saldo senza storia non si puo' ne' correggere
-- ne' spiegare. Se i due divergono, il registro ha ragione.
ALTER TABLE "User" ADD COLUMN "monete" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Possesso" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "cosmeticoId" TEXT NOT NULL,
  "ottenutoIl"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "prezzo"      INTEGER NOT NULL DEFAULT 0,
  "indossato"   BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Possesso_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Possesso_userId_cosmeticoId_key" ON "Possesso"("userId", "cosmeticoId");
CREATE INDEX "Possesso_userId_indossato_idx" ON "Possesso"("userId", "indossato");

ALTER TABLE "Possesso" ADD CONSTRAINT "Possesso_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MovimentoMonete" (
  "id"       TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "delta"    INTEGER NOT NULL,
  "causale"  TEXT NOT NULL,
  "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MovimentoMonete_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MovimentoMonete_userId_creatoIl_idx" ON "MovimentoMonete"("userId", "creatoIl");

ALTER TABLE "MovimentoMonete" ADD CONSTRAINT "MovimentoMonete_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
