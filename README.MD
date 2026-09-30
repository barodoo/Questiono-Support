a worker file that has a support page that actually looks nice

1. Create the D1 database

In Cloudflare Dashboard:

Workers & Pages → D1 SQL database → Create database

Name it:

support-db

Create it.

2. Create the tables

Open your support-db → Console / SQL.

Paste this entire SQL:

CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

Click Execute.

You should get a successful execution message.

3. Check the tables

Run:

SELECT name
FROM sqlite_master
WHERE type = 'table';

You should see:

tickets
messages
4. Add the D1 binding to the Worker

Go to:

Workers & Pages → your Worker → Settings → Bindings

Add:

Binding type:

D1 database

Variable name:

DB

D1 database:

support-db

Save/deploy the Worker.

5. Put the Worker code in worker.js

Replace the entire existing worker.js with the full code I gave you.

Do not put anything before:

export default {

And do not put anything after the final:

`;
6. Deploy

If you're using the Cloudflare Dashboard, click:

Save and deploy

If you're using Wrangler:

npx wrangler deploy
7. Test the user page

Open:

https://YOUR-WORKER-DOMAIN/support

Example:

https://support.example.workers.dev/support

Enter a username, for example:

barad

Then create a ticket.

8. Test the admin page

Open:

https://YOUR-WORKER-DOMAIN/admin

You should see the ticket you just created.

From there you can:

See all tickets
Open a ticket
Read messages
Reply to the user
Close the ticket
9. Test refresh persistence

On /support, sign in as:

barad

Create a ticket.

Refresh the page.

The username is restored from localStorage, and the tickets are loaded from D1, so the tickets remain there.
