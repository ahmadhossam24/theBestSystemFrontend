"use client";

import DataTable from "../../components/DataTable";
import { datasetColumns } from "../../lib/datasetColumns";

export default function CleanDeactivationPage() {
  return <DataTable tableKey="cleanDeactivation" title="Clean deactivation" columns={datasetColumns.cleanDeactivation} />;
}
