import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SidebarProvider } from '@/components/ui/sidebar'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { AppSidebar } from '@/components/app-sidebar'
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "scoopwhoop",
  description: "scoopwhoop",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased p-4`}>
        <Toaster />
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <main>
            <div className="flex justify-start items-center gap-4">
              <Breadcrumbs />
            </div>
            <div>
              {children}
            </div>
          </main>
        </SidebarProvider>
      </body>
    </html>
  )
}