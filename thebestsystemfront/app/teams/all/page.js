"use client";
import OrgGate from "../../components/org/OrgGate.jsx";
import TeamsView from "../../components/org/TeamsView.jsx";

export default function Page() {
  return <OrgGate>{({ actor }) => <TeamsView actor={actor} mode="active" />}</OrgGate>;
}
