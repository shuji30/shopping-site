-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kana" TEXT,
    "email" TEXT NOT NULL,
    "tel" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "address" TEXT,
    "note" TEXT,
    "total" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReservationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "kimonoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "rentalDays" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    CONSTRAINT "ReservationItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_orderNumber_key" ON "Reservation"("orderNumber");
