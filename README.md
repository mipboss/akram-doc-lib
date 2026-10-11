# PDF Library (Next.js on Vercel)

Mobile-first library of PDFs, with optional audio, in English and Gujarati.

- **Collections**: each has its own page (for example `/pads_by_cd`), and `/` shows the first one.
- **Readers** switch the language between ગુજરાતી and English (Gujarati by default), switch between light and dark mode, search by name, filter by tag, and open, download or listen to each document.
- **Administrators** sign in at `/admin` to create, rename and delete collections and tags, and to add, edit and delete documents. Each document has a PDF, optional audio (mp3, m4a, wav, ogg or webm), English and Gujarati names, a sort key and tags.

PDFs, audio and the catalog live in Vercel Blob.

## Deploy
1. Push this folder to a Git repo and import it in Vercel (or run `npx vercel`).
2. In the project: Storage > Create > Blob (public access), and connect it. This adds `BLOB_READ_WRITE_TOKEN`.
3. Settings > Environment Variables: add `ADMIN_PASSWORD` (the admin sign-in password).
4. Redeploy, open `/admin`, sign in, create a collection and upload PDFs.

## Local
`npm install`, put `BLOB_READ_WRITE_TOKEN` and `ADMIN_PASSWORD` in `.env.local` (`vercel env pull`), then `npm run dev`.

## Notes
- The catalog is one `catalog.json` in Blob: fine for thousands of documents and a few admins. For heavy concurrent edits, move it to a database such as Neon Postgres.
- A catalog from the first version (a flat list with categories) is converted when it is read: each category becomes a collection. It is saved in the new format the first time an administrator changes something.
- Documents can also point at PDFs or audio hosted elsewhere; deleting them never deletes files outside this project's Blob store.
- Use "Add to Home Screen" on a phone to run it like an app (manifest included).
