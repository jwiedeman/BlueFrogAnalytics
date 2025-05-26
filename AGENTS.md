# AGENTS Instructions

This file tracks development tasks and coding conventions for this repository.

## Coding Conventions
- Use Astro and Bootstrap components that are already in the project.
- Keep formatting consistent with existing code (2 spaces for indentation where applicable in Astro/HTML/JS files).

## Task List

### Login & Client Dashboard
1. **Research Firebase Auth integration** – Determine best approach to integrate Firebase Authentication with Astro. Include support for Google sign-in and email link auth.
2. **Set up Firebase project** – Create Firebase project, enable Authentication providers, and store configuration secrets in environment variables.
3. **Create `/login` page** – Implement login page that initializes Firebase and shows login UI.
4. **Protect `/dashboard` route** – Add client-only dashboard page that requires authentication. Redirect to `/login` if not logged in.
5. **Navigation updates** – Show "Client Login" button when logged out and "Dashboard" link when logged in. Ensure this appears in the header.
6. **Dark mode for dashboard** – Apply a dark theme when users are logged in and on the dashboard pages.
7. **Logout flow** – Add a logout button inside the dashboard that signs the user out and returns to the public site.

### Styling Updates
- Update global styles to use a dark color scheme.
- Convert header and footer backgrounds to dark mode.

