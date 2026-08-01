-- Segnalazioni di contenuto (Digital Services Act, "notice and action").
--
-- Scritta a mano e non generata da `prisma migrate dev`: la migrazione nasce
-- in un ambiente senza accesso al database, quindi il file rispetta alla
-- lettera le convenzioni di nome di Prisma — tabella, chiave primaria, indici
-- e vincoli — perche' il prossimo `migrate dev` non rilevi una deriva
-- inesistente e proponga di riscrivere quello che c'e' gia'.

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetUrl" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "reporterId" TEXT,
    "reporterEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APERTA',
    "decisione" TEXT,
    "decisaDaId" TEXT,
    "decisaIl" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_decisaDaId_fkey" FOREIGN KEY ("decisaDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
