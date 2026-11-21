"use client";
import OrgGate from "../components/org/OrgGate.jsx";
import ExportView from "../components/org/ExportView.jsx";

export default function Page() {
  return <OrgGate>{({ actor }) => <ExportView actor={actor} />}</OrgGate>;
}
