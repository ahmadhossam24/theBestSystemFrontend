// Shared option lists
export const AGENT_OPTIONS = ["", "Nour", "Sara", "Emad"];
export const FEEDBACK_OPTIONS = ["", "Accept", "No Answer", "Next time"];

// Columns every dataset table ends with, in this order
const trailingColumns = [
  { key: "agent", label: "Agent", type: "select", options: AGENT_OPTIONS },
  { key: "feedback", label: "Feedback", type: "select", options: FEEDBACK_OPTIONS },
  { key: "agentNotes", label: "Agent notes" },
  { key: "uploadDate", label: "Upload date" },
];

const base = [
  { key: "landline", label: "Landline" },
  { key: "name", label: "Name" },
  { key: "contactPhone", label: "Contact phone" },
];

export const datasetColumns = {
  rejection: [
    ...base,
    { key: "rejReason", label: "Rej reason" },
    ...trailingColumns,
  ],
  clean: [
    ...base,
    ...trailingColumns,
  ],
  cleanDeactivation: [
    ...base,
    { key: "amount", label: "Amount" },
    { key: "deactivationState", label: "Deactivation state" },
    ...trailingColumns,
  ],
  new: [
    ...base,
    { key: "address", label: "Address" },
    ...trailingColumns,
  ],
  cancellation: [
    ...base,
    { key: "cancellationDate", label: "Cancellation date", type: "date" },
    { key: "sellerName", label: "Seller name" },
    ...trailingColumns,
  ],
};

// Filters shown above each table. "select" -> single dropdown, exact match.
// "dateRange" -> two date inputs; value is compared against the first 10
// chars of the row's value, so the underlying string must start "YYYY-MM-DD".
const baseFilters = [
  { key: "agent", label: "Agent", type: "select", options: AGENT_OPTIONS.filter(Boolean) },
  { key: "feedback", label: "Feedback", type: "select", options: FEEDBACK_OPTIONS.filter(Boolean) },
  { key: "uploadDate", label: "Upload date", type: "dateRange" },
];

export const datasetFilters = {
  rejection: baseFilters,
  clean: baseFilters,
  cleanDeactivation: baseFilters,
  new: baseFilters,
  cancellation: [...baseFilters, { key: "cancellationDate", label: "Cancellation date", type: "dateRange" }],
};
