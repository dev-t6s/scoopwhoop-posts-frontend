"use client"

import { Newspaper, FerrisWheel, DatabaseBackup, TrendingUpIcon } from "lucide-react"
import SWLogo from '@/public/Logo_Scoopwhoop.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import Image from "next/image"

// Menu items.
const items = [
  {
    title: "Trending",
    url: "/trending",
    icon: TrendingUpIcon,
  },
  {
    title: "News",
    url: "/",
    icon: Newspaper,
  },
  {
    title: "Posts",
    url: "/articles",
    icon: FerrisWheel,
  },
  {
    title: "Cache Validation",
    url: "/cache-validation",
    icon: DatabaseBackup,
  }
]

export function AppSidebar() {
  const { setOpen } = useSidebar()

  const handleMouseEnter = () => {
    setOpen(true)
  }

  const handleMouseLeave = () => {
    setOpen(false)
  }

  return (
    <Sidebar 
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="w-full rounded-md py-1 flex justify-center items-center">
              <Image
                src={SWLogo}
                className="w-32 h-auto rounded-md"
                alt="scoopwhoop logo"
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tabs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="p-5 py-7">
                      <item.icon style={{width:'1.2rem', height:'auto'}}/>
                      <span className="text-md">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}