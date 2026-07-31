import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatRoom } from "@/components/ChatRoom";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const member = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) notFound();

  const [messages, other] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { sender: { select: { slug: true, name: true, image: true } } },
    }),
    prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
      include: { user: { select: { slug: true, name: true } } },
    }),
  ]);

  await prisma.conversationParticipant.update({
    where: { id: member.id },
    data: { lastReadAt: new Date() },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/messaggi" className="text-sm text-brand-600 hover:underline">
        ← Tutte le conversazioni
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{other?.user.name ?? "Conversazione"}</h1>

      <div className="mt-6">
        <ChatRoom
          conversationId={conversationId}
          currentUserId={userId}
          initialMessages={messages.map((m) => ({
            id: m.id,
            content: m.content,
            senderId: m.senderId,
            createdAt: m.createdAt.toISOString(),
            sender: m.sender,
          }))}
        />
      </div>
    </div>
  );
}
