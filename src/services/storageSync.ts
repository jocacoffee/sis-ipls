import { IndicatorMeasurement, IndicatorTarget, ActionPlan, AuditLog } from '../types';

export const STORAGE_KEYS = {
  MEASUREMENTS: 'ipls_measurements_v3',
  TARGETS: 'ipls_targets_v3',
  ACTION_PLANS: 'ipls_action_plans_v3',
  AUDIT_LOGS: 'ipls_audit_logs_v3',
  IMPORT_HISTORY: 'ipls_import_history_v3',
  LAST_SYNC: 'ipls_last_sync_timestamp'
} as const;

/**
 * Safe localStorage reader with JSON deserialization and legacy key fallback
 */
export function loadLocalData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    let raw = window.localStorage.getItem(key);
    if (!raw && key.startsWith('ipls_')) {
      const legacyKey = key.replace(/^ipls_/, 'sispls_');
      raw = window.localStorage.getItem(legacyKey);
    }
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.warn(`[iPLS Storage] Falha ao carregar chave ${key} do localStorage:`, err);
    return fallback;
  }
}

/**
 * Safe localStorage writer with quota error handling
 */
export function saveLocalData<T>(key: string, data: T): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const serialized = JSON.stringify(data);
    window.localStorage.setItem(key, serialized);
    window.localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    return true;
  } catch (err) {
    console.warn(`[iPLS Storage] Falha ao salvar chave ${key} no localStorage:`, err);
    return false;
  }
}

/**
 * Merge two lists of measurements without losing user imports
 * Incoming entries overwrite existing ones if matching (indicatorId, year, month)
 */
export function mergeMeasurements(
  base: IndicatorMeasurement[],
  incoming: IndicatorMeasurement[]
): IndicatorMeasurement[] {
  const map = new Map<string, IndicatorMeasurement>();

  // Index base
  base.forEach(m => {
    const key = `${m.indicatorId}__${m.year}__${m.month}`;
    map.set(key, m);
  });

  // Apply incoming
  incoming.forEach(m => {
    const key = `${m.indicatorId}__${m.year}__${m.month}`;
    map.set(key, m);
  });

  return Array.from(map.values());
}

/**
 * Check if a measurement was imported by the user or from a spreadsheet
 */
export function isUserImportedMeasurement(m: IndicatorMeasurement): boolean {
  return (
    m.sourceType === 'spreadsheet' ||
    m.sourceType === 'manual' ||
    m.id.startsWith('m-imp-') ||
    m.id.startsWith('m-batch-')
  );
}

/**
 * Re-sync local measurements with backend server (/api/measurements/batch)
 */
export async function syncMeasurementsToServer(
  measurements: IndicatorMeasurement[],
  sourceDescription: string = 'Sincronização Automática iPLS'
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const res = await fetch('/api/measurements/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        measurements,
        sourceDescription,
        userId: 'usr-1',
        userName: 'Dr. Roberto Magalhães'
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        count: 0,
        error: errJson.error || `HTTP ${res.status}`
      };
    }

    const data = await res.json();
    return {
      success: true,
      count: data.totalProcessed || measurements.length
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      error: err.message || 'Falha de conexão com servidor'
    };
  }
}
