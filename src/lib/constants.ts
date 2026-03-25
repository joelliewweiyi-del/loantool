export const VEHICLES = [
  { value: 'RED IV', label: 'RED IV' },
  { value: 'TLF', label: 'TLF' },
  { value: 'Pipeline', label: 'Pipeline' },
] as const;

export const DEFAULT_VEHICLE = 'Pipeline';

export type Vehicle = (typeof VEHICLES)[number]['value'];

/** Vehicles that require a facility sub-field on loans */
export const VEHICLES_WITH_FACILITY: Vehicle[] = ['TLF'];

export function vehicleRequiresFacility(vehicle: string): boolean {
  return VEHICLES_WITH_FACILITY.includes(vehicle as Vehicle);
}

export function isPipelineVehicle(vehicle: string): boolean {
  return vehicle === 'Pipeline';
}

export const PIPELINE_STAGES = [
  { value: 'prospect', label: 'Prospect', color: 'neutral' },
  { value: 'hard', label: 'Hard', color: 'amber' },
  { value: 'signed', label: 'Signed', color: 'sage' },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['value'];

export function getPipelineStage(value: string | null | undefined) {
  return PIPELINE_STAGES.find(s => s.value === value) || null;
}
