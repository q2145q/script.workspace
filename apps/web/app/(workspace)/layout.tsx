import { redirect } from "next/navigation";
import { auth } from "@script/api/auth";
import { prisma } from "@script/db";
import { headers } from "next/headers";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  // Beta gate
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { betaApproved: true, banned: true },
  });

  if (user?.banned || !user?.betaApproved) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
