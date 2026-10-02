-- Replace Tribe identity (email + tribeUserId) with local username/password.

ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Derive a username from the email local-part. Duplicate or too-short names
-- get a short id suffix so the unique index can be created.
UPDATE "User" AS u
SET "username" = mapped.username
FROM (
  SELECT
    id,
    CASE
      WHEN rn = 1 THEN base
      ELSE base || '_' || substr(id, 1, 8)
    END AS username
  FROM (
    SELECT
      id,
      base,
      row_number() OVER (PARTITION BY base ORDER BY "createdAt", id) AS rn
    FROM (
      SELECT
        id,
        "createdAt",
        CASE
          WHEN length(clean) >= 3 THEN clean
          ELSE 'user_' || substr(id, 1, 8)
        END AS base
      FROM (
        SELECT
          id,
          "createdAt",
          lower(
            regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9_]', '', 'g')
          ) AS clean
        FROM "User"
      ) cleaned
    ) based
  ) ranked
) AS mapped
WHERE u.id = mapped.id;

-- Existing Tribe accounts have no password. This value never verifies.
UPDATE "User"
SET "passwordHash" = 'scrypt$unmigrated$unmigrated'
WHERE "passwordHash" IS NULL;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

ALTER TABLE "User" DROP COLUMN "email";
ALTER TABLE "User" DROP COLUMN "tribeUserId";
