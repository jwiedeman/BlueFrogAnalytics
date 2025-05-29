// Settings panel functionality
/**
 * Initialize Settings panel controls.
 */
export function initSettings() {
  // Sync CA
  const btnSync = document.getElementById('syncCA');
  if (btnSync) btnSync.onclick = () => window.api.syncCA();
  // Regenerate CA
  const btnRegen = document.getElementById('regenerateCA');
  if (btnRegen) btnRegen.onclick = () => window.api.regenerateCA();
  // Export DB
  const btnExport = document.getElementById('exportDbBtn');
  if (btnExport) btnExport.onclick = async () => {
    const b64 = await window.api.exportDb();
    if (!b64) { alert('Database export failed'); return; }
    // Convert base64 to Blob
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qa_proxy.sqlite3';
    a.click();
  };
  // Import DB
  const btnImport = document.getElementById('importDbBtn');
  if (btnImport) btnImport.onclick = () => {
    const input = document.getElementById('importDbFile');
    if (input) input.click();
  };
  const inputFile = document.getElementById('importDbFile');
  if (inputFile) {
    inputFile.onchange = async () => {
      const file = inputFile.files[0];
      if (!file) return;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const b64 = btoa(String.fromCharCode(...uint8));
        const ok = await window.api.importDb(b64);
        if (!ok) { alert('Database import failed'); return; }
        // Reload all panels
        window.reloadWhitelist();
        window.reloadRules();
        window.reloadFlows();
        window.reloadProcessed();
        window.reloadSessions();
        window.reloadDimensions();
        alert('Database imported successfully');
      } catch (e) {
        console.error('Failed to import DB file', e);
        alert('Invalid database file');
      }
    };
  }
}
// Auto-init when DOM ready
window.addEventListener('DOMContentLoaded', initSettings);