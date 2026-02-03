-- CreateEnum
CREATE TYPE "TipoEquipo" AS ENUM ('LAPTOP', 'DESKTOP', 'TABLET', 'CELULAR', 'MONITOR', 'IMPRESORA', 'ROUTER', 'SWITCH', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('DISPONIBLE', 'ASIGNADO', 'MANTENIMIENTO', 'BAJA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('RESGUARDO', 'FOTO', 'FACTURA', 'GARANTIA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoResguardo" AS ENUM ('ACTIVO', 'FINALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "localidades" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "ciudad" TEXT,
    "direccion" TEXT,
    "cp" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "localidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "numeroEmpleado" TEXT,
    "puesto" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "localidadId" INTEGER,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" SERIAL NOT NULL,
    "codigoInventario" TEXT,
    "serie" TEXT,
    "tipo" "TipoEquipo" NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "descripcion" TEXT,
    "estado" "EstadoEquipo" NOT NULL DEFAULT 'DISPONIBLE',
    "fechaCompra" TIMESTAMP(3),
    "costo" DECIMAL(12,2),
    "localidadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resguardos" (
    "id" SERIAL NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "localidadId" INTEGER,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "estado" "EstadoResguardo" NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,
    "folio" TEXT,
    "creadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resguardos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resguardo_equipos" (
    "id" SERIAL NOT NULL,
    "resguardoId" INTEGER NOT NULL,
    "equipoId" INTEGER NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL,
    "fechaDevolucion" TIMESTAMP(3),
    "observaciones" TEXT,
    "entregadoPorId" INTEGER,
    "recibidoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resguardo_equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "ruta" TEXT NOT NULL,
    "nombreArchivo" TEXT,
    "mime" TEXT,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "equipoId" INTEGER,
    "resguardoId" INTEGER,
    "resguardoEquipoId" INTEGER,
    "subidoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wifi_credenciales" (
    "id" SERIAL NOT NULL,
    "ssid" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "notas" TEXT,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "empleadoId" INTEGER,
    "localidadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wifi_credenciales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "localidades_codigo_key" ON "localidades"("codigo");

-- CreateIndex
CREATE INDEX "localidades_estado_idx" ON "localidades"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_email_key" ON "empleados"("email");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_numeroEmpleado_key" ON "empleados"("numeroEmpleado");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_usuarioId_key" ON "empleados"("usuarioId");

-- CreateIndex
CREATE INDEX "empleados_localidadId_idx" ON "empleados"("localidadId");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_codigoInventario_key" ON "equipos"("codigoInventario");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_serie_key" ON "equipos"("serie");

-- CreateIndex
CREATE INDEX "equipos_tipo_idx" ON "equipos"("tipo");

-- CreateIndex
CREATE INDEX "equipos_estado_idx" ON "equipos"("estado");

-- CreateIndex
CREATE INDEX "equipos_localidadId_idx" ON "equipos"("localidadId");

-- CreateIndex
CREATE UNIQUE INDEX "resguardos_folio_key" ON "resguardos"("folio");

-- CreateIndex
CREATE INDEX "resguardos_empleadoId_idx" ON "resguardos"("empleadoId");

-- CreateIndex
CREATE INDEX "resguardos_localidadId_idx" ON "resguardos"("localidadId");

-- CreateIndex
CREATE INDEX "resguardos_fechaInicio_idx" ON "resguardos"("fechaInicio");

-- CreateIndex
CREATE INDEX "resguardo_equipos_equipoId_idx" ON "resguardo_equipos"("equipoId");

-- CreateIndex
CREATE INDEX "resguardo_equipos_fechaEntrega_idx" ON "resguardo_equipos"("fechaEntrega");

-- CreateIndex
CREATE UNIQUE INDEX "resguardo_equipos_resguardoId_equipoId_key" ON "resguardo_equipos"("resguardoId", "equipoId");

-- CreateIndex
CREATE INDEX "documentos_equipoId_idx" ON "documentos"("equipoId");

-- CreateIndex
CREATE INDEX "documentos_resguardoId_idx" ON "documentos"("resguardoId");

-- CreateIndex
CREATE INDEX "documentos_resguardoEquipoId_idx" ON "documentos"("resguardoEquipoId");

-- CreateIndex
CREATE INDEX "wifi_credenciales_ssid_idx" ON "wifi_credenciales"("ssid");

-- CreateIndex
CREATE INDEX "wifi_credenciales_empleadoId_idx" ON "wifi_credenciales"("empleadoId");

-- CreateIndex
CREATE INDEX "wifi_credenciales_localidadId_idx" ON "wifi_credenciales"("localidadId");

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resguardos" ADD CONSTRAINT "resguardos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resguardos" ADD CONSTRAINT "resguardos_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resguardos" ADD CONSTRAINT "resguardos_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resguardo_equipos" ADD CONSTRAINT "resguardo_equipos_entregadoPorId_fkey" FOREIGN KEY ("entregadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resguardo_equipos" ADD CONSTRAINT "resguardo_equipos_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resguardo_equipos" ADD CONSTRAINT "resguardo_equipos_resguardoId_fkey" FOREIGN KEY ("resguardoId") REFERENCES "resguardos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resguardo_equipos" ADD CONSTRAINT "resguardo_equipos_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_resguardoId_fkey" FOREIGN KEY ("resguardoId") REFERENCES "resguardos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_resguardoEquipoId_fkey" FOREIGN KEY ("resguardoEquipoId") REFERENCES "resguardo_equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wifi_credenciales" ADD CONSTRAINT "wifi_credenciales_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wifi_credenciales" ADD CONSTRAINT "wifi_credenciales_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
