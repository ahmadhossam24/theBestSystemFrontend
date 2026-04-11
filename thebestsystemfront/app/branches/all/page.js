// app/branches/all/page.js
import BranchesTable from "@/app/components/BranchesTable";

async function getBranches() {
  // Replace with your actual data fetching logic
  return [
    { id: 1, name: "Main Office", location: "New York" },
    { id: 2, name: "West Coast", location: "Los Angeles" },
  ];
}

export default async function BranchesPage() {
  const branches = await getBranches();
  
  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>All Branches</h1>
      <BranchesTable branches={branches} />
    </div>
  );
}