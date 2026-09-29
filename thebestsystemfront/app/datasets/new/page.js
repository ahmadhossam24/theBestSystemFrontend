"use client";

import DataTable from "../../components/DataTable";
import { datasetColumns } from "../../lib/datasetColumns";

export default function NewLeadsPage() {
  return <DataTable tableKey="new" title="New" columns={datasetColumns.new} />;
}
