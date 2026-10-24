
# CampusFlow

A modern university management system designed to simplify academic administration through a clean, responsive dashboard.

## Overview

CampusFlow is a full-stack web application for managing university operations, including student records, professors, courses, enrollments, and financial information.

The project combines a React and TypeScript frontend with a FastAPI backend and a PostgreSQL database.

## Features

- **Dashboard** — Overview of university activity, key metrics, and charts.
- **Student Management** — Create, view, edit, and delete student records.
- **Professor Management** — Organize professor information.
- **Course Management** — Manage academic courses.
- **Enrollment Management** — Manage student course enrollments.
- **Finance Management** — View and manage financial information.
- **Database Migrations** — Track database schema changes with Alembic.
- **API Status** — Display backend connection status.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide React

### Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL

## Project Structure

```text
CampusFlow/
├── backend/
│   ├── migrations/
│   ├── .env.example
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   ├── seed_data.py       # sample students, professors, courses
│   └── seed_courses.py    # sample course catalogue
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites

Install the following before running the project:

- Python
- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Blackace35z/CampusFlow.git
cd CampusFlow
```

### 2. Configure the backend

Create and activate a Python virtual environment inside the `backend` directory.

On Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and set your PostgreSQL connection URL:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/campusflow
```

Replace the placeholders with your actual credentials. Never commit your real `.env` file or database credentials.

Make sure PostgreSQL is running and the target database exists.

Apply the database migrations:

```powershell
python -m alembic -c alembic.ini upgrade head
```

Start the API:

```powershell
python -m uvicorn main:app --reload
```

The backend should be available at `http://127.0.0.1:8000`.

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### 3. Configure the frontend

Open a second terminal at the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

Ensure the backend is running and the frontend API configuration points to `http://127.0.0.1:8000`.

## Database

CampusFlow uses PostgreSQL for persistent data storage and Alembic to manage database schema migrations.

Database credentials are configured locally through environment variables and should never be committed to source control.

## Sample Data

With the backend running, load demo students, professors and courses:

```bash
python scripts/seed_data.py
python scripts/seed_courses.py
```

## Screenshots

<!-- Add 2-3 screenshots to docs/screenshots/ and link them here, for example: -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

## Project Status

CampusFlow is an ongoing portfolio project focused on full-stack development, database design, API development, and modern dashboard interfaces.

## Author

**Blackace35z**

GitHub: [@Blackace35z](https://github.com/Blackace35z)

## License

Released under the [MIT License](LICENSE).
