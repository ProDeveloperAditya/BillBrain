-- Add Auth.js v5 credential fields to User
-- emailVerified: required for future OAuth provider support
-- password: bcrypt hash for credentials-based sign-in (null for OAuth accounts)

ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "password" TEXT;
