export const VEHICLES = [
  { value: 'RED IV', label: 'RED IV' },
  { value: 'TLF', label: 'TLF' },
] as const;

export const DEFAULT_VEHICLE = 'RED IV';

export type Vehicle = (typeof VEHICLES)[number]['value'];

/** Vehicles that require a facility sub-field on loans */
export const VEHICLES_WITH_FACILITY: Vehicle[] = ['TLF'];

export function vehicleRequiresFacility(vehicle: string): boolean {
  return VEHICLES_WITH_FACILITY.includes(vehicle as Vehicle);
}
