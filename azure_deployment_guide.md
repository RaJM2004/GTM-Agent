# Complete Azure Deployment Guide for GTM-Agent

Deploying a complex application with multiple services (Frontend, Backend, and several Docker containers like Reacher and Evolution API) requires a solid architecture. Since you are using **Microsoft Azure**, here is the recommended architecture and step-by-step guide to get everything running in the cloud.

## Recommended Azure Architecture

To balance cost, scalability, and ease of management, here is the ideal stack for your services:

| Component | Local Setup | Azure Service Recommendation | Why? |
| :--- | :--- | :--- | :--- |
| **Frontend (React/Vite)** | `npm run dev` | **Azure Static Web Apps** | Free/cheap, auto-builds from GitHub, globally distributed CDN. |
| **Backend (FastAPI)** | `uvicorn app.main:app` | **Azure App Service (Web App)** | Native support for Python, easy SSL, easy scaling. |
| **Database** | MongoDB | **Azure Cosmos DB (MongoDB API)** | Fully managed, serverless options available, no manual maintenance. |
| **Reacher (Email Verification)** | `docker run ... reacherhq` | **Azure Container Instances (ACI)** | Cheapest way to run a standalone, stateless Docker container. |
| **Evolution API (WhatsApp)** | `docker run ... evoapicloud` | **Azure Container Instances (ACI)** | Evolution API requires persistent volumes for WhatsApp sessions, which ACI supports via Azure Files. |

---

## Step 1: Deploy the Supporting Docker Containers
Before deploying your backend, you need your external services (Reacher and Evolution API) running so you can get their cloud URLs.

### A. Deploy Reacher (Email Verification)
1. Go to the Azure Portal and search for **Container Instances**.
2. Click **Create** and configure it:
   - **Image source**: Docker Hub or other registry.
   - **Image type**: Public
   - **Image**: `reacherhq/check-if-email-exists:latest`
3. Under the **Networking** tab, expose port `8080`.
4. Deploy it. Once running, Azure will give you an IP address or FQDN (e.g., `reacher-gtm.eastus.azurecontainer.io`). 
   - *Keep this URL for your Backend's `.env` file!*

### B. Deploy Evolution API (WhatsApp)
Because WhatsApp sessions drop if the container restarts without storage, you **must** mount an Azure File Share to the container.
1. Create a Storage Account in Azure, and inside it, create a **File Share** (e.g., `evolution-data`).
2. Go to **Container Instances** and Create a new container:
   - **Image**: `evoapicloud/evolution-api:v1.8.2`
   - **Ports**: Expose `8080`.
3. Under **Advanced** (Environment Variables), add the exact ones you run locally:
   - `AUTHENTICATION_TYPE` = `apikey`
   - `AUTHENTICATION_API_KEY` = `gtm_super_secret_global_key`
   - `AUTHENTICATION_EXPOSE_IN_ENV` = `true`
4. Under **Volumes**, mount the Azure File Share you created to `/app/instances` (or wherever Evolution API stores its session data).
5. Deploy. You will get a cloud URL (e.g., `evo-gtm.eastus.azurecontainer.io:8080`). 
   - *Keep this URL for your Backend's `.env` file!*

---

## Step 2: Deploy the Database (MongoDB)
1. In the Azure Portal, create an **Azure Cosmos DB for MongoDB** resource.
2. Choose the **Serverless** pricing model (best for startups/new apps to keep costs near zero while testing).
3. Once created, go to "Connection Strings" and copy the Primary Connection String.
   - *Keep this URL for your Backend's `.env` file!*

---

## Step 3: Deploy the FastAPI Backend
We will use Azure App Service.
1. In the Azure Portal, create a **Web App**.
2. Configure it:
   - **Publish**: Code
   - **Runtime stack**: Python 3.11 (or your specific version)
   - **Operating System**: Linux
3. **Environment Variables**: Once the Web App is created, go to **Settings > Configuration** and add EVERYTHING from your local `.env` file, but **update the URLs**:
   - `MONGODB_URI` = *(Your Cosmos DB Connection String)*
   - `REACHER_API_URL` = `http://<your-reacher-aci-ip>:8080`
   - `EVOLUTION_API_URL` = `http://<your-evolution-aci-ip>:8080`
4. **Deploy the Code**: You can deploy by connecting your GitHub repository directly in the **Deployment Center** tab, or by using the VS Code Azure extension to push your `/backend` folder directly to the App Service.

> [!IMPORTANT]
> **Webhooks Configuration**: Once your backend is live (e.g., `https://gtm-backend.azurewebsites.net`), you must update your VAPI and Evolution API webhook settings to point to your new cloud URL instead of `localhost:8000`!

---

## Step 4: Deploy the React/Vite Frontend
We will use Azure Static Web Apps, which is completely free and optimized for React/Vite.
1. In the Azure Portal, create a **Static Web App**.
2. Choose the **Free** tier.
3. Under **Deployment Details**, link your GitHub account and select your repository.
4. **Build Details**:
   - Build Presets: React
   - App location: `/frontend` *(This tells Azure where your React code lives)*
   - Output location: `dist` *(This is where Vite outputs the build)*
5. **Environment Variables**: If your frontend needs to know where the backend is, add an environment variable (e.g., `VITE_API_URL` = `https://gtm-backend.azurewebsites.net`).
6. Deploy. Azure will automatically create a GitHub Action in your repo that builds and deploys your frontend every time you push code!

---

## Alternative: Azure Container Apps (The "Docker Compose" Way)
If you prefer keeping everything in Docker containers rather than splitting them between Web Apps and ACI, you can use **Azure Container Apps**. This service allows you to deploy your Backend, Reacher, and Evolution API into a single "Environment" where they can talk to each other securely over a private virtual network, just like a massive cloud-hosted `docker-compose` setup.
