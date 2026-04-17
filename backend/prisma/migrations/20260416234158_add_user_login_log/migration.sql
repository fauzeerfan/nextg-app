-- CreateEnum
CREATE TYPE "LoginStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "UserLoginLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" "LoginStatus" NOT NULL,
    "errorMessage" TEXT,
    "station" TEXT,

    CONSTRAINT "UserLoginLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLoginLog_timestamp_idx" ON "UserLoginLog"("timestamp");

-- CreateIndex
CREATE INDEX "UserLoginLog_userId_idx" ON "UserLoginLog"("userId");

-- CreateIndex
CREATE INDEX "UserLoginLog_username_idx" ON "UserLoginLog"("username");
