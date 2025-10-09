"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import * as React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");
  const { sessions, isLoading, isRefreshing, error, deleteSession } = useUserSessions();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({});
  const router = useRouter();

  const getSessionTitle = (session: any) => {
    // Prefer summary if available
    if (session.summary && session.summary.trim()) {

      return session.summary.length > 30 ? session.summary.substring(0, 30) + "..." : session.summary;
    }
    
    // Fallback to first user message
    if (session.messages && session.messages.length > 0) {
      const firstUserMessage = session.messages.find(
        (msg: any) => msg.role === "user"
      );
      if (firstUserMessage) {
        return firstUserMessage.content.length > 30
          ? firstUserMessage.content.substring(0, 30) + "..."
          : firstUserMessage.content;
      }
    }
    
    // Final fallback
    return t("sidebar.chat_with", { name: session.chatbot?.name || "Assistant" });
  };

  const isActive = (path: string) => {
    return router.asPath === path;
  };
  return (
    <Sidebar {...props} className="dark !border-none">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 leading-tight">
          <Icons.logo className="size-18 ml-[0.7rem] -mt-2 -mb-3" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-sidebar-foreground/50 ml-[0.4rem]">
            {t("sidebar.general")}
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
                    <span>{t("sidebar.new_chat")}</span>
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
                    <span>{t("sidebar.settings")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chat Sessions */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-sidebar-foreground/50 flex items-center gap-2 ml-[0.4rem]">
            {t("sidebar.chats")}
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
                      {t("sidebar.loading_error", { error })}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              {!isLoading && !error && sessions.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t("sidebar.no_chats")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("sidebar.start_new_chat")}
                  </p>
                </div>
              )}
              <SidebarMenu>
                {((isLoading && sessions.length > 0) || (!isLoading && !error)) &&
                  sessions.map((session) => (
                    <SidebarMenuItem key={session.id}>
                      <div className="relative group/session">
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
                              variant="secondary"
                              size="sm"
                              className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 transition-opacity h-8 w-8 p-0",
                                dropdownOpen[session.id] || false
                                  ? "opacity-100"
                                  : "opacity-0 group-hover/session:opacity-100"
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
                              {t("sidebar.delete")}
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
            <AlertDialogTitle>{t("sidebar.delete_chat")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("sidebar.delete_confirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("sidebar.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (sessionToDelete) {
                  await deleteSession(sessionToDelete);
                  setDeleteDialogOpen(false);
                  setSessionToDelete(null);
                }
              }}
            >
              {t("sidebar.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
