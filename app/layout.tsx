import { Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "./broadsheet.css";
import "./portal.css";
import "./reader.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
});

export const metadata = {
  title: "Voice to Text",
  description: "Speak, pin your notes, or paste an article link and listen with a free local voice.",
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
