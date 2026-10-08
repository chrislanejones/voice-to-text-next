import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./broadsheet.css";
import "./portal.css";
import "./reader.css";
import "./dashboard.css";

const dashboardFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-dashboard",
});

export const metadata = {
  title: "VCE2TXT",
  description: "Speak, pin your notes, or paste an article link and listen with a free local voice.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={dashboardFont.variable}>
      <head />
      {/* Extensions like Grammarly add attributes to <body> before React loads. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
