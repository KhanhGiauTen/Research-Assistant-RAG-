import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local Research Assistant RAG",
  description: "A local-first RAG chatbot for research papers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
