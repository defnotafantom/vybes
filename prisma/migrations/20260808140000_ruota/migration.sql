-- La ruota giornaliera.
--
-- Un giro al giorno per persona, e il vincolo sta nel database perche' due
-- richieste simultanee passerebbero entrambe qualunque controllo applicativo.
--
-- L'esito e' deciso da un seme costruito su (utente, giorno): rilanciare la
-- stessa richiesta da' lo stesso premio, e non c'e' modo di girare finche' non
-- esce quello buono. Questa tabella registra cos'e' uscito, non lo decide.
CREATE TABLE "GiroRuota" (
  "id"       TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "giorno"   INTEGER NOT NULL,
  "premio"   TEXT NOT NULL,
  "monete"   INTEGER NOT NULL DEFAULT 0,
  "giratoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiroRuota_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GiroRuota_userId_giorno_key" ON "GiroRuota"("userId", "giorno");

ALTER TABLE "GiroRuota" ADD CONSTRAINT "GiroRuota_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
