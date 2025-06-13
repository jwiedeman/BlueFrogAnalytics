# Blue Frog Analytics Site Overview

This document summarizes the new frontend located in `frontend/`. The site is built with **Astro 5** and **Tailwind CSS** instead of Bootstrap. Content pages use MDX and components from the BlueFrogAnalytics UI library.

## Primary Sections
- Homepage (`/`)
- About (`/about`)
- Services (`/services`)
- Membership (`/membership`)
- Contact (`/contact`)
- Discord (`/discord`)
- Testing & Tools (`/testing`)
- Promotional pages like `/birthday`, `/educator`, `/medical-professionals`, `/military-veterans`, `/new-business`
- Support pages such as `/payment-options` and `/site-feedback`
- Legal pages: `/privacy-policy`, `/privacy-choices`, `/terms-of-service`, `/terms-of-sale`, `/refund-policy`
- Client Login & Dashboard under `/dashboard` with various sub-pages
- Extensive documentation under `/docs`
- Blog (`/blog`) with posts sourced from `src/content/blog`

The Express API lives in `server/` and bots in `bots/` remain unchanged from the original site.
