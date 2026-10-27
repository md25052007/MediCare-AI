# MediCare AI — Frontend

React + Vite + Tailwind CSS interface for MediCare AI.

## Run

The backend must be running at `http://127.0.0.1:8000` (see the [main README](../README.md)).

```bash
npm install
npm run dev      # development server on http://localhost:5173
npm run build    # production build in dist/
```

The backend address is set in [`src/api.js`](src/api.js).

## Structure

| File | Purpose |
|---|---|
| `src/components/Login.jsx` | Sign-in for doctors and patients |
| `src/components/DoctorDashboard.jsx` | Look up any patient's records, chat about one patient or the whole clinic, register doctors |
| `src/components/PatientDashboard.jsx` | A patient's own visit history and chat |
| `src/components/Header.jsx` | Top bar |
| `src/api.js` | Axios client; attaches the JWT to every request |
