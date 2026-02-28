# JobBless — AI Voice Interview Practice with Google ADK Multi-Agent System

<div align="center">

### AI Voice Interview Practice with Google ADK Multi-Agent Systemm

**Practice real interviews with an AI interviewer. Get scored. Get better.**

Built for [KitaHack 2026](https://kitahack.com) | UN SDG 8: Decent Work and Economic Growth

[Live Demo](#) &middot; [Devpost](#) &middot; [Video Demo](#)

</div>

---

## The Problem

Malaysian fresh graduates face a critical gap: **they lack interview experience**. Most go into their first real interview unprepared, with no way to practice under realistic conditions. Traditional mock interviews require scheduling with mentors, and generic AI chatbots don't simulate the pressure of a live conversation.

## The Solution

**JobBless** conducts realistic voice interviews using curated questions from top Malaysian companies like Grab, Shopee, and Google. After the interview, candidates receive detailed scored feedback with actionable improvement suggestions — all powered by Google's Agent Development Kit (ADK) and Gemini models.

---

## Features

- **Resume Analyzer** — Upload your resume PDF and get coordinate-based annotation overlays highlighting standout sections, plus detailed written feedback on content, structure, and ATS optimization for Malaysian companies.

- **Live Voice Interviews** — Real-time bidirectional audio streaming via Gemini Live API. No typing, just talk.

- **Curated Question Bank** — 150 hand-curated questions from 8 Malaysian companies across behavioral, technical, and situational categories.

- **Multi-Dimensional Scoring** — Each answer scored on Relevance (30%), Depth (25%), Structure (25%), and Communication (20%). STAR method detection for behavioral questions.

- **Detailed Feedback Reports** — Letter grades (A+ to F), per-question breakdowns, top strengths, improvement areas, and actionable next steps.

- **Real-Time Transcription** — Live transcript of both interviewer and candidate speech displayed during the interview.

- **Phase-Managed Flow** — Structured interview progression: Greeting → Questions → Closing → Complete, managed by the AI conductor.

---

## How It Works

![How It Works](docs/mermaid-chart.png)

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
│  (from session) │     │  gemini-2.5-pro   │     │  gemini-2.5-pro   │
│                 │     │  Scores answers   │     │  Generates report │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

### Agent System (5 Agents)

| Agent                  | Model              | Mode          | Purpose                                                                                  |
| ---------------------- | ------------------ | ------------- | ---------------------------------------------------------------------------------------- |
| **Conductor**          | `gemini-2.5-flash` | `run_live()`  | Manages the live voice interview — greets candidate, asks questions, listens, follows up |
| **Evaluator**          | `gemini-2.5-pro`   | `run_async()` | Scores each answer on 4 dimensions with weighted scoring (1-10 scale)                    |
| **Interview Feedback** | `gemini-2.5-pro`   | `run_async()` | Generates comprehensive post-interview report with grades, strengths, and action items   |
| **Resume Annotation**  | `gemini-2.5-flash` | Direct API    | Analyzes resume PDF via Gemini Files API and returns coordinate-based highlights         |
| **Resume Feedback**    | `gemini-2.5-flash` | Direct API    | Reviews resume content, structure, and ATS fit for Malaysian tech companies              |

---

## Tech Stack

### Backend

| Technology         | Purpose                                                           |
| ------------------ | ----------------------------------------------------------------- |
| Python 3.12        | Runtime                                                           |
| FastAPI            | REST API + WebSocket server                                       |
| Google ADK         | Agent orchestration (`LlmAgent`, `Runner`, `LiveRequestQueue`)    |
| Gemini Live API    | Bidirectional audio streaming (STT + LLM + TTS in one round trip) |
| Pydantic v2        | Data validation + structured agent output schemas                 |
| Firebase/Firestore | Session persistence (optional)                                    |

### Frontend

| Technology       | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| React 19         | UI framework                                   |
| Vite 7           | Build tool                                     |
| TypeScript 5.9   | Type safety                                    |
| Tailwind CSS 3   | Styling                                        |
| Radix UI         | Accessible UI primitives (shadcn/ui pattern)   |
| AudioWorklet API | PCM audio capture (16kHz) and playback (24kHz) |

---

## Project Structure

```
JobBless/
├── backend/
│   ├── main.py                      # FastAPI entry point
│   ├── config.py                    # Settings (pydantic-settings)
│   ├── requirements.txt
│   ├── agents/
│   │   ├── interview/
│   │   │   ├── conductor_agent.py   # Live voice interview agent
│   │   │   ├── evaluator_agent.py   # Post-interview scoring
│   │   │   └── feedback_agent.py    # Interview report generation
│   │   └── resume/
│   │       ├── annotation_agent.py  # PDF coordinate-based highlighting
│   │       └── feedback_agent.py    # Resume content review
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
│       │   ├── LandingPage.tsx      # Home — choose resume or interview
│       │   ├── ResumePage.tsx       # Resume upload, annotations + chat
│       │   ├── HomePage.tsx         # Interview setup form
│       │   ├── InterviewPage.tsx    # Live interview UI + audio
│       │   └── FeedbackPage.tsx     # Post-interview report
│       ├── hooks/
│       │   ├── useAudioRecorder.ts  # Mic → PCM AudioWorklet
│       │   └── useAudioPlayer.ts    # PCM → Speaker AudioWorklet
│       ├── services/
│       │   ├── api.ts               # REST client
│       │   └── websocket.ts         # WebSocket client
│       └── lib/audio/
│           ├── pcm-recorder-processor.js
│           └── pcm-player-processor.js
│
└── README.md
```

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

| Variable                         | Required | Description                          |
| -------------------------------- | -------- | ------------------------------------ |
| `GOOGLE_CLOUD_PROJECT`           | Yes      | Google Cloud project ID              |
| `GOOGLE_API_KEY`                 | Yes      | Gemini API key from AI Studio        |
| `GOOGLE_APPLICATION_CREDENTIALS` | No       | Service account JSON path            |
| `FIREBASE_CREDENTIALS`           | No       | Firebase credentials for persistence |

---

## How It Works

1. **Resume Check (optional)** — Upload a resume PDF. The Annotation Agent highlights key sections with coordinate overlays directly on the document. The Resume Feedback Agent provides written feedback on content, structure, and ATS fit. A chat interface lets candidates ask follow-up questions about their resume.
2. **Setup** — Candidate selects a company, position, and question types on the setup page (can be pre-filled from the resume flow).
3. **Interview** — The Conductor Agent greets the candidate and asks questions via live voice streaming. It listens, asks follow-ups, and manages the interview flow through phases: Greeting → Questions → Closing → Complete.
4. **Evaluation** — After the interview, the Evaluator Agent scores each answer on relevance, depth, structure, and communication.
5. **Feedback** — The Interview Feedback Agent generates a comprehensive report with letter grades, per-question breakdowns, strengths, and actionable next steps.

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
