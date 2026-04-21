/**
 * Centralized staleTime constants for TanStack Query.
 * Use these to keep cache behaviour consistent across pages.
 */

// Master / lookup data (departments, wards, services, drugs, modalities, staff lists)
export const STALE_MASTER = 10 * 60 * 1000; // 10 min

// Operational lists (bills, admissions, patients, lab orders)
export const STALE_OPERATIONAL = 30 * 1000; // 30 sec

// Real-time data (beds, OPD queue, alerts, inbox)
export const STALE_REALTIME = 5 * 1000; // 5 sec

// Garbage-collect after 30 min of inactivity
export const GC_DEFAULT = 30 * 60 * 1000;
