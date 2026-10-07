-- Passkeys remember how their authenticator is reached ("internal",
-- "hybrid", "usb"…). Firefox on macOS hangs on PRF requests unless the
-- browser is told, so unlocking hands these back.

-- AlterTable
ALTER TABLE "Passkey" ADD COLUMN     "transports" TEXT[] DEFAULT ARRAY[]::TEXT[];
