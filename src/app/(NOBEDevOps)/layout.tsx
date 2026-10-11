import type { Metadata } from "next";
import "./globals.css";

//Hello!!
export const metadata: Metadata = {
  title: "NOBE Illinois Portal",
  description: "National Organization for Business and Engineering - University of Illinois Attendance & Compliance Portal",
  icons: {
    icon: "/nobe_logo_f.svg",
  },
};

// <html>/<body> and fonts live in src/app/layout.tsx; this layout only adds NOBE styles and metadata.
export default function NOBELayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
