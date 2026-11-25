import type { RotaSection } from "./sections";

export type Role = {
  id: string;
  name: string;
  rate_gbp: number;
  sort_order: number;
  section: RotaSection;
};

export type Shift = {
  id: string;
  slot_id: string;
  day_index: number;
  start_time: string | null;
  end_time: string | null;
};

export type StaffSlot = {
  id: string;
  week_id: string;
  role_id: string;
  person_name: string;
  rate_gbp: number;
  sort_order: number;
  role_name?: string;
  shifts: Shift[];
};

export type WeekDay = {
  id: string;
  week_id: string;
  day_index: number;
  event_name: string;
};

export type WeekSummary = {
  id: string;
  week_start: string;
  label: string;
  notes: string;
  archived: boolean;
  section: RotaSection;
  created_at: string;
  updated_at: string;
  total_hours: number;
  total_cost: number;
  event_names: string[];
};

export type WeekDetail = {
  id: string;
  week_start: string;
  label: string;
  notes: string;
  archived: boolean;
  section: RotaSection;
  days: WeekDay[];
  slots: StaffSlot[];
  roles: Role[];
};
