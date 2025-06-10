export async function logTestStatus(name, status) {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  try {
    let token = '';
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      token = await window.firebaseAuth.currentUser.getIdToken();
    }
    await fetch(`${API_BASE}/api/test-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ name, status })
    });
  } catch (err) {
    console.warn('Failed to log status', err);
  }
}
