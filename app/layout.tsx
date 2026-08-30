import * as React from "react";

export const metadata = {
  title: "mail-service",
  description: "Transactional email API",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
