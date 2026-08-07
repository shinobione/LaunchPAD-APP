import { resolveAdminAccess, resolveLrcMakerAccess } from '../js/features/admin-access.js';

const values = new Map();
const storage = {
  getItem: key => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key)
};

if (!resolveAdminAccess({ search: '?admin=1', storage, desktop: true })) throw new Error('Desktop Track Manager activation failed.');
if (!resolveAdminAccess({ search: '', storage, desktop: true })) throw new Error('Track Manager activation did not persist.');
if (resolveAdminAccess({ search: '', storage, desktop: false })) throw new Error('Track Manager access leaked outside desktop.');

if (!resolveLrcMakerAccess({ search: '?admin=1', desktop: true })) throw new Error('Explicit LRC Maker activation failed.');
if (resolveLrcMakerAccess({ search: '', desktop: true })) throw new Error('LRC Maker must not inherit persistent Track Manager admin state.');
if (resolveLrcMakerAccess({ search: '?admin=1', desktop: false })) throw new Error('LRC Maker access leaked outside desktop.');
if (resolveLrcMakerAccess({ search: '?admin=0', desktop: true })) throw new Error('LRC Maker admin opt-out failed.');

if (resolveAdminAccess({ search: '?admin=0', storage, desktop: true })) throw new Error('Track Manager admin opt-out failed.');
if (resolveAdminAccess({ search: '', storage, desktop: true })) throw new Error('Track Manager access leaked to ordinary visitors.');

console.log('Desktop Track Manager persistence and explicit-only LRC Maker access are covered.');
