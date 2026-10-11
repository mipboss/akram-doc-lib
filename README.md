# PDF Library (Next.js on Vercel)

Mobile-first PDF library. Users search/filter by name, category and tag, then open or download. Administrators add and delete documents at `/admin`. PDFs and the catalog live in Vercel Blob.

## Deploy
1. Push this folder to a Git repo and import it in Vercel (or run `npx vercel`).
2. In the project: Storage > Create > Blob (public access), and connect it. This adds `BLOB_READ_WRITE_TOKEN`.
3. Settings > Environment Variables: add `ADMIN_PASSWORD` (the admin sign-in password).
4. Redeploy, open `/admin`, sign in and upload PDFs.

## Local
`npm install`, put `BLOB_READ_WRITE_TOKEN` and `ADMIN_PASSWORD` in `.env.local` (`vercel env pull`), then `npm run dev`.

## Notes
- The catalog is one `catalog.json` in Blob: fine for hundreds of documents and a few admins. For heavy concurrent edits or thousands of documents, move it to a database such as Neon Postgres.
- Use "Add to Home Screen" on a phone to run it like an app (manifest included).
