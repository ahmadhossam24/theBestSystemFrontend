// components/sidebar.jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  FaTrash,
  FaStar,
  FaDoorOpen,
  FaRecycle,
} from "react-icons/fa";
import "./sidebar.css";
import { ImCross } from "react-icons/im";
import { SiTicktick } from "react-icons/si";

const sections = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FaTachometerAlt,
    hasSubmenu: false,
    path: "/xxx"
  },
  {
    id: "branches",
    label: "Branches",
    icon: FaCodeBranch,
    hasSubmenu: true,
    submenuItems: [
      { id: "branches-all", label: "All Branches", icon: FaList ,path: "/branches/all"},
      { id: "branches-all", label: "Deleted Branches", icon: FaList ,path: "/branches/deleted"},
      { id: "branches-add", label: "Add Branch", icon: FaPlusCircle ,path: "/branches/add"},
      { id: "branches-settings", label: "Branch Settings", icon: FaSlidersH ,path:"/branches/settings"}
    ],
  },
  {
    id: "teams",
    label: "Teams",
    icon: FaUsers,
    hasSubmenu: true,
    submenuItems: [
      { id: "teams-all", label: "All Teams", icon: FaUsers,path: "/teams/all" },
      { id: "teams-all", label: "Deleted Teams", icon: FaUsers,path: "/teams/deleted" },
      { id: "teams-create", label: "Create Team", icon: FaUserPlus,path: "/teams/add" },
      { id: "teams-members", label: "Team Members", icon: FaUser,path: "/teams/members" },
    ],
  },
  {
    id: "users",
    label: "Users",
    icon: FaUser,
    hasSubmenu: true,
    submenuItems: [
      { id: "users-all", label: "All Users", icon: FaUsers ,path: "/users/all"},
      { id: "users-all", label: "Deleted Users", icon: FaUsers ,path: "/users/deleted"},
      { id: "users-roles", label: "Roles", icon: FaShieldAlt,path: "/users/roles" },
      { id: "users-permissions", label: "Permissions", icon: FaLock,path: "/users/permissions" },
    ],
  },
  {
    id: "data",
    label: "Data",
    icon: FaDatabase,
    hasSubmenu: true,
    submenuItems: [
      { id: "data-datasets", label: "Datasets", icon: FaTable,hasSubmenu:true, 
        submenuItems:[
          { id: "datasets-rej", label: "Rejection", icon: ImCross,path: "/datasets/rej" },
          { id: "datasets-clean", label: "Clean", icon: FaStar ,path: "/datasets/clean"},
          { id: "datasets-cleandeactivation", label: "Clean Deactiv.", icon: FaDoorOpen ,path: "/datasets/cleandeactivation"},
          { id: "datasets-new", label: "New", icon: SiTicktick ,path: "/datasets/new"},
          { id: "datasets-cancellation", label: "Cancellation", icon: FaRecycle ,path: "/datasets/cancellation"},
        ] },
      { id: "data-integrations", label: "To Create", icon: FaPlug,path: "/create-table" },
      { id: "data-backups", label: "Collection", icon: FaArchive ,path: "/collection-table"},
      { id: "data-backosassaps", label: "Mail Response", icon: FaChartLine ,path: "/mail-response"},
      { id: "data-trash", label: "Trash", icon: FaTrash ,path: "/trash-table"},
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FaChartLine,
    hasSubmenu: true,
    submenuItems: [
      { id: "reports-analytics", label: "Analytics", icon: FaChartPie ,path: "/xxx"},
      { id: "reports-revenue", label: "Revenue", icon: FaDollarSign ,path: "/xxx"},
      { id: "reports-user-reports", label: "User Reports", icon: FaChartLine ,path: "/xxx"},
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: FaCog,
    hasSubmenu: true,
    submenuItems: [
      { id: "settings-general", label: "General", icon: FaGlobe ,path: "/xxx"},
      { id: "settings-security", label: "Security", icon: FaLock ,path: "/xxx"},
      { id: "settings-appearance", label: "Appearance", icon: FaPalette ,path: "/xxx"},
    ],
  },
  {
    id: "auditlog",
    label: "Audit Log",
    icon: FaHistory,
    hasSubmenu: false,
    path: "/xxx"
  },
];

export default function Sidebar() {
  const pathname = usePathname(); // Gets the current URL path
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const isItemActive = (item) => {
    if (item.path && pathname === item.path) return true;
    if (item.submenuItems) {
      return item.submenuItems.some(isItemActive);
    }
    return false;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>The Best</h1>
      </div>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {sections.map((section) => {
            const isSectionActive = pathname === section.path || 
              section.submenuItems?.some(sub => pathname === sub.path);
            return (
              <li key={section.id} className="nav-item">
                {!section.hasSubmenu ? (
                  <Link 
                    href={section.path} 
                    className={`nav-header ${isSectionActive ? "active" : ""}`}
                  >
                    <section.icon className="nav-icon" />
                    <span>{section.label}</span>
                  </Link>
                ) : (
                  <div 
                    className={`nav-header ${isSectionActive ? "active" : ""}`}
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="nav-header-left">
                      <section.icon className="nav-icon" />
                      <span>{section.label}</span>
                    </div>
                    {/* ... chevron logic ... */}
                  </div>
                )}
                {section.hasSubmenu && expandedSections[section.id] && (
                  <ul className="submenu">
                    {section.submenuItems.map((sub) => (
                      <li key={sub.id}>
                        {sub.hasSubmenu ? (
                          <>
                            <div
                              className={`submenu-item ${isItemActive(sub) ? "active" : ""}`}
                              onClick={() => toggleSection(sub.id)}
                            >
                              <sub.icon className="sub-icon" />
                              <span>{sub.label}</span>
                            </div>

                            {expandedSections[sub.id] && (
                              <ul className="nested-submenu">
                                {sub.submenuItems.map((child) => (
                                  <li key={child.id}>
                                    <Link
                                      href={child.path}
                                      className={`submenu-submenu-item ${pathname === child.path ? "active" : ""}`}
                                    >
                                      <child.icon className="sub-icon" />
                                      <span>{child.label}</span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : sub.path ? (
                          <Link
                            href={sub.path}
                            className={`submenu-item ${pathname === sub.path ? "active" : ""}`}
                          >
                            <sub.icon className="sub-icon" />
                            <span>{sub.label}</span>
                          </Link>
                        ) : (
                          <div className="submenu-item">
                            <sub.icon className="sub-icon" />
                            <span>{sub.label}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}