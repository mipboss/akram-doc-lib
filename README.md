# PDF Library (Next.js on Vercel)

Mobile-first library of PDFs, with optional audio, in English and Gujarati.

- **Collections**: each has its own page (for example `/pads_by_cd`), and `/` shows the first one.
- **Readers** switch the language between ગુજરાતી and English (Gujarati by default), switch between light and dark mode, search by name, filter by tag, and open, download or listen to each document.
- **Administrators** sign in at `/admin` to create, rename and delete collections and tags, and to add, edit and delete documents. Each document has a PDF, optional audio (mp3, m4a, wav, ogg or webm), English and Gujarati names, a sort key and tags.

The catalog lives in Vercel Blob. Uploaded PDFs and audio go to Vercel Blob or, if it is set up, an AWS S3 bucket (the admin picks one for each upload). Documents can also link to files hosted anywhere.

## Deploy
1. Push this folder to a Git repo and import it in Vercel (or run `npx vercel`).
2. In the project: Storage > Create > Blob (public access), and connect it. This adds `BLOB_READ_WRITE_TOKEN`.
3. Settings > Environment Variables: add `ADMIN_PASSWORD` (the admin sign-in password).
4. Redeploy, open `/admin`, sign in, create a collection and upload PDFs.

## Optional: upload to AWS S3
1. In AWS IAM, create an access key for a user whose only permission is uploading to the bucket:
   ```json
   { "Version": "2012-10-17", "Statement": [{ "Effect": "Allow", "Action": "s3:PutObject", "Resource": "arn:aws:s3:::YOUR-BUCKET/*" }] }
   ```
2. In the bucket's Permissions > Cross-origin resource sharing (CORS), allow uploads from the site:
   ```json
   [{ "AllowedOrigins": ["https://YOUR-SITE.vercel.app"], "AllowedMethods": ["POST"], "AllowedHeaders": ["*"] }]
   ```
3. Make sure readers can open the files: the bucket policy must allow public `s3:GetObject`.
4. In Vercel, Settings > Environment Variables: add `S3_BUCKET`, `S3_REGION` (default `us-east-1`), `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`, then redeploy.

The app never deletes files from S3, even when a document is deleted or its file replaced, because S3 links may be shared with other sites. Remove unused S3 files in the AWS console.

## Local
`npm install`, put `BLOB_READ_WRITE_TOKEN` and `ADMIN_PASSWORD` in `.env.local` (`vercel env pull`), then `npm run dev`.

## Notes
- The catalog is a JSON file in Blob; each save writes a new `catalog/<time>.json` and the last 10 are kept as backups. It is fine for thousands of documents and a few admins. For heavy concurrent edits, move it to a database such as Neon Postgres.
- A catalog from the first version (a flat list with categories) is converted when it is read: each category becomes a collection. It is saved in the new format the first time an administrator changes something.
- Documents can also point at PDFs or audio hosted elsewhere; deleting them never deletes files outside this project's Blob store.
- Use "Add to Home Screen" on a phone to run it like an app (manifest included).
