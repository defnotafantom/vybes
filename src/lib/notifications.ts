import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "FOLLOW"
  | "LIKE"
  | "COMMENT"
  | "MESSAGE"
  | "EVENT_REQUEST"
  | "EVENT_ACCEPTED"
  | "EVENT_REJECTED"
  | "QUEST_COMPLETED"
  | "COLLAB_INVITE"
  | "LEVEL_UP";

export async function notify(input: {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  body: string;
  entityId?: string | null;
  entityUrl?: string | null;
}) {
  // Non notificare azioni compiute su se stessi.
  if (input.actorId && input.actorId === input.recipientId) return null;

  return prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      type: input.type,
      body: input.body,
      entityId: input.entityId ?? null,
      entityUrl: input.entityUrl ?? null,
    },
  });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { recipientId: userId, readAt: null } });
}
