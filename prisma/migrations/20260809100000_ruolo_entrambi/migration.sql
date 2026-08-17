-- Il terzo ruolo, e la traccia di chi l'ha scelto davvero.
--
-- `role` accetta ora anche 'ENTRAMBI': le due cose possono coesistere — un
-- locale con una band residente, un collettivo che organizza la propria
-- rassegna. Resta un valore e non una lista separata da virgole perche' la
-- directory pubblica filtra su questa colonna dentro un indice composto, ed e'
-- la query piu' calda del sito: `IN` usa l'indice, `LIKE` no.
--
-- `ruoloSceltoIl` distingue «e' ARTIST perche' l'ha detto» da «e' ARTIST
-- perche' e' il default». Chi entra con Google non sceglie niente, e senza
-- questa colonna la domanda o non comparirebbe mai o ricomparirebbe sempre.
--
-- Il backfill: chi si e' registrato con il modulo il ruolo l'ha scelto davvero
-- — il modulo lo chiede. Si segna con la data di creazione dell'account, che
-- e' il momento in cui quella scelta e' stata fatta. Chi non ha una password
-- e' entrato con Google e la scelta non l'ha mai fatta: resta NULL, e alla
-- prossima visita gli viene chiesto.
ALTER TABLE "User" ADD COLUMN "ruoloSceltoIl" TIMESTAMP(3);

UPDATE "User" SET "ruoloSceltoIl" = "createdAt" WHERE "password" IS NOT NULL;
