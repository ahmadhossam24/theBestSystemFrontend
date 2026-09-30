"use client";

import DataTable from "../components/DataTable";
import { creationColumns } from "../lib/destinationColumns";

export default function CreationPage() {
  return (
    <DataTable
      tableKey="creation"
      title="Creation"
      subtitle="Rows marked Next time, copied in from every dataset table."
      columns={creationColumns}
    />
  );
}
