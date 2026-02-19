# JobLess

<div align="center">

### AI-Powered Voice Interview Practice Platform

**Practice real interviews with an AI interviewer. Get scored. Get better.**

Built for [KitaHack 2026](https://kitahack.com) | UN SDG 8: Decent Work and Economic Growth

[Live Demo](#) &middot; [Devpost](#) &middot; [Video Demo](#)

</div>

---

## The Problem

Malaysian fresh graduates face a critical gap: **they lack interview experience**. Most go into their first real interview unprepared, with no way to practice under realistic conditions. Traditional mock interviews require scheduling with mentors, and generic AI chatbots don't simulate the pressure of a live conversation.

## The Solution

**JobLess** conducts realistic voice interviews using curated questions from top Malaysian companies like Grab, Shopee, and Google. After the interview, candidates receive detailed scored feedback with actionable improvement suggestions — all powered by Google's Agent Development Kit (ADK) and Gemini models.

---

## Features

- **Live Voice Interviews** — Real-time bidirectional audio streaming via Gemini Live API. No typing, just talk.

- **Curated Question Bank** — 150 hand-curated questions from 8 Malaysian companies across behavioral, technical, and situational categories.

- **Multi-Dimensional Scoring** — Each answer scored on Relevance (30%), Depth (25%), Structure (25%), and Communication (20%). STAR method detection for behavioral questions.

- **Detailed Feedback Reports** — Letter grades (A+ to F), per-question breakdowns, top strengths, improvement areas, and actionable next steps.

- **Real-Time Transcription** — Live transcript of both interviewer and candidate speech displayed during the interview.

- **Phase-Managed Flow** — Structured interview progression: Greeting → Questions → Closing → Complete, managed by the AI conductor.

---

## Architecture

```
Browser                         FastAPI                         Google Cloud
┌──────────────┐               ┌──────────────────┐            ┌──────────────┐
│  React 19    │  PCM 16kHz    │  WebSocket       │            │              │
│  + Vite      │──binary──────>│  /ws/interview   │            │  Gemini      │
│              │               │                  │──────────> │  Live API    │
│  AudioWorklet│  PCM 24kHz    │  ADK run_live()  │            │  (STT+LLM+  │
│  (recorder)  │<──binary──────│  event stream    │<────────── │   TTS)       │
│              │               │                  │            │              │
│  Transcript  │  JSON         │  transcription + │            │              │
│  display     │<──────────────│  phase events    │            │              │
└──────────────┘               └──────────────────┘            └──────────────┘

Post-Interview Pipeline:
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Transcript     │────>│  Evaluator Agent  │────>│  Feedback Agent   │
│  (from session) │     │  gemini-2.5-flash │     │  gemini-2.5-flash │
│                 │     │  Scores answers   │     │  Generates report │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

### Agent System (3 ADK Agents)

| Agent | Model | Mode | Purpose |
|---|---|---|---|
| **Conductor** | `gemini-2.0-flash` | `run_live()` | Manages the live voice interview — greets candidate, asks questions, listens, follows up |
| **Evaluator** | `gemini-2.5-flash` | `run_async()` | Scores each answer on 4 dimensions with weighted scoring (1-10 scale) |
| **Feedback** | `gemini-2.5-flash` | `run_async()` | Generates comprehensive feedback report with grades, strengths, and action items |

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Python 3.12 | Runtime |
| FastAPI | REST API + WebSocket server |
| Google ADK | Agent orchestration (`LlmAgent`, `Runner`, `LiveRequestQueue`) |
| Gemini Live API | Bidirectional audio streaming (STT + LLM + TTS in one round trip) |
| Pydantic v2 | Data validation + structured agent output schemas |
| Firebase/Firestore | Session persistence (optional) |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 7 | Build tool |
| TypeScript 5.9 | Type safety |
| Tailwind CSS 3 | Styling |
| Radix UI | Accessible UI primitives (shadcn/ui pattern) |
| AudioWorklet API | PCM audio capture (16kHz) and playback (24kHz) |

---

## Project Structure

```
JobLess/
├── backend/
│   ├── main.py                      # FastAPI entry point
│   ├── config.py                    # Settings (pydantic-settings)
│   ├── requirements.txt
│   ├── agents/
│   │   ├── conductor_agent.py       # Live voice interview agent
│   │   ├── evaluator_agent.py       # Post-interview scoring
│   │   └── feedback_agent.py        # Feedback report generation
│   ├── services/
│   │   ├── question_bank.py         # Question loader + selector
│   │   ├── session_manager.py       # Interview session lifecycle
│   │   ├── evaluation_pipeline.py   # Evaluator → Feedback orchestration
│   │   └── firestore_service.py     # Optional Firestore persistence
│   ├── models/
│   │   └── schemas.py               # Pydantic models
│   ├── api/
│   │   ├── routes/
│   │   │   ├── interviews.py        # REST: start, status, evaluate, feedback
│   │   │   └── questions.py         # REST: companies, positions, stats
│   │   └── websocket/
│   │       └── interview_ws.py      # WebSocket: live voice handler
│   └── data/
│       └── questions.json           # 150 curated interview questions
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx                  # Routes
│       ├── pages/
│       │   ├── HomePage.tsx         # Interview setup form
│       │   ├── InterviewPage.tsx    # Live interview UI + audio
│       │   └── FeedbackPage.tsx     # Post-interview report
│       ├── hooks/
│       │   ├── useAudioRecorder.ts  # Mic → PCM AudioWorklet
│       │   └── useAudioPlayer.ts    # PCM → Speaker AudioWorklet
│       ├── services/
│       │   ├── api.ts               # REST client (axios)
│       │   └── websocket.ts         # WebSocket client
│       └── lib/audio/
│           ├── pcm-recorder-processor.js
│           └── pcm-player-processor.js
│
└── README.md
```

---

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/interviews/start` | Start a new interview session |
| `GET` | `/api/v1/interviews/:id/status` | Get interview status and progress |
| `POST` | `/api/v1/interviews/:id/evaluate` | Trigger evaluation pipeline |
| `GET` | `/api/v1/interviews/:id/feedback` | Get feedback report |
| `GET` | `/api/v1/questions/companies` | List available companies |
| `GET` | `/api/v1/questions/positions` | List available positions |
| `GET` | `/api/v1/questions/stats` | Question bank statistics |

### WebSocket

```
WS /ws/interview/{session_id}

Client → Server:  binary PCM audio (16kHz, 16-bit, mono)
                  JSON: { type: "text_input", text: "..." }

Server → Client:  binary PCM audio (24kHz)
                  JSON: { type: "transcript", role, text, is_final }
                  JSON: { type: "phase", phase }
                  JSON: { type: "metadata", question_number, total_questions }
                  JSON: { type: "interview_complete" }
```

---

## Question Bank

150 curated questions across 8 company categories:

| Company | Questions | Types |
|---|---|---|
| Grab | 20 | Behavioral, Technical, Situational |
| Shopee | 20 | Behavioral, Technical, Situational |
| Google | 15 | Behavioral, Technical, System Design |
| TNG Digital | 15 | Behavioral, Technical |
| Petronas Digital | 10 | Behavioral, Situational |
| AirAsia | 10 | Behavioral, Product |
| Generic Tech | 30 | Mixed |
| Generic Non-Tech | 30 | Mixed |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- Google Cloud project with Gemini API enabled

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your GOOGLE_API_KEY and GOOGLE_CLOUD_PROJECT

# Run
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | Yes | Google Cloud project ID |
| `GOOGLE_API_KEY` | Yes | Gemini API key from AI Studio |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | Service account JSON path |
| `FIREBASE_CREDENTIALS` | No | Firebase credentials for persistence |

---

## How It Works

1. **Setup** — Candidate selects a company, position, and question types on the home page
2. **Interview** — The Conductor Agent greets the candidate and asks questions via live voice streaming. It listens, asks follow-ups, and manages the interview flow.
3. **Evaluation** — After the interview, the Evaluator Agent scores each answer on relevance, depth, structure, and communication
4. **Feedback** — The Feedback Agent generates a comprehensive report with grades, strengths, improvements, and actionable next steps

---

## Built With

- [Google ADK](https://google.github.io/adk-docs/) — Agent Development Kit for multi-agent orchestration
- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live) — Bidirectional audio streaming
- [FastAPI](https://fastapi.tiangolo.com/) — Backend framework
- [React](https://react.dev/) — Frontend framework
- [Vite](https://vitejs.dev/) — Frontend build tool
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Radix UI](https://www.radix-ui.com/) — Accessible component primitives

---

## Team

Built for **KitaHack 2026** by:

- **Alif Hakimi Azwan**

---

## License

This project is licensed under the MIT License.
