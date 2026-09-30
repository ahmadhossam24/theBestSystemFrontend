"use client";

import DataTable from "../components/DataTable";
import { acceptsColumns } from "../lib/destinationColumns";

export default function AcceptsPage() {
  return (
    <DataTable
      tableKey="accepts"
      title="Accepts"
      subtitle="Rows marked Accept, copied in from every dataset table."
      columns={acceptsColumns}
    />
  );
}
