import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { ArchiveIcon, InboxIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { AddContentDialog } from "./add-content-dialog";
import { Button } from "./ui/button";

type XSidebarProps = {};

export function XSidebar(props: XSidebarProps) {

  const chats = [
    { id: 1, title: "Pros and Cons of Sony WF-1000XM5 Wireless Headphones" },
    { id: 2, title: "Popular Advice for 20 Year Olds" },
    { id: 3, title: "The Future of AI in Everyday Life" },
    { id: 4, title: "Top 10 Travel Destinations for 2024" },
    { id: 5, title: "Healthy Eating on a Budget" },
    { id: 6, title: "The Impact of Social Media on Mental Health" },
    { id: 7, title: "How to Start a Successful Side Hustle" },
    { id: 8, title: "Understanding Cryptocurrency and Blockchain" },
    { id: 9, title: "The Benefits of Mindfulness and Meditation" },
    { id: 10, title: "Sustainable Living Tips for Beginners" },
  ]

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="pt-2 px-4 flex flex-row items-center justify-between">
          <Link to="/">
            <span className="text-lg font-bold">readr</span>
          </Link>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </div>
      </SidebarHeader>
      <SidebarContent className="mt-4 mx-4">
        <AddContentDialog />

        <SidebarMenu className="mt-3 gap-1">
          <Link to="/">
            <SidebarMenuButton className="pl-4 flex flex-row items-center gap-3">
              <InboxIcon className="mr-2 size-[18px]" />
              <span className="text-sm font-medium">inbox</span>
            </SidebarMenuButton>
          </Link>
          <Link to="/archive">
            <SidebarMenuButton className="pl-4 flex flex-row items-center gap-3">
              <ArchiveIcon className="mr-2 size-[18px]" />
              <span className="text-sm font-medium">archive</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenu>

        <div className="mt-0.5" />

        <div className="pl-2 flex flex-row items-center justify-between">
          <span className="text-base font-semibold">
            chats
          </span>
          <Button variant="ghost" size="sm" className="opacity-50 hover:opacity-100">
            <Link to="/chat/new">
              + new chat
            </Link>
          </Button>
        </div>
        <SidebarMenu className="gap-1">
          <SignedIn>
            {chats.map(chat => (
              <Link to={`/chat/${chat.id}`} key={chat.id}>
                <SidebarMenuButton className="flex flex-row items-center gap-3">
                  <span className="text-sm text-muted-foreground font-medium truncate">{chat.title}</span>
                </SidebarMenuButton>
              </Link>
            ))}
          </SignedIn>
          <SignedOut>
            <div className="p-4 text-sm text-muted-foreground">
              Sign in to see your chats.
            </div>
          </SignedOut>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <span className="pl-1 text-xs text-muted-foreground font-medium">v0.0.1-alpha</span>
      </SidebarFooter>
    </Sidebar>
  );
}
