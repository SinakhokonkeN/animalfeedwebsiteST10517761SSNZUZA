# Amashazi Animal Feed Suppliers — V2

The updated project is named **AmashaziAnimaLFeed.co.za**. That is the requested project/archive name; it does not mean a domain has been registered or a website deployed.

## Open in VS Code

1. Extract the ZIP.
2. Open the `AmashaziAnimaLFeed.co.za` folder in VS Code.
3. For normal browsing, right-click `index.html` and use Live Server. No framework, build step or package install is needed.
4. For the **working AJAX request service**, install Node.js 22 or later, open a terminal in this folder and run:

   ```sh
   node server.mjs
   ```

5. Open `http://localhost:3000`. Stop with Ctrl+C.

Double-clicking `index.html` also supports basic browsing, but use a local HTTP server for reliable browser storage and external integrations. On Live Server/static hosting the forms still validate, prepare, copy, print and download summaries. They do not claim that a request was sent when the backend is absent.

## What changed

- Ten coordinated pages with forest-green backgrounds, lime accents, strong typography and photography-led layouts inspired by the supplied Agri Nova screenshot.
- The existing Amashazi logo is retained, with gentle motion, hover feedback, an explicit pause control and operating-system reduced-motion support.
- All five supplied livestock photos replace the corresponding placeholder graphics. The 236 × 275 poultry image stays compact rather than being enlarged into a hero.
- Responsive hamburger navigation with Escape handling, hidden-menu inert state, focus wrapping and background scroll lock.
- Search, category filtering, sorting, details, persistent quote lists, quantity validation, removal and an empty state.
- Separate `enquiry.html` and `contact.html` forms with explicit actions, client/server validation, request summaries, AJAX recording and clear failures.
- Google Maps JavaScript API integration, modern advanced marker support for a verified address, lazy loading, error handling and a keyless area-map fallback.
- Gallery dialog with next/previous controls, keyboard navigation and focus restoration.
- Privacy information, submission checklist, source references and verification evidence.

## Google Maps: one configuration file

Edit `js/config.js`:

```js
maps: {
  apiKey: '',                 // Your restricted browser key
  mapId: '',                  // Your Google Cloud map ID
  areaQuery: 'Bulwer, KwaZulu-Natal, South Africa',
  areaCenter: { lat: -28.5, lng: 30.8 }, // Broad province view, not premises
  verifiedPosition: null,     // Owner-confirmed { lat, lng }
  verifiedAddress: false
}
```

With no key, the Load Google map button opens a keyless Google **area embed**. That fallback is not proof that the keyed API works. With a key, `js/maps.js` loads the Maps JavaScript API and imports the required libraries. A store marker only appears after the exact address/coordinates have been confirmed and enabled. See `docs/04-GOOGLE-MAPS-SETUP.md`.

## Contact and request delivery

Set `business.email`, `business.phone`, `business.hours` and the confirmed address in `js/config.js`. An empty email is deliberate: no business email was supplied, so no recipient is invented. Once a real email is set, valid forms offer **Open email draft** with the recipient, subject and message. The visitor still sends the email in their email app.

The included Node server implements:

| Endpoint | Behaviour |
|---|---|
| `GET /api/health` | Reports the local request service capability |
| `POST /api/enquiry` | Validates categories, quantities, dates, contact details and fulfilment, then records an enquiry |
| `POST /api/contact` | Validates a general message and topic, then records it |

Recorded requests go into `var/requests/` as private local JSON files. The server does not serve this directory, its source, or arbitrary paths. A returned receipt means **recorded on this server**, not emailed, stock-reserved, ordered or paid. Repeat submissions with the same request ID do not create duplicate records. Personal details are never added to the quote-list browser storage.

The server is suitable for the local assignment demonstration. A public deployment needs durable protected storage, an operator process for reading/responding to requests, HTTPS, and a configured email/delivery provider if automatic inbox delivery is required. A static host such as GitHub Pages does not run this Node server.

## Verification

```sh
node --test tests/site.test.mjs
python3 tests/site_check.py
```

The Node suite covers actual local HTTP submissions, bad-input rejection, retry idempotency, origin checks, private-path protection and quote storage failures. `tests/responsive.html` is a reusable browser viewport harness; with the Node server running, visit `http://localhost:3000/tests/responsive.html`.

See `docs/06-QA-REPORT.md` for what was actually checked and what remains unverified. No rubric score is claimed.

## Before submission

Read `docs/03-PART3-TRACEABILITY.md` and `docs/05-CONTENT-NEEDED.md`. The screenshots supplied cover form/repository instructions and a portion of Part 1; they are not the complete Part 2/Part 3 marking rubric. Two proposals, lecturer feedback, final budget, GitHub history, repository URL and public hosting evidence must come from the student's actual submission work.

The public folder to upload is **only** the ten root HTML pages, `css/`, `js/`, `assets/`, `robots.txt` and a sitemap regenerated for the actual live domain. Do not upload `var/`, tests, rubric screenshots or development documents as a public site. `tools/build_sitemap.py` generates `sitemap.xml` from a confirmed URL. `docs/sitemap-planned.xml` is a planning example using the requested domain, not a claim of ownership.
