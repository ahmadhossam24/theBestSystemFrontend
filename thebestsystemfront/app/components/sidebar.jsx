// components/sidebar.jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  FaChartPie,
  FaDollarSign,
  FaGlobe,
  FaLock,
  FaPalette,
} from "react-icons/fa";
import { BsWrenchAdjustable } from "react-icons/bs";
import "./sidebar.css";
import { useTables } from "../setup-table/hooks/useTables";

// The "Data" menu is GENERATED from the tables made on the Setup Table page:
//   Data
//     Datasets  -> one entry per dataset table
//     <general table>, <general table>, ...
// Everything else is fixed.
function buildSections(tables, loaded) {
  const datasets = tables.filter((t) => t.tableType === "dataset");
  const generals = tables.filter((t) => t.tableType === "general");
  const link = (t, icon) => ({ id: `table-${t.id}`, label: t.name, icon, path: `/tables/${t.id}` });

  const dataItems = [
    {
      id: "data-datasets",
      label: "Datasets",
      icon: FaTable,
      hasSubmenu: true,
      submenuItems: datasets.length
        ? datasets.map((t) => link(t, FaTable))
        : [{ id: "datasets-none", label: loaded ? "No datasets yet" : "Loading…", icon: FaTable, path: loaded ? "/setup-table" : undefined }],
    },
    ...generals.map((t) => link(t, FaList)),
  ];
  if (loaded && generals.length === 0) {
    dataItems.push({ id: "general-none", label: "No general tables yet", icon: FaList, path: "/setup-table" });
  }

  return [
    { id: "dashboard", label: "Dashboard", icon: FaTachometerAlt, hasSubmenu: false, path: "/xxx" },
    {
      id: "branches",
      label: "Branches",
      icon: FaCodeBranch,
      hasSubmenu: true,
      submenuItems: [
        { id: "branches-all", label: "All Branches", icon: FaList, path: "/branches/all" },
        { id: "branches-deleted", label: "Deleted Branches", icon: FaList, path: "/branches/deleted" },
        { id: "branches-add", label: "Add Branch", icon: FaPlusCircle, path: "/branches/add" },
        { id: "branches-settings", label: "Branch Settings", icon: FaSlidersH, path: "/branches/settings" },
      ],
    },
    {
      id: "teams",
      label: "Teams",
      icon: FaUsers,
      hasSubmenu: true,
      submenuItems: [
        { id: "teams-all", label: "All Teams", icon: FaUsers, path: "/teams/all" },
        { id: "teams-deleted", label: "Deleted Teams", icon: FaUsers, path: "/teams/deleted" },
        { id: "teams-create", label: "Create Team", icon: FaUserPlus, path: "/teams/add" },
        { id: "teams-members", label: "Team Members", icon: FaUser, path: "/teams/members" },
      ],
    },
    {
      id: "users",
      label: "Users",
      icon: FaUser,
      hasSubmenu: true,
      submenuItems: [
        { id: "users-all", label: "All Users", icon: FaUsers, path: "/users/all" },
        { id: "users-deleted", label: "Deleted Users", icon: FaUsers, path: "/users/deleted" },
        { id: "users-roles", label: "Roles", icon: FaShieldAlt, path: "/users/roles" },
        { id: "users-permissions", label: "Permissions", icon: FaLock, path: "/users/permissions" },
      ],
    },
    { id: "data", label: "Data", icon: FaDatabase, hasSubmenu: true, submenuItems: dataItems },
    { id: "setupTables", label: "Setup Table", icon: BsWrenchAdjustable, hasSubmenu: false, path: "/setup-table" },
    {
      id: "reports",
      label: "Reports",
      icon: FaChartLine,
      hasSubmenu: true,
      submenuItems: [
        { id: "reports-analytics", label: "Analytics", icon: FaChartPie, path: "/xxx" },
        { id: "reports-revenue", label: "Revenue", icon: FaDollarSign, path: "/xxx" },
        { id: "reports-user-reports", label: "User Reports", icon: FaChartLine, path: "/xxx" },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      icon: FaCog,
      hasSubmenu: true,
      submenuItems: [
        { id: "settings-general", label: "General", icon: FaGlobe, path: "/xxx" },
        { id: "settings-security", label: "Security", icon: FaLock, path: "/xxx" },
        { id: "settings-appearance", label: "Appearance", icon: FaPalette, path: "/xxx" },
      ],
    },
    { id: "auditlog", label: "Audit Log", icon: FaHistory, hasSubmenu: false, path: "/xxx" },
  ];
}

// A table's own pages (/tables/<id> and /tables/<id>/history/<row>) all light up its entry.
const pathMatches = (pathname, path) => !!path && (pathname === path || pathname.startsWith(path + "/"));

const itemActive = (pathname, item) =>
  pathMatches(pathname, item.path) || !!item.submenuItems?.some((s) => itemActive(pathname, s));

export default function Sidebar() {
  const pathname = usePathname();
  const { tables, loaded } = useTables();
  const sections = useMemo(() => buildSections(tables, loaded), [tables, loaded]);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Open the menus that contain the page you are on (never closes anything you opened).
  useEffect(() => {
    const open = {};
    const visit = (item) => {
      if (item.submenuItems && itemActive(pathname, item)) {
        open[item.id] = true;
        item.submenuItems.forEach(visit);
      }
    };
    sections.forEach(visit);
    if (Object.keys(open).length) setExpandedSections((prev) => ({ ...prev, ...open }));
  }, [pathname, sections]);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>The Best</h1>
      </div>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {sections.map((section) => {
            const isSectionActive = itemActive(pathname, section);
            return (
              <li key={section.id} className="nav-item">
                {!section.hasSubmenu ? (
                  <Link href={section.path} className={`nav-header ${isSectionActive ? "active" : ""}`}>
                    <section.icon className="nav-icon" />
                    <span>{section.label}</span>
                  </Link>
                ) : (
                  <div className={`nav-header ${isSectionActive ? "active" : ""}`} onClick={() => toggleSection(section.id)}>
                    <div className="nav-header-left">
                      <section.icon className="nav-icon" />
                      <span>{section.label}</span>
                    </div>
                  </div>
                )}
                {section.hasSubmenu && expandedSections[section.id] && (
                  <ul className="submenu">
                    {section.submenuItems.map((sub) => (
                      <li key={sub.id}>
                        {sub.hasSubmenu ? (
                          <>
                            <div className={`submenu-item ${itemActive(pathname, sub) ? "active" : ""}`} onClick={() => toggleSection(sub.id)}>
                              <sub.icon className="sub-icon" />
                              <span>{sub.label}</span>
                            </div>

                            {expandedSections[sub.id] && (
                              <ul className="nested-submenu">
                                {sub.submenuItems.map((child) => (
                                  <li key={child.id}>
                                    {child.path ? (
                                      <Link href={child.path} className={`submenu-submenu-item ${pathMatches(pathname, child.path) ? "active" : ""}`}>
                                        <child.icon className="sub-icon" />
                                        <span>{child.label}</span>
                                      </Link>
                                    ) : (
                                      <div className="submenu-submenu-item">
                                        <child.icon className="sub-icon" />
                                        <span>{child.label}</span>
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : sub.path ? (
                          <Link href={sub.path} className={`submenu-item ${pathMatches(pathname, sub.path) ? "active" : ""}`}>
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
