import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Punto di ingresso di "Contatta" dal profilo pubblico: crea o riusa la
 * conversazione 1-a-1 e reindirizza alla chat.
 */
export default async function NuovaConversazionePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>;
}) {
  const { a } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  if (!a) redirect("/dashboard/messaggi");

  const other = await prisma.user.findUnique({ where: { slug: a }, select: { id: true } });
  if (!other || other.id === userId) redirect("/dashboard/messaggi");

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: other.id } } },
      ],
    },
    select: { id: true },
  });

  const conversation =
    existing ??
    (await prisma.conversation.create({
      data: { participants: { create: [{ userId }, { userId: other.id }] } },
      select: { id: true },
    }));

  redirect(`/dashboard/messaggi/${conversation.id}`);
}
