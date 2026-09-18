import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://briaspas-scale.vercel.app"),
  title: {
    default: "Briaspas Scale | Prospecção com sites-demo e CRM",
    template: "%s | Briaspas Scale",
  },
  description: "Encontre negócios locais, apresente sites personalizados e acompanhe cada oportunidade até o fechamento.",
  applicationName: "Briaspas Scale",
  openGraph: {
    title: "Briaspas Scale | Prospecção com sites-demo e CRM",
    description: "Da busca de empresas ao fechamento, sem perder o contexto comercial.",
    url: "/",
    siteName: "Briaspas Scale",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Briaspas Scale | Prospecção com sites-demo e CRM",
    description: "Encontre empresas, apresente sites personalizados e avance no CRM.",
  },
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
