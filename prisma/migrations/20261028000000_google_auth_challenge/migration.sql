CREATE TABLE "GoogleAuthChallenge" (
  "id" UUID NOT NULL,
  "nonceHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "GoogleAuthChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleAuthChallenge_nonceHash_key" ON "GoogleAuthChallenge"("nonceHash");
CREATE INDEX "GoogleAuthChallenge_expiresAt_idx" ON "GoogleAuthChallenge"("expiresAt");
CREATE INDEX "GoogleAuthChallenge_consumedAt_idx" ON "GoogleAuthChallenge"("consumedAt");
