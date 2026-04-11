// app/components/TeamsTable.js
"use client";

export default function TeamsTable({ teams = [] }) {
  return (
    <table>
      <thead>
        <tr><th>Name</th><th>Location</th></tr>
      </thead>
      <tbody>
        {teams.map(b => (
          <tr key={b.id}>
            <td>{b.name}</td>
            <td>{b.location}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}