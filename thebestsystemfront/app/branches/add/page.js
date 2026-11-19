"use client";
import OrgGate from "../../components/org/OrgGate.jsx";
import BranchesView from "../../components/org/BranchesView.jsx";

export default function Page() {
  return <OrgGate>{({ actor }) => <BranchesView actor={actor} mode="active" startAdding />}</OrgGate>;
}
