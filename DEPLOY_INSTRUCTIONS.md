# Thermo Sales Platform - Deployment Guide

This guide explains how to deploy the 4 components of the system using **Render** (for the backend services) and **Netlify** (for the frontends).

## 1. Project Structure

We have consolidated the project into 4 main parts:
1. `backend` (FastAPI / Python) -> Deploy to **Render**
2. `graph_service` (Node.js) -> Deploy to **Render**
3. `frontend` (Vite / React) -> Deploy to **Netlify**
4. `lead_profiler` (Next.js) -> Deploy to **Netlify**

---

## 2. Deploying the Graph Service (Render)

1. Create ONE GitHub repository containing the entire `thermo_deploy` folder. (You do **NOT** need separate repositories for each service! Both Netlify and Render allow you to connect the exact same repository and just specify a "Root Directory" for each service.)
2. Sign in to [Render](https://render.com/).
3. Create a new **Web Service**.
4. Connect your GitHub repository.
5. In the service settings:
   - **Root Directory**: `graph_service`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server/index.js`
   - **Environment Variables**: Add your original ones:
     - `NEO4J_URI=bolt://<YOUR_NEO4J_HOST>:7687` (You can get a free Neo4j AuraDB instance)
     - `NEO4J_USER=neo4j`
     - `NEO4J_PASSWORD=<YOUR_PASSWORD>`
     - `PORT=3000`

---

## 3. Deploying the Backend (Render)

The FastAPI backend depends on Graph Service. So wait until Graph Service is deployed and you get its Render URL (e.g., `https://graph-service-xxx.onrender.com`).

1. Create a second **Web Service** on Render pointing to the same repo.
2. Settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
   - **Environment Variables**:
     - `GRAPH_SERVICE_URL=https://<your-graph-service-url>`
     - `GEMINI_API_KEY=<Your_Key>`
     - `LLM_PROVIDER=gemini`

---

## 4. Deploying the Frontend (Netlify)

The Vite frontend relies on the Backend. So grab the FastAPI Render URL first (e.g., `https://backend-xxx.onrender.com`).

1. Sign in to [Netlify](https://app.netlify.com/).
2. Click **Add new site** -> **Import an existing project**.
3. Connect your GitHub repo.
4. Settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. **Environment Variables** -> Add New:
   - `VITE_API_BASE=https://<your-backend-url>`
   - `VITE_GRAPH_BASE=https://<your-graph-service-url>`

---

## 5. Deploying the Lead Profiler (Netlify)

The modern Next.js app inside `lead_profiler`.

1. In Netlify, **Add new site**.
2. Connect the same GitHub repo.
3. Settings:
   - **Base directory**: `lead_profiler`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - (Netlify will automatically detect it's a Next.js app and install its plugin).
4. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL=<Your Supabase URL>`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<Your Anon Key>`
   - `GEMINI_API_KEY=<Your Key>`
   - `TAVILY_API_KEY=<Your Key>`

---

## Post-Deployment Checklist
- Check Render logs for both backend and graph service to make sure they started and successfully connected to Neo4j.
- Open your Netlify URL for `frontend` and ensure pages load.
- Open your Netlify URL for `lead_profiler` and ensure AI functions work correctly.
