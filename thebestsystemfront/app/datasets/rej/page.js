"use client";

import DataTable from "../../components/DataTable";
import { datasetColumns } from "../../lib/datasetColumns";

export default function RejectionPage() {
  return <DataTable tableKey="rejection" title="Rejection" columns={datasetColumns.rejection} />;
}
