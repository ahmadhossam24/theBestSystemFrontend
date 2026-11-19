"use client";
import OrgGate from "../../components/org/OrgGate.jsx";
import TeamMembersView from "../../components/org/TeamMembersView.jsx";

export default function Page() {
  return <OrgGate>{({ actor }) => <TeamMembersView actor={actor}  />}</OrgGate>;
}
