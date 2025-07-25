/*
  Warnings:

  - You are about to drop the column `name` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `rate` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `rate_type` on the `Game` table. All the data in the column will be lost.
  - Added the required column `title` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Game_name_key";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN "title" TEXT;
UPDATE "Game" SET "title" = "name" WHERE "title" IS NULL;
ALTER TABLE "Game" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "Game" DROP COLUMN "name";
ALTER TABLE "Game" DROP COLUMN "rate";
ALTER TABLE "Game" DROP COLUMN "rate_type";

-- CreateTable
CREATE TABLE "GamePrice" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,

    CONSTRAINT "GamePrice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GamePrice" ADD CONSTRAINT "GamePrice_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
