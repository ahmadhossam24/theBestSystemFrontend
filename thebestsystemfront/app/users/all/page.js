// app/users/all/page.js
import UsersTable from "@/app/components/UsersTable";

async function getUsers() {
  // Replace with your actual data fetching logic
  return [
    { id: 1, name: "user 1"},
    { id: 2, name: "user 2"},
  ];
}

export default async function UsersPage() {
  const users = await getUsers();
  
  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>All Users</h1>
      <UsersTable users={users} />
    </div>
  );
}