# Home Haven Angular Capstone

Home Haven is a property marketplace for browsing available homes, registering and signing in, posting a property with one photo, viewing seller listings, and simulating a purchase. The Angular frontend calls a PHP JSON API, which uses the existing MySQL schema and PHP sessions. Demo checkout does not collect payment.

## Requirements

- XAMPP with Apache and MySQL
- PHP with `mysqli` and `fileinfo` enabled
- Node.js 24 LTS (the Angular workspace pins Node 24 in `frontend/.nvmrc`)
- npm

Angular 22 requires a supported Node release. If you use nvm, install and select the project version with `cd frontend && nvm install && nvm use`. On this machine, Node 24.22.3 is available through `npx --yes node@24`.

## Start the app

1. Start Apache and MySQL in XAMPP.
2. Import `database.sql` into MySQL using phpMyAdmin. The defaults in `includes/db.php` use host `127.0.0.1`, port `3307`, user `root`, and an empty password. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in Apache's environment if your MySQL settings differ.
3. Copy the repository into XAMPP's `htdocs/phpcapstone1` directory. Apache must allow `.htaccess` overrides (`AllowOverride All`) and `mod_rewrite` must be enabled for the API routes. Make `uploads/` writable by Apache for listing photos. If your existing copy already lives at `/Applications/XAMPP/xamppfiles/htdocs/phpcapstone1`, sync changes with:

   ```sh
   rsync -a --exclude='.git/' --exclude='frontend/node_modules/' --exclude='frontend/dist/' ./ /Applications/XAMPP/xamppfiles/htdocs/phpcapstone1/
   ```

4. In a separate terminal, start Angular:

   ```sh
   cd frontend
   nvm use
   npm ci
   npm start
   ```

5. Open `http://localhost:4200`. The Angular dev server proxies `/api` and `/uploads` to XAMPP at `http://127.0.0.1/phpcapstone1`. If Apache uses another port or folder name, update `frontend/proxy.conf.json` to match.

## Build

```sh
cd frontend
npm ci
npm run build
```

The production files are emitted under `frontend/dist/frontend/browser`. The current class setup is intended to run the Angular development server with the PHP API in XAMPP.

Run the frontend checks with:

```sh
cd frontend
npm run build
npm test -- --watch=false
```

## Main features

- Available property browse and detail pages
- Account creation, login, persistent PHP session, and logout
- Property posting with title, type, price, location, description, optional bedroom/bathroom counts, and one JPG/PNG/WEBP photo up to 2 MB
- Seller dashboard with available/sold status and buyer name
- Simulated purchase that marks the property sold without processing money

The API lives in `api/`; the earlier PHP-rendered pages remain in the repository as a reference. The Angular app is the interface served from port 4200.
