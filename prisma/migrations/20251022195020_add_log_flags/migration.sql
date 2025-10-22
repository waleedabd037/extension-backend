/*
  Warnings:

  - You are about to drop the column `license_ended_logged` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `trial_ended_logged` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "license_ended_logged",
DROP COLUMN "trial_ended_logged";
