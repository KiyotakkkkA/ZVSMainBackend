/*
  Warnings:

  - A unique constraint covering the columns `[verificationToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "verificationToken" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'UNVERIFIED';

-- CreateIndex
CREATE UNIQUE INDEX "users_verificationToken_key" ON "users"("verificationToken");
