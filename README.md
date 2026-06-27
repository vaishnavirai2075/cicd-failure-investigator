# CI/CD Failure Investigator

An AI-powered pipeline failure investigator. When a build fails, the LangGraph agent automatically analyzes logs, searches similar past failures via RAG, and proposes a fix.

```
                        ┌─────────────────────────────────────┐
                        │           GitHub / CI System         │
                        └────────────────┬────────────────────┘
                                         │ POST /webhooks/github
                                         ▼
┌──────────┐     REST API      ┌─────────────────┐     SQL      ┌─────────┐
│ Next.js  │ ◄────────────── ► │   FastAPI        │ ◄─────────► │  MySQL  │
│ Frontend │                   │   Backend        │             └─────────┘
└──────────┘                   │                  │    Vector   ┌──────────┐
                               │   LangGraph      │ ◄─────────► │ ChromaDB │
                               │   ReAct Agent    │             └──────────┘
                               └────────┬─────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │   Groq LLM      │
                               │ llama-3.3-70b   │
                               └─────────────────┘
```

## Tech Stack

- **Backend:** Python, FastAPI, LangChain, LangGraph
- **LLM:** Groq (llama-3.3-70b-versatile)
- **Databases:** MySQL 8 + ChromaDB (vector store)
- **Embeddings:** sentence-transformers/all-MiniLM-L6-v2
- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui

## Local Setup

### Prerequisites
- Docker Desktop running
- Node.js 20+
- Conda (Python 3.11)

### 1. Clone the repo
```bash
git clone https://github.com/your-username/cicd-failure-investigator.git
cd cicd-failure-investigator
```

### 2. Set up environment variables

Copy and fill in your keys:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
DATABASE_URL=mysql+pymysql://root:password@localhost:3308/cicd_investigator
CHROMA_HOST=localhost
CHROMA_PORT=8002
OPENAI_API_KEY=your_groq_api_key
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile
WEBHOOK_SECRET=your-webhook-secret
```

### 3. Start databases
```bash
docker compose up -d mysql chromadb
```

### 4. Start backend
```bash
conda activate cicd
cd backend
uvicorn main:app --reload --port 8001
```

### 5. Seed the database
```bash
python services/seed.py
```

### 6. Start frontend
```bash
cd frontend
npm install
npm run dev -- --port 3002
```

Open `http://localhost:3002`

---

## Full Docker Setup (all services)

```bash
docker compose up --build
```

Open `http://localhost:3002`

---

## Railway Deployment

### 1. Push to GitHub
```bash
git add .
git commit -m "feat: complete CI/CD failure investigator v1.0.0"
git push origin main
```

### 2. Deploy backend on Railway
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo → select the `backend` folder as root
3. Add environment variables from `backend/.env`
4. Change `DATABASE_URL` and `CHROMA_HOST` to point to your Railway MySQL and ChromaDB services
5. Railway auto-detects the Dockerfile and deploys

### 3. Deploy frontend on Railway
1. New service → same repo → select `frontend` folder as root
2. Set `NEXT_PUBLIC_API_URL` to your deployed backend Railway URL
3. Railway auto-detects the Dockerfile and deploys

### 4. Add MySQL and ChromaDB on Railway
- New service → Database → MySQL
- New service → Deploy from Docker image → `chromadb/chroma:latest`

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/github` | Receive build webhook |
| GET | `/builds` | List all builds |
| GET | `/builds/{id}` | Build detail with logs |
| GET | `/builds/stats/overview` | Dashboard stats |
| GET | `/builds/stats/daily` | Trend chart data |
| POST | `/investigations/{id}/trigger` | Trigger AI investigation |
| GET | `/investigations/{id}` | Get investigation result |
| POST | `/chat` | Streaming chat (SSE) |
| GET | `/chat/builds` | Builds for chat sidebar |