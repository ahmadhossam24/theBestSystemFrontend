"use client";
import OrgGate from "../../components/org/OrgGate.jsx";
import PermissionsView from "../../components/org/PermissionsView.jsx";

export default function Page() {
  return <OrgGate>{({ actor }) => <PermissionsView actor={actor} />}</OrgGate>;
}
