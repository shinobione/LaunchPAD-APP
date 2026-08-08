import { resolveAdminAccess, resolveLrcMakerAccess, resolveSonicTraceAccess } from '../js/features/admin-access.js';

const values = new Map();
const storage = {
  getItem: key => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key)
};

if (!resolveAdminAccess({ search: '?admin=1', storage, desktop: true })) throw new Error('Desktop Track Manager activation failed.');
if (!resolveAdminAccess({ search: '', storage, desktop: true })) throw new Error('Track Manager activation did not persist.');
if (resolveAdminAccess({ search: '', storage, desktop: false })) throw new Error('Track Manager access leaked outside desktop.');

if (!resolveLrcMakerAccess({ search: '?admin=1', storage, desktop: true })) throw new Error('Explicit LRC Maker activation failed.');
if (!resolveLrcMakerAccess({ search: '', storage, desktop: true })) throw new Error('LRC Maker activation did not persist into standalone desktop sessions.');
if (resolveLrcMakerAccess({ search: '', storage, desktop: false })) throw new Error('LRC Maker access leaked outside desktop.');

if (!resolveSonicTraceAccess({ search: '?admin=1', storage, desktop: true })) throw new Error('Explicit SonicTrace activation failed.');
if (!resolveSonicTraceAccess({ search: '', storage, desktop: true })) throw new Error('SonicTrace activation did not persist into standalone desktop sessions.');
if (resolveSonicTraceAccess({ search: '', storage, desktop: false })) throw new Error('SonicTrace access leaked outside desktop.');

if (resolveSonicTraceAccess({ search: '?admin=0', storage, desktop: true })) throw new Error('SonicTrace admin opt-out failed.');
if (resolveLrcMakerAccess({ search: '', storage, desktop: true })) throw new Error('LRC Maker access persisted after admin opt-out.');
if (resolveAdminAccess({ search: '', storage, desktop: true })) throw new Error('Track Manager access leaked after shared admin opt-out.');
if (resolveSonicTraceAccess({ search: '', storage, desktop: true })) throw new Error('SonicTrace access persisted after shared admin opt-out.');

console.log('Desktop Track Manager, LRC Maker and SonicTrace share persistent admin access across browser and installed PWA sessions.');
