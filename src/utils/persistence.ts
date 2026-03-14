import { AppState, AppSettings, ConnectionStatus } from '../types';

// ─── Schema version ───────────────────────────────────────────────────────────

export const SCHEMA_VERSION = 4;

// ─── Default shapes used during migration ────────────────────────────────────

const defaultConnectedApps: AppSettings['connectedApps'] = {
  apple_health: 'disconnected',
  google_fit: 'disconnected',
  garmin: 'disconnected',
  whoop: 'disconnected',
};

const defaultSettings: AppSettings = {
  adaptiveCoaching: true,
  plateauDetection: true,
  weeklyCheckIn: true,
  notificationsEnabled: false,
  units: 'metric',
  connectedApps: defaultConnectedApps,
};

// ─── Per-version migration steps ─────────────────────────────────────────────

/**
 * v0 → v1: add settings.weeklyCheckIn if missing
 */
function migrateV0toV1(state: any): any {
  const s = { ...state };
  if (!s.settings) s.settings = { ...defaultSettings };
  if (typeof s.settings.weeklyCheckIn !== 'boolean') {
    s.settings = { ...s.settings, weeklyCheckIn: true };
  }
  s.schemaVersion = 1;
  return s;
}

/**
 * v1 → v2: add recentFoods / favoriteFoods arrays if missing
 * Also handles legacy shape where these arrays held string IDs.
 */
function migrateV1toV2(state: any): any {
  const s = { ...state };

  // If old shape stored string IDs, reset to empty arrays
  if (
    !Array.isArray(s.recentFoods) ||
    (s.recentFoods.length > 0 && typeof s.recentFoods[0] === 'string')
  ) {
    s.recentFoods = [];
  }
  if (
    !Array.isArray(s.favoriteFoods) ||
    (s.favoriteFoods.length > 0 && typeof s.favoriteFoods[0] === 'string')
  ) {
    s.favoriteFoods = [];
  }

  s.schemaVersion = 2;
  return s;
}

/**
 * v2 → v3: add savedMeals array if missing
 */
function migrateV2toV3(state: any): any {
  const s = { ...state };
  if (!Array.isArray(s.savedMeals)) s.savedMeals = [];
  s.schemaVersion = 3;
  return s;
}

/**
 * v3 → v4:
 *  - add settings.notificationsEnabled (default true)
 *  - add settings.units ('metric' | 'imperial', default 'metric')
 *  - ensure connectedApps has all four keys with valid ConnectionStatus values
 */
function migrateV3toV4(state: any): any {
  const s = { ...state };

  if (!s.settings || typeof s.settings !== 'object') {
    s.settings = { ...defaultSettings };
  }

  // notificationsEnabled
  if (typeof s.settings.notificationsEnabled !== 'boolean') {
    s.settings = { ...s.settings, notificationsEnabled: true };
  }

  // units
  if (s.settings.units !== 'metric' && s.settings.units !== 'imperial') {
    s.settings = { ...s.settings, units: 'metric' };
  }

  // connectedApps — ensure the object exists and all four keys are present
  const validStatuses: ConnectionStatus[] = ['disconnected', 'connecting', 'connected', 'failed'];
  const normalize = (v: any): ConnectionStatus =>
    validStatuses.includes(v) ? v : 'disconnected';

  const existing = s.settings.connectedApps ?? {};
  s.settings = {
    ...s.settings,
    connectedApps: {
      appleHealth: normalize(existing.appleHealth),
      googleFit: normalize(existing.googleFit),
      garmin: normalize(existing.garmin),
      whoop: normalize(existing.whoop),
    },
  };

  // assignedProgram — ensure field exists
  if (!('assignedProgram' in s)) s.assignedProgram = null;

  s.schemaVersion = 4;
  return s;
}

// ─── Public migration entry point ─────────────────────────────────────────────

/**
 * Reads raw.schemaVersion (or 0 if absent) and applies migrations in order
 * up to SCHEMA_VERSION. Returns a fully migrated AppState.
 */
export function migrateState(raw: any): AppState {
  let state = { ...raw };
  const version: number = typeof state.schemaVersion === 'number' ? state.schemaVersion : 0;

  if (version < 1) state = migrateV0toV1(state);
  if (state.schemaVersion < 2) state = migrateV1toV2(state);
  if (state.schemaVersion < 3) state = migrateV2toV3(state);
  if (state.schemaVersion < 4) state = migrateV3toV4(state);

  return state as AppState;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Lightweight structural validation.
 * user can be null, but logs and settings must be plain objects.
 */
export function validateState(state: any): boolean {
  if (state === null || typeof state !== 'object') {
    console.warn('[persistence] validateState: state is not an object');
    return false;
  }

  if (typeof state.logs !== 'object' || Array.isArray(state.logs) || state.logs === null) {
    console.warn('[persistence] validateState: state.logs must be a plain object');
    return false;
  }

  if (
    typeof state.settings !== 'object' ||
    Array.isArray(state.settings) ||
    state.settings === null
  ) {
    console.warn('[persistence] validateState: state.settings must be a plain object');
    return false;
  }

  return true;
}

// ─── Safe load ────────────────────────────────────────────────────────────────

/**
 * Loads and migrates state from localStorage.
 * Returns defaultState on any failure (parse error, validation error, etc.).
 */
export function safeLoadState(key: string, defaultState: AppState): AppState {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultState;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.warn('[persistence] safeLoadState: corrupted JSON, resetting to default', parseError);
      return defaultState;
    }

    if (!validateState(parsed)) {
      console.warn('[persistence] safeLoadState: invalid state shape, resetting to default');
      return defaultState;
    }

    return migrateState(parsed);
  } catch (err) {
    console.warn('[persistence] safeLoadState: unexpected error, resetting to default', err);
    return defaultState;
  }
}

// ─── Safe save ────────────────────────────────────────────────────────────────

/**
 * Saves state to localStorage. Gracefully handles quota exceeded errors.
 */
export function safeSaveState(key: string, state: AppState): void {
  try {
    const serialized = JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION });
    localStorage.setItem(key, serialized);
  } catch (err: any) {
    if (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      console.warn('[persistence] safeSaveState: localStorage quota exceeded, state not saved');
    } else {
      console.warn('[persistence] safeSaveState: unexpected error saving state', err);
    }
  }
}

// ─── Export / Import ──────────────────────────────────────────────────────────

/**
 * Serializes app state to a pretty-printed JSON string for user export.
 */
export function exportStateAsJSON(state: AppState): string {
  return JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }, null, 2);
}

/**
 * Parses, validates, and migrates state from a JSON string provided by the user.
 * Returns { success: true, state } or { success: false, error }.
 */
export function importStateFromJSON(
  json: string
): { success: true; state: AppState } | { success: false; error: string } {
  try {
    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch {
      return { success: false, error: 'Invalid JSON: could not parse the provided data.' };
    }

    if (!validateState(parsed)) {
      return {
        success: false,
        error: 'Invalid data format: required fields (logs, settings) are missing or malformed.',
      };
    }

    const migrated = migrateState(parsed);
    return { success: true, state: migrated };
  } catch (err: any) {
    return {
      success: false,
      error: `Import failed: ${err?.message ?? 'unknown error'}`,
    };
  }
}
