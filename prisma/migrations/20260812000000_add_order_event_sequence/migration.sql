CREATE SEQUENCE "OrderEvent_sequence_seq";

ALTER TABLE "OrderEvent" ADD COLUMN "sequence" BIGINT;

UPDATE "OrderEvent"
SET "sequence" = nextval('"OrderEvent_sequence_seq"');

ALTER SEQUENCE "OrderEvent_sequence_seq" OWNED BY "OrderEvent"."sequence";

ALTER TABLE "OrderEvent"
  ALTER COLUMN "sequence" SET DEFAULT nextval('"OrderEvent_sequence_seq"'),
  ALTER COLUMN "sequence" SET NOT NULL;

CREATE UNIQUE INDEX "OrderEvent_sequence_key" ON "OrderEvent"("sequence");
