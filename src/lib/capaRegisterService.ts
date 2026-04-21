/**
 * capaRegisterService.ts — Supabase-backed
 * CAPAs stored in Supabase. Falls back to empty if table doesn't exist yet.
 */

import { supabase } from '@/integrations/supabase/client';

export type CAPAType = "Corrective" | "Preventive";
export type CAPAStatus = "Open" | "In Progress" | "Under Verification" | "Closed";

export interface CAPA {
  id: string;
  title: string;
  description: string;
  type: CAPAType;
  status: CAPAStatus;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  owner: string;
  targetDate: string;
  completionDate: string;
  verificationResult: string;
  createdAt: string;
  updatedAt: string;
}

export interface CAPAInput {
  title: string;
  description?: string;
  type: CAPAType;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  owner?: string;
  targetDate?: string;
}

export interface CAPAUpdate {
  title?: string;
  description?: string;
  type?: CAPAType;
  status?: CAPAStatus;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  owner?: string;
  targetDate?: string;
  completionDate?: string;
  verificationResult?: string;
}

export async function getAllCAPAs(): Promise<CAPA[]> {
  const { data, error } = await supabase.from('capas').select('*').order('created_at', { ascending: false });
  if (error || !data) {
    console.warn('[capaRegister] Table not available, returning empty:', error?.message);
    return [];
  }
  return data as CAPA[];
}

export async function addCAPA(input: CAPAInput): Promise<CAPA> {
  const capa: Partial<CAPA> = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description || '',
    type: input.type,
    status: 'Open',
    rootCause: input.rootCause || '',
    correctiveAction: input.correctiveAction || '',
    preventiveAction: input.preventiveAction || '',
    owner: input.owner || '',
    targetDate: input.targetDate || '',
    completionDate: '',
    verificationResult: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('capas').insert(capa).select().single();
  if (error) {
    console.error('[capaRegister] Failed to add CAPA:', error.message);
    return capa as CAPA;
  }
  return data as CAPA;
}

export async function updateCAPA(capaId: string, updates: CAPAUpdate): Promise<CAPA> {
  const updateData = { ...updates, updatedAt: new Date().toISOString() };
  const { data, error } = await supabase.from('capas').update(updateData).eq('id', capaId).select().single();
  if (error) {
    console.error('[capaRegister] Failed to update CAPA:', error.message);
    throw new Error(`Failed to update CAPA: ${error.message}`);
  }
  return data as CAPA;
}

export function calculateCAPAStats(capas: CAPA[]) {
  return {
    total: capas.length,
    open: capas.filter(c => c.status === 'Open').length,
    inProgress: capas.filter(c => c.status === 'In Progress').length,
    underVerification: capas.filter(c => c.status === 'Under Verification').length,
    closed: capas.filter(c => c.status === 'Closed').length,
    corrective: capas.filter(c => c.type === 'Corrective').length,
    preventive: capas.filter(c => c.type === 'Preventive').length,
  };
}

export function getCAPAStatusColor(status: CAPAStatus): string {
  switch (status) {
    case 'Open': return 'bg-blue-500 text-white';
    case 'In Progress': return 'bg-yellow-500 text-black';
    case 'Under Verification': return 'bg-orange-500 text-white';
    case 'Closed': return 'bg-green-500 text-white';
  }
}