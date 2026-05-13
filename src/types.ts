export type RepairStatus = 'beérkezett' | 'javítás alatt' | 'alkatrészre vár' | 'kész' | 'átadva';

export interface RepairHistoryItem {
  status: RepairStatus;
  timestamp: string;
  note?: string;
}

export interface Repair {
  id: string;
  user_id?: string;
  customer_name: string;
  phone: string;
  machine_model: string;
  error_description: string;
  status: RepairStatus;
  estimated_completion?: string;
  history: RepairHistoryItem[];
  created_at: string;
  updated_at: string;
}

export type MachineStatus = 'elérhető' | 'eladva';

export interface Machine {
  id: string;
  model_name: string;
  price: number;
  description: string;
  image_url: string;
  status: MachineStatus;
  created_at: string;
}

export type AppointmentStatus = 'függőben' | 'visszaigazolva' | 'lemondva';

export interface Appointment {
  id: string;
  user_id?: string;
  customer_name: string;
  phone: string;
  machine_model: string;
  description: string;
  requested_date: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone_number: string;
  address?: string;
  is_admin: boolean;
  created_at: string;
}
