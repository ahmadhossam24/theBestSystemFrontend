"use client";

import DataTable from "../../components/DataTable";
import { datasetColumns } from "../../lib/datasetColumns";

export default function CancellationPage() {
  return <DataTable tableKey="cancellation" title="Cancellation" columns={datasetColumns.cancellation} />;
}
