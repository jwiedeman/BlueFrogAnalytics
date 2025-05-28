document.addEventListener('DOMContentLoaded', async () => {
  const saved = localStorage.getItem('bfaLoggedIn');
  const darkPref = localStorage.getItem('bfaDarkMode');
  if (saved !== null) {
    const loggedIn = saved === 'true';
    const loginBtn = document.getElementById('login-btn');
    const profileMenu = document.getElementById('profile-menu');
    const dashNav = document.getElementById('dashboard-nav');
    if (loginBtn && profileMenu) {
      if (loggedIn) {
        loginBtn.classList.add('d-none');
        profileMenu.classList.remove('d-none');
      } else {
        loginBtn.classList.remove('d-none');
        profileMenu.classList.add('d-none');
      }
    }
    if (dashNav) {
      dashNav.classList.toggle('d-none', !loggedIn);
    }
  }

  if (darkPref === 'true') {
    document.body.classList.add('dark-mode');
  }

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
    sendSignInLinkToEmail,
    signInWithEmailLink,
    isSignInWithEmailLink,
    onAuthStateChanged,
    signOut
  }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js')
  ]);

  const app = initializeApp(window.firebaseConfig);
  const auth = getAuth(app);

  window.firebaseAuth = auth;
  window.onAuthStateChanged = onAuthStateChanged;

  window.authSignOut = () => signOut(auth);

  // Notify other scripts that Firebase has initialized
  document.dispatchEvent(new Event('firebase-init'));

  const showAlert = (msg, type = 'danger') => {
    if (!loginAlert) return;
    loginAlert.textContent = msg;
    loginAlert.className = `alert alert-${type} mt-3`;
    loginAlert.classList.remove('d-none');
  };

  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Please provide your email for confirmation');
    }
    try {
      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      window.location.href = '/dashboard';
      return;
    } catch (err) {
      alert(err.message);
    }
  }

  const loginForm = document.getElementById('login-form');
  const loginAlert = document.getElementById('login-alert');
  const confirmModalEl = document.getElementById('confirm-modal');
  const confirmModal = confirmModalEl ? new bootstrap.Modal(confirmModalEl) : null;

  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = loginForm.querySelector('#login-email').value;
      const password = loginForm.querySelector('#login-password').value;
      if (loginAlert) loginAlert.classList.add('d-none');
      try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '/dashboard';
      } catch (err) {
        if (err.code === 'auth/user-not-found' && confirmModal) {
          loginForm.querySelector('button[type="submit"]').disabled = true;
          document.getElementById('confirm-email').value = email;
          confirmModal.show();
        } else {
          showAlert(err.message);
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
      if (loginAlert) loginAlert.classList.add('d-none');
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
        window.location.href = '/dashboard';
      } catch (err) {
        showAlert(err.message);
      }
    });
  }

  const emailLinkBtn = document.getElementById('email-link-btn');
  if (emailLinkBtn) {
    emailLinkBtn.addEventListener('click', () => {
      showAlert('Email link login is not supported yet.', 'info');
    });
  }

  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', async e => {
      e.preventDefault();
      window.loggingOut = true;
      await window.authSignOut();
      window.location.href = '/';
    });
  }

  onAuthStateChanged(auth, user => {
    const loginBtn = document.getElementById('login-btn');
    const profileMenu = document.getElementById('profile-menu');
    const dashNav = document.getElementById('dashboard-nav');
    const onDashboard = window.location.pathname.startsWith('/dashboard');
    const useDark = !!user && onDashboard;
    localStorage.setItem('bfaLoggedIn', user ? 'true' : 'false');
    localStorage.setItem('bfaDarkMode', useDark ? 'true' : 'false');
    document.body.classList.toggle('dark-mode', useDark);
    if (loginBtn && profileMenu) {
      if (user) {
        loginBtn.classList.add('d-none');
        profileMenu.classList.remove('d-none');
      } else {
        loginBtn.classList.remove('d-none');
        profileMenu.classList.add('d-none');
      }
    }
    if (dashNav) {
      dashNav.classList.toggle('d-none', !user);
    }
    if (!user && window.location.pathname.startsWith('/dashboard')) {
      if (!window.loggingOut) {
        window.location.href = '/login';
      }
    }
  });
});
