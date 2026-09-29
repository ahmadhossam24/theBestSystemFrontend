"use client";

import DataTable from "../../components/DataTable";
import { datasetColumns } from "../../lib/datasetColumns";

export default function CleanPage() {
  return <DataTable tableKey="clean" title="Clean" columns={datasetColumns.clean} />;
}
