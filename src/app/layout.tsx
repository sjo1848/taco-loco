import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taco Loco",
  description: "Menú digital de Taco Loco Foodtrack",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
