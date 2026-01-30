import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }
  
  const role = (session.user as any)?.role;
  
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
