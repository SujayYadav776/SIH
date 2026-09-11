"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  ClipboardCheck,
  Flag,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const nav = {
  analytics: [
    { title: "Overview", href: "/", icon: LayoutDashboard },
    { title: "Demand", href: "/demand", icon: TrendingUp },
    { title: "Cohorts", href: "/cohorts", icon: Users },
    { title: "Learners", href: "/learners", icon: GraduationCap },
    { title: "Learner journey", href: "/learner", icon: UserRound },
  ],
  programmes: [
    { title: "Interventions", href: "/interventions", icon: GraduationCap },
    { title: "Assessments", href: "/assessments", icon: ClipboardCheck },
    { title: "Outcomes", href: "/outcomes", icon: Flag },
  ],
  governance: [
    { title: "Data quality", href: "/data-quality", icon: ShieldAlert },
    { title: "Settings", href: "/settings", icon: Settings },
  ],
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" role="complementary" aria-label="Main navigation" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <Image
                  src="/brand/icon.png"
                  alt="Setu."
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-lg"
                  priority
                />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Setu.</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Northstar Institute
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarMenu>
            {nav.analytics.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(pathname, item.href)} tooltip={item.title}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Programmes</SidebarGroupLabel>
          <SidebarMenu>
            {nav.programmes.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(pathname, item.href)} tooltip={item.title}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Governance</SidebarGroupLabel>
          <SidebarMenu>
            {nav.governance.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(pathname, item.href)} tooltip={item.title}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">PC</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">Placement Coordinator</span>
                <span className="truncate text-xs text-muted-foreground">
                  coordinator@northstar.demo
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-60" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
