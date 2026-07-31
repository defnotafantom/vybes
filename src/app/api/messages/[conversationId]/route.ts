import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { publish, conversationChannel, userChannel } from "@/lib/realtime";
import { notify } from "@/lib/notifications";

async function assertMember(conversationId: string, userId: string) {
  return prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "messages-read", limit: 200 });
    if (g.error) return g.error;
    const { conversationId } = await params;

    const member = await assertMember(conversationId, g.user!.id);
    if (!member) return fail("Conversazione non accessibile", 403);

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { sender: { select: { slug: true, name: true, image: true } } },
    });

    // Segna come letta al momento dell'apertura.
    await prisma.conversationParticipant.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });

    return ok(messages);
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "messages-write", limit: 60 });
    if (g.error) return g.error;
    const { conversationId } = await params;

    const member = await assertMember(conversationId, g.user!.id);
    if (!member) return fail("Conversazione non accessibile", 403);

    const { data, error } = await parseBody(req, messageSchema);
    if (error) return error;

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: g.user!.id,
        content: data.content,
        mediaUrl: data.mediaUrl || null,
      },
      include: { sender: { select: { slug: true, name: true, image: true } } },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    // Push immediato ai client connessi via SSE.
    publish(conversationChannel(conversationId), { type: "message", message });

    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: g.user!.id } },
      select: { userId: true },
    });

    for (const o of others) {
      publish(userChannel(o.userId), { type: "message", conversationId });
      await notify({
        recipientId: o.userId,
        actorId: g.user!.id,
        type: "MESSAGE",
        body: `Nuovo messaggio da ${g.user!.name}`,
        entityId: conversationId,
        entityUrl: `/dashboard/messaggi/${conversationId}`,
      });
    }

    return ok(message, { status: 201 });
  });
}
