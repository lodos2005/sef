"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import * as React from "react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserSessions } from "@/hooks/useUserSessions";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CogIcon,
  MessageCircleIcon,
  MessageSquare,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import { Icons } from "./ui/icons";



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { sessions, isLoading, isRefreshing, error, deleteSession } = useUserSessions();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({});
  const router = useRouter();

  const getSessionTitle = (session: any) => {
    // Prefer summary if available
    if (session.summary && session.summary.trim()) {
      return session.summary;
    }
    
    // Fallback to first user message
    if (session.messages && session.messages.length > 0) {
      const firstUserMessage = session.messages.find(
        (msg: any) => msg.role === "user"
      );
      if (firstUserMessage) {
        return firstUserMessage.content.length > 20
          ? firstUserMessage.content.substring(0, 20) + "..."
          : firstUserMessage.content;
      }
    }
    
    // Final fallback
    return `${session.chatbot?.name || "Assistant"} ile Sohbet`;
  };

  const handleNewChat = () => {
    router.push("/");
  };

  const isActive = (path: string) => {
    return router.asPath === path;
  };
  return (
    <Sidebar {...props} className="dark !border-none">
      <SidebarHeader>
        <Link href="/">
          <Icons.logo className="size-18 ml-1 -mt-2 -mb-3" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-sidebar-foreground/50">
            Genel
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="group/menu-button font-medium gap-3 h-9 rounded-md data-[active=true]:hover:bg-transparent data-[active=true]:bg-gradient-to-b data-[active=true]:from-sidebar-primary data-[active=true]:to-sidebar-primary/70 data-[active=true]:shadow-[0_1px_2px_0_rgb(0_0_0/.05),inset_0_1px_0_0_rgb(255_255_255/.12)] [&>svg]:size-auto"
                  isActive={isActive("/")}
                >
                  <Link href="/">
                    <MessageCircleIcon
                      className="text-sidebar-foreground/50 group-data-[active=true]/menu-button:text-sidebar-foreground"
                      size={22}
                      aria-hidden="true"
                    />
                    <span>Yeni Sohbet</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="group/menu-button font-medium gap-3 h-9 rounded-md data-[active=true]:hover:bg-transparent data-[active=true]:bg-gradient-to-b data-[active=true]:from-sidebar-primary data-[active=true]:to-sidebar-primary/70 data-[active=true]:shadow-[0_1px_2px_0_rgb(0_0_0/.05),inset_0_1px_0_0_rgb(255_255_255/.12)] [&>svg]:size-auto"
                  isActive={isActive("/settings")}
                >
                  <Link href="/settings">
                    <CogIcon
                      className="text-sidebar-foreground/50 group-data-[active=true]/menu-button:text-sidebar-foreground"
                      size={22}
                      aria-hidden="true"
                    />
                    <span>Ayarlar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chat Sessions */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-sidebar-foreground/50 flex items-center gap-2">
            Sohbetler
            {isRefreshing && (
              <div className="w-3 h-3 border border-sidebar-foreground/30 border-t-transparent rounded-full animate-spin" />
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <ScrollArea>
              {isLoading && sessions.length === 0 && (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              )}
              {error && (
                <div className="p-2">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Konuşmalar yüklenirken hata oluştu: {error}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              {!isLoading && !error && sessions.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Henüz konuşma yok</p>
                  <p className="text-xs text-muted-foreground">
                    Başlamak için yeni bir sohbet başlatın
                  </p>
                </div>
              )}
              <SidebarMenu>
                {((isLoading && sessions.length > 0) || (!isLoading && !error)) &&
                  sessions.map((session) => (
                    <SidebarMenuItem key={session.id}>
                      <div className="relative group">
                        <SidebarMenuButton
                          asChild
                          className="group/menu-button font-medium gap-3 h-9 rounded-md data-[active=true]:hover:bg-transparent data-[active=true]:bg-gradient-to-b data-[active=true]:from-sidebar-primary data-[active=true]:to-sidebar-primary/70 data-[active=true]:shadow-[0_1px_2px_0_rgb(0_0_0/.05),inset_0_1px_0_0_rgb(255_255_255/.12)] [&>svg]:size-auto"
                          isActive={isActive(`/chat/${session.id}`)}
                        >
                          <Link href={`/chat/${session.id}`}>
                            <span className="truncate">
                              {getSessionTitle(session)}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                        <DropdownMenu
                          open={dropdownOpen[session.id] || false}
                          onOpenChange={(open) =>
                            setDropdownOpen((prev) => ({
                              ...prev,
                              [session.id]: open,
                            }))
                          }
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 transition-opacity h-8 w-8 p-0",
                                dropdownOpen[session.id] || false
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100"
                              )}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSessionToDelete(session.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="flex items-center">
        <Icons.aciklab className="w-48" />
      </SidebarFooter>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sohbeti Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu sohbeti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (sessionToDelete) {
                  await deleteSession(sessionToDelete);
                  setDeleteDialogOpen(false);
                  setSessionToDelete(null);
                }
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
