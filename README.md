# Interval Trainer

A dependency-free, local-first interval training PWA. Workout data is stored only in the browser using `localStorage` and can be exported or imported as human-readable JSON.

## Local testing

Run any static web server in this directory, for example:

```powershell
python -m http.server 4173
```

Then open <http://localhost:4173>. A web server is required for service-worker/offline testing.

## Data format

Exports contain `preferences`, `bank`, and `plans`. Each plan has a name and an ordered `intervals` array; each interval has its own name and duration in seconds. Import supports replacement or merging.
