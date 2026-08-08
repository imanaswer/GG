import type { CategoryKey, BookingRow } from "./types";
import type { RowActionDef } from "@/components/admin/bookings/BookingDrawer";
import type { BulkActionDef } from "@/components/admin/bookings/BulkActionBar";
import { EVENT_STATUS_LABELS } from "./status";

export interface ColumnDef { key: string; header: string; render: (r: BookingRow) => string; }

export interface CategoryConfig {
  key: CategoryKey;
  label: string;
  apiPath: string;
  dateMode: "calendar" | "weekday";
  columns: ColumnDef[];
  rowActions: RowActionDef[];
  bulkActions: BulkActionDef[];
  statusLabels?: Record<string, string>;
}

const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-IN") : "—";

export const CATEGORY_CONFIGS: Record<CategoryKey, CategoryConfig> = {
  coaches: {
    key: "coaches", label: "Coaches", apiPath: "/api/admin/bookings/coaches",
    dateMode: "weekday",
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "coach", header: "Coach", render: r => r.entityName },
      { key: "session", header: "Session", render: r => r.extra.session ?? "—" },
      { key: "created", header: "Created", render: r => fmtDate(r.createdAt) },
    ],
    rowActions: [
      { action: "approve", label: "Approve" },
      { action: "reject", label: "Reject", danger: true, needsReason: true },
      { action: "complete", label: "Mark Completed" },
      { action: "cancel", label: "Cancel", danger: true },
      // Coach bookings could be flagged refund-due but never closed out — the
      // status was terminal by omission. This is the exit.
      { action: "mark-refunded", label: "Mark Refunded" },
    ],
    bulkActions: [
      { action: "approve", label: "Approve" },
      { action: "reject", label: "Reject", danger: true },
      { action: "cancel", label: "Cancel", danger: true },
      { action: "mark-refunded", label: "Mark Refunded" },
    ],
  },
  "play-sessions": {
    key: "play-sessions", label: "Play Sessions", apiPath: "/api/admin/bookings/play-sessions",
    dateMode: "calendar",
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "game", header: "Game", render: r => r.entityName },
      { key: "sport", header: "Sport", render: r => r.extra.sport ?? "—" },
      { key: "date", header: "Date", render: r => fmtDate(r.sessionDate) },
    ],
    rowActions: [
      { action: "mark-attended", label: "Mark Attended" },
      { action: "mark-no-show", label: "Mark No-show", danger: true },
      { action: "cancel", label: "Cancel", danger: true },
    ],
    bulkActions: [
      { action: "mark-attended", label: "Mark Attended" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
  },
  workshops: {
    key: "workshops", label: "Workshops", apiPath: "/api/admin/bookings/workshops",
    dateMode: "calendar",
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "workshop", header: "Workshop", render: r => r.entityName },
      { key: "participant", header: "Participant", render: r => r.extra.participant ?? "—" },
      { key: "created", header: "Created", render: r => fmtDate(r.createdAt) },
    ],
    rowActions: [
      { action: "mark-paid", label: "Mark Paid" },
      { action: "mark-refunded", label: "Mark Refunded" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
    bulkActions: [
      { action: "mark-paid", label: "Mark Paid" },
      { action: "mark-refunded", label: "Mark Refunded" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
  },
  camps: {
    key: "camps", label: "Camps", apiPath: "/api/admin/bookings/camps",
    dateMode: "calendar",
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "camp", header: "Camp", render: r => r.entityName },
      { key: "child", header: "Child", render: r => r.extra.child ?? "—" },
      { key: "created", header: "Created", render: r => fmtDate(r.createdAt) },
    ],
    rowActions: [
      { action: "mark-paid", label: "Mark Paid" },
      { action: "mark-refunded", label: "Mark Refunded" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
    bulkActions: [
      { action: "mark-paid", label: "Mark Paid" },
      { action: "mark-refunded", label: "Mark Refunded" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
  },
  events: {
    key: "events", label: "Events", apiPath: "/api/admin/bookings/events",
    dateMode: "calendar",
    statusLabels: EVENT_STATUS_LABELS,
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "event", header: "Event", render: r => r.entityName },
      { key: "team", header: "Team", render: r => r.extra.team ?? "—" },
      { key: "payment", header: "Payment", render: r => r.payment?.status ?? "—" },
      { key: "created", header: "Created", render: r => fmtDate(r.createdAt) },
    ],
    rowActions: [
      { action: "approve", label: "Approve" },
      { action: "reject", label: "Reject", danger: true, needsReason: true },
      { action: "refund", label: "Refund", danger: true },
      { action: "cancel", label: "Cancel", danger: true },
      { action: "mark-refunded", label: "Mark Refunded" },
    ],
    bulkActions: [
      { action: "approve", label: "Approve" },
      { action: "reject", label: "Reject", danger: true },
      { action: "cancel", label: "Cancel", danger: true },
      { action: "mark-refunded", label: "Mark Refunded" },
    ],
  },
};
