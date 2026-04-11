// app/components/UsersTable.js
"use client";

export default function UsersTable({ users = [] }) {
  return (
    <table>
      <thead>
        <tr><th>Name</th><th>Location</th></tr>
      </thead>
      <tbody>
        {users.map(b => (
          <tr key={b.id}>
            <td>{b.name}</td>
            <td>{b.location}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}