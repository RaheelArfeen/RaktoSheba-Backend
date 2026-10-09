-- CreateEnum
CREATE TYPE "HospitalType" AS ENUM ('GOVERNMENT', 'PRIVATE', 'CLINIC');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- Existing values are already district names (Dhaka, Kishoreganj), so rename rather than drop.
ALTER TABLE "Hospital" RENAME COLUMN "city" TO "district";

-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "email" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "hasEmergencyService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "type" "HospitalType",
ADD COLUMN     "upazila" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING';

-- Carry the old boolean flag across before dropping it.
UPDATE "Hospital" SET "verificationStatus" = 'VERIFIED' WHERE "verified" = true;

ALTER TABLE "Hospital" DROP COLUMN "verified";

-- CreateIndex
CREATE INDEX "Hospital_district_idx" ON "Hospital"("district");

-- CreateIndex
CREATE INDEX "Hospital_verificationStatus_idx" ON "Hospital"("verificationStatus");
