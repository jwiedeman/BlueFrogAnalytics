document.addEventListener('DOMContentLoaded', async () => {
  if (!window.firebaseConfig) {
    console.warn('Firebase config not found');
    return;
  }

  const [{ initializeApp }, {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut
  }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js')
  ]);

  const app = initializeApp(window.firebaseConfig);
  const auth = getAuth(app);

  window.authSignOut = () => signOut(auth);

  const loginForm = document.getElementById('login-form');
  const confirmModalEl = document.getElementById('confirm-modal');
  const confirmModal = confirmModalEl ? new bootstrap.Modal(confirmModalEl) : null;

  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = loginForm.querySelector('#login-email').value;
      const password = loginForm.querySelector('#login-password').value;
      try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '/dashboard';
      } catch (err) {
        if (err.code === 'auth/user-not-found' && confirmModal) {
          loginForm.querySelector('button[type="submit"]').disabled = true;
          document.getElementById('confirm-email').value = email;
          confirmModal.show();
        } else {
          alert(err.message);
        }
      }
    });
  }

  const confirmForm = document.getElementById('confirm-form');
  if (confirmForm) {
    confirmForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('confirm-email').value;
      const pass1 = document.getElementById('confirm-password').value;
      const pass2 = document.getElementById('confirm-password2').value;
      if (pass1 !== pass2) {
        alert('Passwords do not match');
        return;
      }
      try {
        await createUserWithEmailAndPassword(auth, email, pass1);
        confirmModal.hide();
        window.location.href = '/dashboard';
      } catch (err) {
        alert(err.message);
      }
    });
  }

  const googleBtn = document.getElementById('google-login');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
        window.location.href = '/dashboard';
      } catch (err) {
        alert(err.message);
      }
    });
  }

  onAuthStateChanged(auth, user => {
    const loginBtn = document.getElementById('login-btn');
    const dashBtn = document.getElementById('dash-btn');
    if (loginBtn && dashBtn) {
      if (user) {
        loginBtn.classList.add('d-none');
        dashBtn.classList.remove('d-none');
      } else {
        loginBtn.classList.remove('d-none');
        dashBtn.classList.add('d-none');
      }
    }
    if (!user && window.location.pathname.startsWith('/dashboard')) {
      window.location.href = '/login';
    }
  });
});
