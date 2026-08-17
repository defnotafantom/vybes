-- Il campo che alimenta l'asse dell'incontro (POSIZIONE.md).
--
-- «Cosa la gente crede della mia arte», scritto da chi quell'arte la fa.
-- Nullable: e' una domanda difficile, e renderla obbligatoria al primo
-- caricamento produrrebbe quattro parole buttate li' invece di una risposta.
ALTER TABLE "PortfolioItem" ADD COLUMN "credenza" TEXT;
