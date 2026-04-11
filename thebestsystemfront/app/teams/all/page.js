// app/teams/all/page.js
import TeamsTable from "@/app/components/TeamsTable";

async function getTeams() {
  // Replace with your actual data fetching logic
  return [
    { id: 1, name: "vodafone"},
    { id: 2, name: "orange"},
  ];
}

export default async function TeamsPage() {
  const teams = await getTeams();
  
  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>All Teams</h1>
      <TeamsTable teams={teams} />
    </div>
  );
}