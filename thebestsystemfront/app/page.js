"use client";

import { useState } from "react";
import Sidebar from "./components/sidebar";

export default function DashboardLayout({ children }) {
  const [activeItem, setActiveItem] = useState("dashboard");

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar activeItemId={activeItem} onSelectItem={setActiveItem} />
      <main style={{ flex: 1, padding: "24px", background: "#f8fafc", overflow: "auto" }}>
        <div style={{ background: "white", borderRadius: "24px", padding: "24px" }}>
          <h2>Active: {activeItem}</h2>
          <p>Content changes based on selected menu item.</p>
        </div>
        {children}
      </main>
    </div>
  );
}