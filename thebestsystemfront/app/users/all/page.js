"use client";
import OrgGate from "../../components/org/OrgGate.jsx";
import UsersView from "../../components/org/UsersView.jsx";

export default function Page() {
  return <OrgGate>{({ actor }) => <UsersView actor={actor} mode="active" />}</OrgGate>;
}
