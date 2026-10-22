
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
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── seed_courses.py
├── seed_data.py
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

Create a `.env` file inside `backend/` and configure your PostgreSQL connection:

```env
DATABASE_URL=your_postgresql_connection_url
```

Replace the placeholder with your actual database connection URL. Never commit your real `.env` file or database credentials.

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

## Project Status

CampusFlow is an ongoing portfolio project focused on full-stack development, database design, API development, and modern dashboard interfaces.

## Author

**Blackace35z**

GitHub: [@Blackace35z](https://github.com/Blackace35z)
