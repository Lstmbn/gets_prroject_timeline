# GeTs Architects Project Database — Vercel

Upload this complete project as one source repository. Do not combine it with the previous package.

Vercel project settings:

- Framework Preset: Next.js
- Root Directory: `./`
- Build Command: leave at default
- Output Directory: leave empty
- Install Command: leave at default
- Node.js: 22.x

Required environment variables:

- `GOOGLE_APPS_SCRIPT_URL`
- `GOOGLE_APPS_SCRIPT_TOKEN`

Google Apps Script:

1. Replace the script with `google-apps-script/Code.gs`.
2. Set Script Property `API_TOKEN` to the same value as `GOOGLE_APPS_SCRIPT_TOKEN`.
3. Deploy as Web app, execute as yourself, access set to anyone with the link.
4. Copy the `/exec` URL into `GOOGLE_APPS_SCRIPT_URL`.

The Google Sheet remains protected from direct editing. The web app token is checked by Apps Script before reads or writes.
