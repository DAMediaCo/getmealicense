"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const user = session.user as any;
  const isManager = user?.role === "MANAGER" || user?.role === "ADMIN";
  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="font-bold text-xl text-blue-600">
                GetMeALicense
              </Link>
              
              {/* Student Navigation */}
              {!isManager && (
                <div className="hidden md:flex space-x-4">
                  <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                    Dashboard
                  </Link>
                  <Link href="/courses" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                    📚 Courses
                  </Link>
                  <Link href="/dashboard/quiz" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                    Practice Quiz
                  </Link>
                  <Link href="/dashboard/flashcards" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                    Flashcards
                  </Link>
                  <Link href="/dashboard/study-guides" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                    Study Guides
                  </Link>
                </div>
              )}
              
              {/* Manager Navigation */}
              {isManager && (
                <div className="hidden md:flex space-x-4">
                  <Link href="/manager" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                    Dashboard
                  </Link>
                  <Link href="/manager/users" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                    Users
                  </Link>
                  <Link href="/manager/content" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                    Content
                  </Link>
                </div>
              )}
            </div>
            
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm font-medium">{user?.name}</div>
                  <div className="px-2 py-1.5 text-xs text-gray-500">{user?.email}</div>
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
