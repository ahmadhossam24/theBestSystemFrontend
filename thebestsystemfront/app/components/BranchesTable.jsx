// app/components/BranchesTable.js
"use client";

export default function BranchesTable({ branches = [] }) {
  return (
    <table>
      <thead>
        <tr><th>Name</th><th>Location</th></tr>
      </thead>
      <tbody>
        {branches.map(b => (
          <tr key={b.id}>
            <td>{b.name}</td>
            <td>{b.location}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
