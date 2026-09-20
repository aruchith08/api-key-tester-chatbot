export async function runStorageTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: API Key Storage & Key Vault Integration ---');

  const { ApiKeyStorage } = await server.ssrLoadModule('./src/services/apiKeyStorage.ts');
  const { maskApiKey } = await server.ssrLoadModule('./src/utils/maskApiKey.ts');
  const { useAppStore } = await server.ssrLoadModule('./src/store/appStore.ts');

  // Reset any prior state
  ApiKeyStorage.clearAll();
  assert(ApiKeyStorage.getAll().length === 0, 'Storage starts empty after clearAll()');

  // 1. Save into localStorage
  const saved1 = ApiKeyStorage.save({
    name: 'Work OpenAI',
    providerId: 'openai',
    providerName: 'OpenAI',
    apiKey: 'sk-proj-0123456789abcdefghijklmnopqrstuvwxyz',
    storageTarget: 'localStorage'
  });

  assert(Boolean(saved1.id), 'Saved key generates unique id');
  assert(saved1.name === 'Work OpenAI', 'Saved key preserves custom nickname');
  assert(saved1.providerId === 'openai', 'Saved key preserves provider ID');
  assert(saved1.apiKey === 'sk-proj-0123456789abcdefghijklmnopqrstuvwxyz', 'Saved key preserves real apiKey');
  assert(saved1.maskedKey === maskApiKey('sk-proj-0123456789abcdefghijklmnopqrstuvwxyz'), 'Saved key generates accurate maskedKey');
  assert(saved1.storageTarget === 'localStorage', 'Saved key targets localStorage');
  assert(saved1.lastStatus === 'untested', 'Initial status defaults to untested');

  // 2. Save into sessionStorage
  const saved2 = ApiKeyStorage.save({
    name: 'Temporary Groq',
    providerId: 'groq',
    providerName: 'Groq',
    apiKey: 'gsk_abcdef0123456789abcdef0123456789',
    storageTarget: 'sessionStorage'
  });

  assert(saved2.storageTarget === 'sessionStorage', 'Second key saved into sessionStorage');

  // 3. Retrieve all keys
  const allKeys = ApiKeyStorage.getAll();
  assert(allKeys.length === 2, 'getAll() retrieves keys across both localStorage and sessionStorage');
  assert(allKeys[0].id === saved2.id, 'Most recently used/saved key appears first in sorted list');

  // 4. Retrieve by ID
  const fetched1 = ApiKeyStorage.getById(saved1.id);
  assert(fetched1 !== undefined && fetched1.name === 'Work OpenAI', 'getById retrieves exact stored item');

  // 5. Update key (rename and status)
  const updated = ApiKeyStorage.update(saved1.id, {
    name: 'Primary OpenAI',
    lastStatus: 'valid',
    lastLatencyMs: 128
  });

  assert(updated !== null && updated.name === 'Primary OpenAI', 'update() updates key nickname');
  assert(updated?.lastStatus === 'valid', 'update() updates verification status');
  assert(updated?.lastLatencyMs === 128, 'update() updates latency metric');

  // Verify retrieval reflects update
  const refetched = ApiKeyStorage.getById(saved1.id);
  assert(refetched?.name === 'Primary OpenAI', 'Subsequent getById() reflects updated properties');

  // 6. Switch storage target from localStorage to sessionStorage
  const targetSwitched = ApiKeyStorage.update(saved1.id, {
    storageTarget: 'sessionStorage'
  });
  assert(targetSwitched?.storageTarget === 'sessionStorage', 'update() successfully switches storage target');
  const allAfterSwitch = ApiKeyStorage.getAll();
  assert(allAfterSwitch.length === 2, 'Total key count remains consistent after target switch');

  // 7. Export JSON backup
  const exportedJson = ApiKeyStorage.exportJson();
  assert(typeof exportedJson === 'string' && exportedJson.includes('Primary OpenAI'), 'exportJson produces valid JSON with key data');

  // 8. Delete key
  const removed = ApiKeyStorage.remove(saved2.id);
  assert(removed === true, 'remove() successfully deletes key from storage');
  assert(ApiKeyStorage.getAll().length === 1, 'Key list count decremented after removal');
  assert(ApiKeyStorage.getById(saved2.id) === undefined, 'Deleted key is no longer retrievable');

  // 9. Import JSON backup
  const importResult = ApiKeyStorage.importJson(exportedJson);
  assert(importResult.imported >= 1, 'importJson successfully imports keys from backup string');
  assert(importResult.errors === 0, 'importJson reports 0 errors on valid backup');

  // 10. Clear All
  ApiKeyStorage.clearAll();
  assert(ApiKeyStorage.getAll().length === 0, 'clearAll() wipes all stored keys');

  // 11. Zustand appStore integration
  const store = useAppStore.getState();
  assert(Array.isArray(store.storedKeys), 'store.storedKeys is an array');
  assert(store.isKeyVaultOpen === false, 'store.isKeyVaultOpen is initially false');

  useAppStore.getState().setKeyVaultOpen(true);
  assert(useAppStore.getState().isKeyVaultOpen === true, 'setKeyVaultOpen toggles vault modal state');

  useAppStore.getState().setKeyVaultOpen(false);
  assert(useAppStore.getState().isKeyVaultOpen === false, 'setKeyVaultOpen closes vault modal');

  // Test connectStoredKey error handling for missing key
  const missingResult = await useAppStore.getState().connectStoredKey('non_existent_key_id');
  assert(missingResult.success === false && Boolean(missingResult.error), 'connectStoredKey fails gracefully on invalid ID');

  console.log('✓ All API Key Storage & Key Vault tests passed successfully');
}
