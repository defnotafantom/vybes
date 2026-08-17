-- La durata in ore di un ingaggio.
--
-- E' il campo che distingue un ingaggio breve da uno normale (POSIZIONE.md,
-- asse del lavoro). Non un booleano: con le ore la soglia sta in un posto solo,
-- e cambiarla non richiede di riscrivere nessuna riga gia' salvata.
--
-- Nullable: gli annunci esistenti non ce l'hanno, e per un festival la durata
-- non e' una domanda sensata.
ALTER TABLE "Event" ADD COLUMN "durataOre" DOUBLE PRECISION;

-- Chi cerca un ingaggio breve filtra per durata e ordina per data, sempre fra
-- quelli pubblici e pubblicati. Senza indice e' una scansione su tutta la
-- tabella a ogni apertura della mappa.
CREATE INDEX "Event_durataOre_startsAt_idx" ON "Event"("durataOre", "startsAt");
