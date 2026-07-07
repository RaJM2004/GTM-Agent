# How to Run the Application

This guide contains all the necessary commands to run the GTM-Agent application locally, including the frontend, backend, and the Reacher email verification service.

## Prerequisites

Before running the application, ensure you have the following installed on your machine:
- **Node.js** and **npm** (for the frontend)
- **Python 3.x** (for the backend)
- **Docker Desktop** (for the Reacher email verification service)

---

## 1. Start the Email Verification Service (Reacher)

The application uses Reacher to verify discovered email addresses via SMTP handshake.

1. Open a terminal (Command Prompt or PowerShell).
2. Run the Reacher Docker container on port 8080:
   ```bash
   docker run -p 8080:8080 reacherhq/check-if-email-exists
   ```
3. Leave this terminal open and running in the background.

> **Note on Port 25 Blocking**: If your Internet Service Provider (ISP) blocks outgoing connections on Port 25, Reacher will fail to verify emails and will log "Server disconnected" errors. If this happens, the application will gracefully fall back to heuristic guessing ("Not scored" emails). To bypass this for production, you must host this Docker container on a cloud VPS where Port 25 is unblocked.

---

## 2. Start the Backend (Python / FastAPI)

The backend handles API requests, AI operations, and database connections.

1. Open a **new terminal** and navigate to the backend directory:
   ```bash
   cd c:\Users\DELL\Downloads\ZeroKost\GTM-Agent-main\new_Version1\GTM-Agent-main\backend
   ```
2. Activate the Python virtual environment:
   ```powershell
   .\venv\Scripts\activate
   ```
   *(If you are on Mac/Linux, use: `source venv/bin/activate`)*

3. Install the dependencies (if you haven't already):
   ```bash
   pip install -r requirements.txt
   ```
4. Ensure your `.env` file is properly configured. Specifically, make sure it includes the Reacher URL:
   ```env
   REACHER_API_URL="http://localhost:8080"
   ```
5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```
6. The backend API is now running at `http://localhost:8000`. Leave this terminal open.

---

## 3. Start the Frontend (React / Vite)

The frontend is built with React, Vite, and TailwindCSS.

1. Open a **third terminal** and navigate to the frontend directory:
   ```bash
   cd c:\Users\DELL\Downloads\ZeroKost\GTM-Agent-main\new_Version1\GTM-Agent-main\frontend
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. The terminal will output a local URL (usually `http://localhost:5173`). Open this URL in your web browser to use the application.

---

### Summary of Running Services
To have the full application functioning, you should have **three separate terminal windows** running simultaneously:
1. Docker container for Reacher.
2. `uvicorn` for the Python backend.
3. `npm run dev` for the React frontend.
