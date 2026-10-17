# CareerPath Setup

## Database

For a new installation, import `database/career_website.sql` into MySQL. For an existing installation, run `database/feature_updates.sql` against the `career_website` database to add password-reset, profile, saved-job, quiz-history, and course-progress tables.

Configure the connection in `backend/config/database.php`.

## Run the site

Run the PHP development server from the project root so `frontend` and `backend` share one origin:

```powershell
php -S localhost:8000
```

Open `http://localhost:8000/` in a browser. Do not open the HTML pages with `file://` when testing database features.

## Password recovery email

Password recovery uses PHP `mail()`. Configure a working mail transport, then set these environment variables before starting PHP:

```powershell
$env:CAREERPATH_FROM_EMAIL = "no-reply@example.com"
$env:CAREERPATH_APP_URL = "http://localhost:8000"
php -S localhost:8000
```

Use the public HTTPS site URL for `CAREERPATH_APP_URL` when deployed.

## Admin access

Register a normal account, then promote that account explicitly in MySQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Sign out and sign back in to refresh the role in the session. Admin APIs independently enforce this role.
