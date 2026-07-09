# Quest Log Server

Self-hosted quest tracker. One small Node server, plain JSON files for storage, no database, no build step, no npm dependencies. Meant to run on a computer that's always on (or on when you want it), reachable from your phone and other devices over Tailscale.

## Running it

Requires only Node.js (no `npm install` needed — the server uses just Node's built-in `http`/`fs` modules).

```
cd quest-server
node server.js
```

By default it listens on port `4545` on all interfaces. Open `http://localhost:4545` in a browser to try it locally. To use a different port:

```
PORT=8080 node server.js
```

To keep it running in the background (so it survives closing the terminal), use something like `nohup node server.js &`, `screen`/`tmux`, or set it up as a service (e.g. `pm2 start server.js`, or a systemd unit if running on Linux).

## Using it from your phone / other devices via Tailscale

1. Make sure Tailscale is installed and signed in on both the machine running the server and your phone/other devices.
2. On the server machine, find its Tailscale IP (or MagicDNS name) — e.g. via `tailscale ip` or the Tailscale admin console.
3. On your phone, open `http://<tailscale-ip>:4545` (or `http://<machine-name>:4545` if MagicDNS is on).
4. Bookmark it / add it to your home screen for quick access.

No port forwarding, no public exposure — only devices on your tailnet can reach it.

## Profiles (no password)

The first screen you see is a profile picker: a list of existing profiles as buttons, plus a box to create a new one. There's no password — anyone who can reach the server (i.e. anyone on your tailnet) can open any profile. This is intentional, since the data isn't sensitive and the private network is the actual access boundary. Profile names can only contain letters, numbers, `-`, and `_` (up to 30 characters).

Each profile's data lives in its own file at `quest-server/data/<profile-name>.json`. Everything — quests, rewards, quotes, streaks, achievements, notes — is stored there and reloaded whenever that profile is opened, from any device.

## Backups

Since everything is plain JSON, backing up is just copying files. To back up all profiles:

```
cp -r quest-server/data /somewhere/safe/quest-data-backup-$(date +%F)
```

To restore, copy the `.json` files back into `quest-server/data/` (the server picks them up on next request, no restart needed).

## Project layout

```
quest-server/
  server.js       — the whole backend (http server + API + static file serving)
  package.json    — metadata only, zero dependencies
  public/
    index.html    — the whole frontend (single file, no build step)
  data/
    <profile>.json — one file per profile, created automatically
```

## API (for reference)

- `GET  /api/profiles` — list existing profile names
- `POST /api/profiles` — create a profile, body `{ "name": "..." }`
- `GET  /api/state/:profile` — fetch a profile's saved state (404 if it doesn't exist)
- `PUT  /api/state/:profile` — overwrite a profile's saved state, body is the full state object
- `DELETE /api/profiles/:profile` — delete a profile and its data

All requests and responses are same-origin JSON — the frontend and API are served by the same process on the same port, so there's no CORS to worry about even when accessed from a different device over Tailscale.
