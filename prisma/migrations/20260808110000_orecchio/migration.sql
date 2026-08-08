-- «L'orecchio»: una partita al giorno, per persona.
--
-- Il turno e' deciso dal numero del giorno, che ne e' anche il seme: tutti
-- giocano le stesse domande, ed e' l'unica condizione in cui confrontare i
-- punteggi in classifica significa qualcosa.
--
-- Da qui discende il vincolo di unicita': rigiocare lo stesso giorno vorrebbe
-- dire rispondere a domande di cui si conosce gia' la soluzione. Sta nel
-- database e non solo nel codice perche' due richieste simultanee passerebbero
-- entrambe qualunque controllo applicativo.
CREATE TABLE "PartitaOrecchio" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "giorno"    INTEGER NOT NULL,
  "punteggio" INTEGER NOT NULL,
  "corrette"  INTEGER NOT NULL,
  "giocataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartitaOrecchio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartitaOrecchio_userId_giorno_key" ON "PartitaOrecchio"("userId", "giorno");
CREATE INDEX "PartitaOrecchio_giorno_punteggio_idx" ON "PartitaOrecchio"("giorno", "punteggio");

ALTER TABLE "PartitaOrecchio" ADD CONSTRAINT "PartitaOrecchio_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
