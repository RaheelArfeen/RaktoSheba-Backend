import { BloodRequest, Role } from '@prisma/client';
import prisma from '../../../config/prisma';
import AppError from '../../utils/AppError';
import { sendEmail } from '../../../config/mailer';
import { findMatchingDonors } from '../bloodRequest/matching';
import { emitToUser } from '../../realtime/socket';

// ---- In-app notifications ---------------------------------------------------

export type TNotificationInput = {
  type: string;
  title: string;
  message: string;
  link?: string;
  requestId?: string;
};

// "O_NEGATIVE" → "O−", for notification text.
export const bloodLabel = (group: string) => group.replace('_POSITIVE', '+').replace('_NEGATIVE', '−');

const hospitalNameFor = async (requesterId: string) =>
  (await prisma.hospital.findUnique({ where: { userId: requesterId }, select: { name: true } }))?.name ?? 'A hospital';

/**
 * Saves a notification for each user and pushes it to anyone connected live.
 * Never throws: a failed notification must not undo the action that caused it.
 */
const notify = async (userIds: string[], input: TNotificationInput) => {
  try {
    const created = await Promise.all(
      [...new Set(userIds)].map((userId) =>
        prisma.notification.create({ data: { userId, channel: 'in_app', ...input } }),
      ),
    );
    created.forEach((n) => emitToUser(n.userId, 'notification', n));
    return created.length;
  } catch (error) {
    console.error('[notification] failed to notify', input.type, error);
    return 0;
  }
};

const adminIds = async () =>
  (await prisma.user.findMany({ where: { role: Role.ADMIN, isBanned: false }, select: { id: true } })).map((u) => u.id);

// A verified request goes to every compatible, eligible donor (in-app + email).
const fanOutForRequest = async (request: BloodRequest) => {
  const matchingDonors = await findMatchingDonors(request);
  const hospital = await hospitalNameFor(request.requesterId);
  const group = bloodLabel(request.bloodGroup);

  const count = await notify(
    matchingDonors.map((d) => d.user.id),
    {
      type: 'REQUEST_MATCH',
      title: `${group} blood needed`,
      message: `${hospital} needs ${request.unitsNeeded} unit(s). Your blood is a match.`,
      link: `/dashboard/donor?request=${request.id}`,
      requestId: request.id,
    },
  );

  const emailResults = await Promise.allSettled(
    matchingDonors.map((donor) =>
      sendEmail(
        donor.user.email,
        'RaktoSheba: A compatible blood request needs you',
        `${hospital} needs ${request.unitsNeeded} unit(s) of ${group} blood. ` +
          `You are a compatible, eligible donor. Log in to RaktoSheba to accept this request.`,
      ),
    ),
  );

  emailResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `[notification] failed to email ${matchingDonors[index]?.user.email}:`,
        result.reason,
      );
    }
  });

  return count;
};

// Admins hear about every new request waiting for verification.
const notifyAdminsOfNewRequest = async (request: BloodRequest) =>
  notify(await adminIds(), {
    type: 'NEW_REQUEST',
    title: 'New request to verify',
    message: `${await hospitalNameFor(request.requesterId)} posted a ${bloodLabel(request.bloodGroup)} request (urgency ${request.urgency}/5).`,
    link: '/dashboard/admin/queue',
    requestId: request.id,
  });

// The newest notifications for the bell, plus how many are still unread.
const listMyNotifications = async (userId: string) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { sentAt: 'desc' }, take: 30 }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unread };
};

const markAllAsRead = async (userId: string) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: count };
};

const markAsRead = async (id: string, userId: string) => {
  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification) {
    throw new AppError(404, 'Notification not found');
  }

  if (notification.userId !== userId) {
    throw new AppError(403, 'You can only mark your own notifications as read');
  }

  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
};

export const NotificationService = {
  notify,
  notifyAdminsOfNewRequest,
  fanOutForRequest,
  markAllAsRead,
  listMyNotifications,
  markAsRead,
};
