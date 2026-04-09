"use client";

import { useState } from "react";
import {
  FaTachometerAlt,
  FaCodeBranch,
  FaUsers,
  FaUser,
  FaDatabase,
  FaChartLine,
  FaCog,
  FaHistory,
  FaList,
  FaPlusCircle,
  FaSlidersH,
  FaUserPlus,
  FaShieldAlt,
  FaTable,
  FaPlug,
  FaArchive,
  FaChartPie,
  FaDollarSign,
  FaGlobe,
  FaLock,
  FaPalette,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import "./sidebar.css";

const sections = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FaTachometerAlt,
    hasSubmenu: false,
  },
  {
    id: "branches",
    label: "Branches",
    icon: FaCodeBranch,
    hasSubmenu: true,
    submenuItems: [
      { id: "branches-all", label: "All Branches", icon: FaList },
      { id: "branches-add", label: "Add Branch", icon: FaPlusCircle },
      { id: "branches-settings", label: "Branch Settings", icon: FaSlidersH },
    ],
  },
  {
    id: "teams",
    label: "Teams",
    icon: FaUsers,
    hasSubmenu: true,
    submenuItems: [
      { id: "teams-all", label: "All Teams", icon: FaUsers },
      { id: "teams-create", label: "Create Team", icon: FaUserPlus },
      { id: "teams-members", label: "Team Members", icon: FaUser },
    ],
  },
  {
    id: "users",
    label: "Users",
    icon: FaUser,
    hasSubmenu: true,
    submenuItems: [
      { id: "users-all", label: "All Users", icon: FaUsers },
      { id: "users-roles", label: "Roles", icon: FaShieldAlt },
      { id: "users-permissions", label: "Permissions", icon: FaLock },
    ],
  },
  {
    id: "data",
    label: "Data",
    icon: FaDatabase,
    hasSubmenu: true,
    submenuItems: [
      { id: "data-datasets", label: "Datasets", icon: FaTable },
      { id: "data-integrations", label: "Integrations", icon: FaPlug },
      { id: "data-backups", label: "Backups", icon: FaArchive },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FaChartLine,
    hasSubmenu: true,
    submenuItems: [
      { id: "reports-analytics", label: "Analytics", icon: FaChartPie },
      { id: "reports-revenue", label: "Revenue", icon: FaDollarSign },
      { id: "reports-user-reports", label: "User Reports", icon: FaChartLine },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: FaCog,
    hasSubmenu: true,
    submenuItems: [
      { id: "settings-general", label: "General", icon: FaGlobe },
      { id: "settings-security", label: "Security", icon: FaLock },
      { id: "settings-appearance", label: "Appearance", icon: FaPalette },
    ],
  },
  {
    id: "auditlog",
    label: "Audit Log",
    icon: FaHistory,
    hasSubmenu: false,
  },
];

export default function Sidebar({ activeItemId, onSelectItem }) {
  const [expandedSections, setExpandedSections] = useState(() => {
    const initial = {};
    sections.forEach((section) => {
      if (section.hasSubmenu) initial[section.id] = true;
    });
    return initial;
  });

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleClick = (itemId) => {
    if (onSelectItem) onSelectItem(itemId);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>NexusCore</h1>
        <p>control panel</p>
      </div>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {sections.map((section) => (
            <li key={section.id} className="nav-item">
              <div
                className={`nav-header ${
                  activeItemId === section.id ||
                  (section.hasSubmenu &&
                    section.submenuItems?.some(
                      (sub) => sub.id === activeItemId
                    ))
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  if (!section.hasSubmenu) {
                    handleClick(section.id);
                  } else {
                    toggleSection(section.id);
                  }
                }}
              >
                <div className="nav-header-left">
                  <section.icon className="nav-icon" />
                  <span>{section.label}</span>
                </div>
                {section.hasSubmenu && (
                  <span className="chevron">
                    {expandedSections[section.id] ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    )}
                  </span>
                )}
              </div>

              {section.hasSubmenu && expandedSections[section.id] && (
                <ul className="submenu">
                  {section.submenuItems.map((sub) => (
                    <li key={sub.id}>
                      <div
                        className={`submenu-item ${
                          activeItemId === sub.id ? "active" : ""
                        }`}
                        onClick={() => handleClick(sub.id)}
                      >
                        <sub.icon className="sub-icon" />
                        <span>{sub.label}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <small>© 2025 · Collapsible UI</small>
      </div>
    </aside>
  );
}