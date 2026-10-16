/**
 * Cattle/buffalo reference data. Age bands and use categories follow the
 * DAHD Operational Guidelines for the 21st Livestock Census (2024), section 1.3.1.
 */

export type Species = 'cattle' | 'buffalo';
export type BreedType = 'indigenous' | 'exotic' | 'crossbred';
export type Sex = 'male' | 'female';
export type HealthStatus = 'healthy' | 'under_treatment' | 'sick';

export type Option<T extends string = string> = { value: T; label: string };

export const SPECIES: Option<Species>[] = [
  { value: 'cattle', label: 'Cattle' },
  { value: 'buffalo', label: 'Buffalo' },
];

export const BREED_TYPES: Option<BreedType>[] = [
  { value: 'indigenous', label: 'Indigenous' },
  { value: 'crossbred', label: 'Crossbred' },
  { value: 'exotic', label: 'Exotic' },
];

export const SEXES: Option<Sex>[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

export const HEALTH_STATUSES: Option<HealthStatus>[] = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'under_treatment', label: 'Under treatment' },
  { value: 'sick', label: 'Sick' },
];

const NON_DESCRIPT = 'Non-descript';

export const BREEDS: Record<Species, Record<BreedType, string[]>> = {
  cattle: {
    indigenous: [
      'Gir', 'Sahiwal', 'Red Sindhi', 'Tharparkar', 'Rathi', 'Kankrej', 'Ongole', 'Hariana',
      'Deoni', 'Hallikar', 'Amritmahal', 'Khillari', 'Kangayam', 'Krishna Valley', 'Vechur',
      'Punganur', 'Malnad Gidda', 'Bargur', 'Nagori', 'Red Kandhari', NON_DESCRIPT,
    ],
    crossbred: ['HF Crossbred', 'Jersey Crossbred', 'Other Crossbred'],
    exotic: ['Holstein Friesian', 'Jersey', 'Brown Swiss', 'Other Exotic'],
  },
  buffalo: {
    indigenous: [
      'Murrah', 'Nili-Ravi', 'Jaffarabadi', 'Mehsana', 'Surti', 'Bhadawari', 'Pandharpuri',
      'Nagpuri', 'Toda', 'Banni', NON_DESCRIPT,
    ],
    crossbred: ['Graded Murrah', 'Other Graded'],
    exotic: [],
  },
};

/** Buffaloes are not classified as exotic/crossbred in the census; offer only what applies. */
export function breedTypesFor(species: Species): Option<BreedType>[] {
  return BREED_TYPES.filter((t) => BREEDS[species][t.value].length > 0);
}

const MALE_USES: Option[] = [
  { value: 'breeding', label: 'Breeding only' },
  { value: 'agriculture', label: 'Agriculture only' },
  { value: 'breeding_agriculture', label: 'Breeding & agriculture' },
  { value: 'bullock_cart', label: 'Bullock cart / farm operation' },
  { value: 'others', label: 'Others' },
];

const FEMALE_USES: Option[] = [
  { value: 'in_milk', label: 'In milk' },
  { value: 'dry', label: 'Dry' },
  { value: 'not_calved', label: 'Not calved once' },
  { value: 'others', label: 'Others' },
];

/** Use options depend on sex, so an inappropriate use can never be selected. */
export function usesFor(sex: Sex): Option[] {
  return sex === 'male' ? MALE_USES : FEMALE_USES;
}

export function usageLabel(value: string | null | undefined): string {
  return [...MALE_USES, ...FEMALE_USES].find((u) => u.value === value)?.label ?? '—';
}

/**
 * Census age band for an animal. Thresholds (in months) per species/breed type/sex.
 * Exotic & crossbred cattle use different bands from indigenous cattle and buffalo.
 */
export function ageCategory(
  species: Species,
  breedType: BreedType,
  sex: Sex,
  ageMonths: number,
): string {
  const exoticOrCross = species === 'cattle' && breedType !== 'indigenous';
  if (sex === 'male') {
    const limit = exoticOrCross ? 18 : 24;
    return ageMonths <= limit
      ? `Up to ${exoticOrCross ? '1½' : '2'} yrs`
      : `Over ${exoticOrCross ? '1½' : '2'} yrs`;
  }
  const upper = exoticOrCross ? 30 : 36;
  if (ageMonths < 12) return 'Under 1 yr';
  if (ageMonths <= upper) return `1 – ${exoticOrCross ? '2½' : '3'} yrs`;
  return `Above ${exoticOrCross ? '2½' : '3'} yrs`;
}

export function formatAge(ageMonths: number | null | undefined): string {
  if (ageMonths == null) return '—';
  const y = Math.floor(ageMonths / 12);
  const m = ageMonths % 12;
  if (y === 0) return `${m} mo`;
  return m === 0 ? `${y} yr` : `${y} yr ${m} mo`;
}

export const HEALTH_RECORD_TYPES: Option[] = [
  { value: 'checkup', label: 'Check-up' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'deworming', label: 'Deworming' },
  { value: 'ai', label: 'Artificial insemination' },
  { value: 'pregnancy', label: 'Pregnancy diagnosis' },
];

export const COMMON_VACCINES = ['FMD', 'HS', 'BQ', 'Brucellosis', 'LSD', 'Theileriosis', 'Anthrax'];

/** Pashu Aadhaar / INAPH ear tags are 12-digit numbers. */
export const EAR_TAG_PATTERN = /^\d{12}$/;

export const label = (options: Option[], value: string | null | undefined) =>
  options.find((o) => o.value === value)?.label ?? '—';
