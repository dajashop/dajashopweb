# Images after saving a product

The admin can save while the initial large AVIF is still being generated.
`backgroundImageQueue.js` owns the browser queue independently of product editors.
It starts immediately and processes one image at a time across editors.

Before saving, completed images are included in the regular product save. While
that save is pending, publication to the form pauses so a completion cannot be
overwritten by an older form snapshot. After saving, remaining jobs receive the
confirmed product ID and gallery positions in IndexedDB before the editor closes.
They attach through the existing idempotent product-media endpoint after becoming
ready. Attach failures retry linking the completed image rather than uploading it
again. A failed earlier image holds its gallery position until retried or removed.

`BackgroundImageStatus` is mounted once for the authenticated staff member in App.
It shows pending jobs and errors with retry/remove controls even outside admin
routes. It resumes saved-product queues from the same browser after refresh.
Closing the browser stops new transfers; local files are not a server-side queue.
Do not clear browser storage or change devices while unfinished local jobs remain.

The backend initial AVIF pipeline, image quality, and the 03:00–07:00 overnight
derivative schedule are unchanged. Product deletion/authorization is still enforced
by the existing upload/attachment APIs. Destinations and files are scoped to the
staff user in local storage.

No tests or deployment checks were run for this change, per project instructions.
