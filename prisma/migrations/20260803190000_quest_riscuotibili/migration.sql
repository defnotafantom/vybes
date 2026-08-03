-- Le quest si riscuotono, invece di premiare da sole.
--
-- ── Il travaso, che è la parte che conta ──
--
-- Fino a qui l'XP veniva assegnato nell'istante in cui la quest si
-- completava. Chi ha già completato qualcosa quell'XP ce l'ha in tasca.
--
-- Aggiungere la colonna e basta lascerebbe quelle righe con `riscossaIl`
-- nullo, cioè **riscuotibili**: al primo accesso ognuno potrebbe incassare
-- una seconda volta ricompense già avute. Non è un errore che si vede — i
-- numeri salgono, e sembra che funzioni.
--
-- La seconda istruzione chiude il caso: tutto ciò che risulta completato
-- adesso è, per definizione, già stato pagato.

ALTER TABLE "QuestProgress" ADD COLUMN "riscossaIl" TIMESTAMP(3);

UPDATE "QuestProgress"
SET "riscossaIl" = "completedAt"
WHERE "completedAt" IS NOT NULL;
