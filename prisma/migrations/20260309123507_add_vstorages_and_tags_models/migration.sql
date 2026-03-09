-- CreateTable
CREATE TABLE "vector_storages" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vector_storages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vector_storage_tags" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vector_storage_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VectorStorageToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VectorStorageToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "vector_storages_userId_idx" ON "vector_storages"("userId");

-- CreateIndex
CREATE INDEX "vector_storage_tags_userId_idx" ON "vector_storage_tags"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "vector_storage_tags_userId_name_key" ON "vector_storage_tags"("userId", "name");

-- CreateIndex
CREATE INDEX "_VectorStorageToTag_B_index" ON "_VectorStorageToTag"("B");

-- AddForeignKey
ALTER TABLE "vector_storages" ADD CONSTRAINT "vector_storages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vector_storage_tags" ADD CONSTRAINT "vector_storage_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VectorStorageToTag" ADD CONSTRAINT "_VectorStorageToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "vector_storages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VectorStorageToTag" ADD CONSTRAINT "_VectorStorageToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "vector_storage_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
