CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ownerId" TEXT,
    "deleteRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UploadedFile_url_key" ON "UploadedFile"("url");
CREATE INDEX "UploadedFile_ownerId_idx" ON "UploadedFile"("ownerId");
CREATE INDEX "UploadedFile_deleteRequestedAt_idx" ON "UploadedFile"("deleteRequestedAt");
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
