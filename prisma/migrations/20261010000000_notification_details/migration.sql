-- Notifications carry their own text so the in-app bell can show them.
ALTER TABLE "Notification" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'REQUEST_MATCH',
ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN "message" TEXT NOT NULL DEFAULT '',
ADD COLUMN "link" TEXT;
