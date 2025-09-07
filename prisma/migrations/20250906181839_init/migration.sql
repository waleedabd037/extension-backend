-- CreateTable
CREATE TABLE "public"."User" (
    "user_id" TEXT NOT NULL,
    "trial_start" BIGINT NOT NULL,
    "license" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);
