import "./globals.css";

export const metadata = {
  title: "OnceOnly Dashboard",
  description: "Developer-first exactly-once dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
