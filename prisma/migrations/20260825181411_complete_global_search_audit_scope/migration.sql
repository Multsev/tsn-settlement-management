-- CreateIndex
CREATE INDEX "AuditLog_communityId_createdAt_idx" ON "AuditLog"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_communityId_entityType_entityId_idx" ON "AuditLog"("communityId", "entityType", "entityId");
