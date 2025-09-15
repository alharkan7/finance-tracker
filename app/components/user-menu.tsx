'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { User, LogOut } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <User className="w-6 h-6 text-white animate-pulse" />
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        {/* Display user name */}
        <span className="text-white text-sm font-medium hidden sm:block">
          Welcome, {session.user?.name?.split(' ')[0] || 'User'}
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="neutral" size="icon" className="text-white hover:bg-white/10 border border-white/20">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <User className="w-6 h-6" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {/* User info in dropdown */}
            <div className="px-3 py-2 text-sm border-b border-border">
              <div className="font-medium">{session.user?.name || 'User'}</div>
              <div className="text-muted-foreground text-xs">{session.user?.email}</div>
            </div>
            
            <DropdownMenuItem
              onClick={() => signOut()}
              className="flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <Button
      variant="neutral"
      size="sm"
      className="text-white hover:bg-white/10 border border-white/20"
      onClick={() => signIn("google")}
    >
      <User className="w-4 h-4 mr-2" />
      Sign In
    </Button>
  )
}
