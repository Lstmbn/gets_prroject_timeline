# GeTs Project Control — Deployment

Upload this complete project as one source repository. Do not combine it with a previous package.

## Vercel settings

- Framework Preset: Next.js
- Root Directory: `./`
- Build Command: default
- Output Directory: empty
- Install Command: default
- Node.js: 22.x

## Required environment variables

Keep:

- `GOOGLE_APPS_SCRIPT_URL`
- `GOOGLE_APPS_SCRIPT_TOKEN`

Add:

- `USER_ACCESS_TOKENS`

The value of `USER_ACCESS_TOKENS` is one compact JSON object whose keys are
private user tokens and whose values are user names. Use
`USER_ACCESS_TOKENS.example.json` as the name list, replace every example key
with a different long random token, then paste the entire JSON object as the
Vercel value.

`Lus`, `Gri`, and `Josh` are administrators. Other valid token holders are task
owners. A person without a valid token remains view only.

## Google Apps Script

1. Replace `Code.gs` with `google-apps-script/Code.gs` from this package.
2. Keep Script Property `API_TOKEN` equal to `GOOGLE_APPS_SCRIPT_TOKEN`.
3. Create a new Web app deployment version, executing as yourself with access
   set to anyone with the link.
4. Keep the resulting `/exec` URL in `GOOGLE_APPS_SCRIPT_URL`.

The updated script supports multiple owners, Completed Date, update metadata,
and an automatic `WebApp_Audit_Log` sheet.

After the Apps Script and environment variable updates are complete, redeploy
Vercel without reusing the old build cache.
