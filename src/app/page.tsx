import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  
  if (session) {
    // Logged in users go to dashboard
    redirect("/dashboard");
  } else {
    // Not logged in - redirect to login
    redirect("/login");
  }
}
