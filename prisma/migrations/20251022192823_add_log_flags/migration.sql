-- AlterTable
ALTER TABLE "User" ADD COLUMN     "license_ended_logged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trial_ended_logged" BOOLEAN NOT NULL DEFAULT false;
