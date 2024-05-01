import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@dmno/nextjs-integration/inject';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} p-6`}>
        <h1>DMNO + nextjs example</h1>
        <nav>
          <a href="/client-page">client rendered page</a>
          |||| 
          <a href="/server-page">server rendered page</a>
          ||||

          <a href="/api">json api endpoint</a>
        </nav>
        <hr className="my-4" />

        {children}        
      </body>
    </html>
  );
}