-- Durable curation flag: hidden people are excluded from search and face labels.
-- Additive and defaulted, so existing rows and the running app are unaffected.
ALTER TABLE "Person" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
