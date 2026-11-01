CREATE TABLE "GoogleAuthChallenge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nonceHash" TEXT NOT NULL UNIQUE,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" DATETIME
);

CREATE INDEX "GoogleAuthChallenge_expiresAt_idx" ON "GoogleAuthChallenge"("expiresAt");
CREATE INDEX "GoogleAuthChallenge_consumedAt_idx" ON "GoogleAuthChallenge"("consumedAt");
