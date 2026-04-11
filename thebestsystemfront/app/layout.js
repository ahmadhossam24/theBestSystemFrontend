// app/layout.js
import Sidebar from "./components/sidebar";
import "./globals.css"; // Your global styles

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", height: "100vh" }}>
          {/* The Sidebar stays here permanently */}
          <Sidebar /> 
          
          <main style={{ flex: 1, padding: "24px", background: "#f8fafc", overflow: "auto" }}>
            <div style={{ background: "white", borderRadius: "24px", padding: "24px", minHeight: "100%" }}>
              {/* This 'children' represents the content of whichever page.js you navigate to */}
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
