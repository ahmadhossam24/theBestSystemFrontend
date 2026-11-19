// app/layout.js
import AppShell from "./components/org/AppShell";
import "./globals.css"; // Your global styles

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* AppShell: sign-in check, the permanent Sidebar, and the page area */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
