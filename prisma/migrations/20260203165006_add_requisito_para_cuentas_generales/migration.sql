-- CreateTable
CREATE TABLE "credenciales_web" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "passwordIv" TEXT NOT NULL,
    "passwordTag" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empleadoId" INTEGER,
    "areaId" INTEGER,
    "puestoId" INTEGER,
    "creadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credenciales_web_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credenciales_web_empleadoId_idx" ON "credenciales_web"("empleadoId");

-- CreateIndex
CREATE INDEX "credenciales_web_areaId_idx" ON "credenciales_web"("areaId");

-- CreateIndex
CREATE INDEX "credenciales_web_puestoId_idx" ON "credenciales_web"("puestoId");

-- CreateIndex
CREATE INDEX "credenciales_web_creadoPorId_idx" ON "credenciales_web"("creadoPorId");

-- AddForeignKey
ALTER TABLE "credenciales_web" ADD CONSTRAINT "credenciales_web_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credenciales_web" ADD CONSTRAINT "credenciales_web_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credenciales_web" ADD CONSTRAINT "credenciales_web_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credenciales_web" ADD CONSTRAINT "credenciales_web_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
