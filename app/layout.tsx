import { Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "./broadsheet.css";
import "./portal.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
});

export const metadata = {
  title: "Voice to Text",
  description: "Speak, then clean it up, translate it, and pin it to your board.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={sourceSerif.variable}>
      <head />
      {/* Extensions like Grammarly add attributes to <body> before React loads. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
