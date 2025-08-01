-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "amount_after_6pm" INTEGER,
ADD COLUMN     "amount_before_6pm" INTEGER,
ADD COLUMN     "duration_after_6pm_seconds" INTEGER,
ADD COLUMN     "duration_before_6pm_seconds" INTEGER,
ADD COLUMN     "extras_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "has_dual_pricing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricing_overlaps_6pm" BOOLEAN NOT NULL DEFAULT false;
