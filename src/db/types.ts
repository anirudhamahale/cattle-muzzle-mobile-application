import type { BreedType, HealthStatus, Sex, Species } from '@/constants/cattle';
import type { MuzzleShot } from '@/lib/muzzle/types';

export type Role = 'doctor' | 'owner';
export type OwnerType = 'gaushala' | 'farmer';

export type User = {
  id: string;
  role: Role;
  owner_type: OwnerType | null;
  name: string;
  phone: string;
  org_name: string | null;
  registration_no: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  created_at: string;
};

export type UserRow = User & { password_hash: string; salt: string };

export type CattleRow = {
  id: string;
  owner_id: string;
  created_by: string;
  name: string | null;
  tag_number: string | null;
  species: Species;
  breed_type: BreedType;
  breed: string;
  sex: Sex;
  age_months: number;
  color_marks: string | null;
  use_status: string | null;
  is_pregnant: number;
  lactation_no: number | null;
  milk_yield_lpd: number | null;
  weight_kg: number | null;
  health_status: HealthStatus;
  village: string | null;
  district: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  muzzle_photos: string; // JSON MuzzleShot[]
  muzzle_video: string | null;
  body_photo: string | null;
  muzzle_embedding: string | null; // JSON number[]
  muzzle_confidence: number | null;
  detector: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Cattle = Omit<CattleRow, 'muzzle_photos' | 'muzzle_embedding' | 'is_pregnant'> & {
  muzzle_photos: MuzzleShot[];
  muzzle_embedding: number[] | null;
  is_pregnant: boolean;
  owner_name?: string | null;
  owner_type?: OwnerType | null;
  verified_by_name?: string | null;
};

export type HealthRecord = {
  id: string;
  cattle_id: string;
  doctor_id: string;
  doctor_name?: string;
  type: string;
  title: string;
  notes: string | null;
  record_date: string;
  next_due: string | null;
  created_at: string;
};
