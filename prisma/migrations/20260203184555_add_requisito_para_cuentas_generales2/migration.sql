/*
  Warnings:

  - You are about to drop the column `areaId` on the `checklists` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[puestoId,nombre]` on the table `checklists` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[areaId,nombre]` on the table `puestos` will be added. If there are existing duplicate values, this will fail.
  - Made the column `puestoId` on table `checklists` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `areaId` to the `puestos` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "checklists" DROP CONSTRAINT "checklists_areaId_fkey";

-- DropForeignKey
ALTER TABLE "checklists" DROP CONSTRAINT "checklists_puestoId_fkey";

-- DropIndex
DROP INDEX "checklists_areaId_idx";

-- DropIndex
DROP INDEX "puestos_nombre_key";

-- AlterTable
ALTER TABLE "checklists" DROP COLUMN "areaId",
ALTER COLUMN "puestoId" SET NOT NULL;

-- AlterTable
ALTER TABLE "puestos" ADD COLUMN     "areaId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "checklists_puestoId_nombre_key" ON "checklists"("puestoId", "nombre");

-- CreateIndex
CREATE INDEX "puestos_areaId_idx" ON "puestos"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "puestos_areaId_nombre_key" ON "puestos"("areaId", "nombre");

-- AddForeignKey
ALTER TABLE "puestos" ADD CONSTRAINT "puestos_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
