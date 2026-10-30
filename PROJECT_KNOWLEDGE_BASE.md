# PROJECT_KNOWLEDGE_BASE.md
## Sanjeevni AI & Swasya AI System Knowledge Base & Architectural Reference

> **NOTICE FOR FUTURE AI AGENTS:**
> This document is the definitive technical authority on the codebase architecture, data schemas, API contracts, and engineering constraints of **Sanjeevni AI** (`/home/tanmay/Desktop/Sanjeevni-AI-1`) and its connected PHC management system **Swasya AI** (`/home/tanmay/Desktop/swasya_ai`).
>
> You must consult this file **before** making changes to either project. Do not modify source code, alter schemas, or introduce dependencies without verifying against the specifications documented below.

---

## A. Project Identity & Clinical Purpose

- **Official Names:**
  - `Sanjeevni AI` (Edge 3D Virtual Doctor Intake Kiosk)
  - `Swasya AI` (PHC Medical Officer Command Center & Clinical Co-Pilot)
- **Domain:** HealthTech / Clinical Artificial Intelligence / Primary Healthcare Digital Public Goods.
- **Problem Statement:** Primary Healthcare Centres (PHCs) in India operate under severe clinical strain. With physician shortages, paper record fragmentation, and high patient volumes, doctors spend the majority of consultation windows taking basic clinical history, recording vitals, and manually translating complaints rather than diagnosing complex pathology.
- **Unified Value Proposition:** Sanjeevni AI handles pre-consultation patient intake via a localized, empathetic 3D avatar with speech-to-speech interaction, anatomical pain mapping, and prescription digitization. Swasya AI ingests this structured intake into an active doctor queue with automatic triage priority escalation and provides clinical decision support (differential diagnoses and drug-drug contraindication safety checks).
- **Target Users:**
  1. *Rural & Semi-Urban Indian Patients:* Interacting via voice in Hindi, Hinglish, Bengali, Kannada, or English.
  2. *PHC Medical Officers / General Physicians:* Reviewing pre-structured SOAP notes and differential diagnoses.
  3. *Staff Nurses & ASHA Workers:* Utilizing the queue and patient timeline for screening.

---

## B. Technology Inventory & Version Matrix

| Layer | Technology | Version | Location / Config | Core Responsibility |
|---|---|---|---|---|
| **Kiosk Frontend** | React | `^18.2.0` | `frontend/package.json` | Component lifecycle, state management, modal UI. |
| **Kiosk Frontend** | Three.js | `0.152.1` | `frontend/package.json` | WebGL canvas, 3D scene rendering, lighting. |
| **Kiosk Frontend** | @react-three/fiber | `8.13.3` | `frontend/package.json` | Declarative React Three.js wrapper. |
| **Kiosk Frontend** | @react-three/drei | `9.78.1` | `frontend/package.json` | GLTF loading, CameraControls, ContactShadows. |
| **Kiosk Frontend** | Vite | `^4.1.0` | `frontend/vite.config.js` | Fast HMR dev server and optimized production bundler. |
| **Kiosk Frontend** | jsPDF | `^4.2.1` | `frontend/src/utils/` | Client-side vector generation of clinical intake PDF summaries. |
| **Kiosk Frontend** | Web Speech API | Native Browser | `frontend/src/components/UI.jsx` | Hands-free continuous speech-to-text recognition with silence detection. |
| **Kiosk Backend** | Node.js / Express | `^5.2.1` | `backend/package.json` | Server routing, external API proxying, audio processing orchestration. |
| **Kiosk Backend** | better-sqlite3 | `^13.0.3` | `backend/db.js` | Synchronous, zero-latency local SQLite database with WAL mode. |
| **Kiosk Backend** | Groq SDK | `^1.1.1` | `backend/index.js` | High-speed LLM inference for conversation and vision OCR. |
| **Kiosk Backend** | Multer | `^2.3.0` | `backend/index.js` | Memory storage middleware for multi-part file uploads (prescriptions). |
| **Hospital Backend** | Python / FastAPI | `0.115.0` | `backend/simple_backend/` | High-performance asynchronous REST API powering Swasya PHC operations. |
| **Hospital Backend** | Uvicorn | `0.32.0` | `backend/simple_backend/` | ASGI production server running Swasya FastAPI. |
| **Hospital Backend** | Motor | `>=3.6.1` | `backend/simple_backend/` | Asynchronous MongoDB driver for patient timelines and queue persistence. |
| **Hospital Backend** | Pydantic | `2.9.2` | `backend/simple_backend/` | Request/response schema validation and type safety. |
| **Hospital Frontend**| React + Vite + Tailwind | `18.2.0` | `swasya_ai/client/` | Doctor & Nurse medical dashboard with glassmorphism UI. |
| **Speech & Audio** | Murf AI GEN2 API | REST Cloud | `backend/index.js` | Neural Text-To-Speech engine generating MP3 audio in Hindi and English. |
| **Speech & Audio** | Rhubarb Lip Sync | `1.13 / 1.14` | Binary CLI (`rhubarb`) | Acoustic phonetic phoneme extraction generating JSON viseme mouth cues. |
| **Speech & Audio** | FFmpeg | `8.x` | Binary CLI (`ffmpeg`) | Transcoding MP3 audio to 16-bit 16kHz mono WAV required by Rhubarb. |

---

## C. System Architecture & Cross-Project Topology

### 1. Architectural Model
The ecosystem adopts an **Asynchronous Edge-to-Hub Topology**:
- **The Edge (Sanjeevni AI):** Deployed locally inside the PHC waiting area or on a kiosk touchscreen terminal. Operates independently even if cloud internet drops by persisting visits locally in SQLite.
- **The Hub (Swasya AI):** Deployed within the hospital intranet or on cloud servers (FastAPI + MongoDB Atlas). Serves the Doctor's desktop and Nurse mobile terminals.

### 2. Network Topology & Ports
```
[Patient Kiosk] (localhost:5173 / Vite)
        │
        ▼ (HTTP REST / JSON)
[Sanjeevni Node Engine] (localhost:3125 / Express)
        │
        ├── Groq Cloud API (groq/compound-mini & llama-3.2-11b-vision)
        ├── Murf AI TTS (https://api.murf.ai/v1/speech/generate)
        ├── Local Rhubarb & FFmpeg binaries (subprocesses)
        ├── Local SQLite WAL (backend/patient_records.db)
        │
        ▼ (HTTP REST / JSON via SWASYA_API_URL)
[Swasya Clinical Backend] (localhost:8000 / FastAPI)
        │
        ├── MongoDB Atlas / JSON File Fallback (data/*.json)
        ├── Groq CDSS Engine (LLaMA 3.3 70B Differential Diagnosis)
        │
        ▼ (HTTP REST / JSON)
[Swasya Doctor Dashboard] (localhost:3000 or :5173 / React Vite)
```

---

## D. Feature Implementation Details

### 1. 3D Character Rigging & Lip-Sync Animation (`Avatar.jsx`)
- **Model Geometry:** ReadyPlayerMe humanoid character loaded from `/models/64f1a714fe61576b46f27ca2.glb`. Preloaded to prevent layout shift.
- **Viseme Phoneme Mapping:**
  Rhubarb outputs 9 standard phoneme targets (`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `X`).
  These are transformed in `Avatar.jsx` to ReadyPlayerMe ARKit morph targets:
  - `A` $\to$ `viseme_PP` (P, B, M sounds)
  - `B` $\to$ `viseme_kk` (K, G, N sounds)
  - `C` $\to$ `viseme_I` (Eh, Ae sounds)
  - `D` $\to$ `viseme_AA` (Ah, Aw sounds)
  - `E` $\to$ `viseme_O` (Oh, Ow sounds)
  - `F` $\to$ `viseme_U` (Oo, Y sounds)
  - `G` $\to$ `viseme_FF` (F, V sounds)
  - `H` $\to$ `viseme_TH` (Th, Dh sounds)
  - `X` $\to$ `viseme_PP` (Neutral/rest)
- **Facial Emotion Blending:**
  The LLM output returns a `facialExpression` string (`smile`, `thinking`, `concerned`, `nodding`, `sad`, `angry`, `surprised`). In `useFrame`, Three.js linearly interpolates (`THREE.MathUtils.lerp`) morph target values across frames at a delta factor of `0.1`.
- **Procedural Eye Blinking:**
  Eye morph targets (`eyeBlinkLeft`, `eyeBlinkRight`) fire randomly (`Math.random() < 0.012`) and close over 120ms before reopening, creating realistic humanoid eye behavior.

### 2. Hands-Free Conversational Voice Loop (`UI.jsx` & `useChat.jsx`)
- Continuous conversation loop leveraging `webkitSpeechRecognition`.
- **Collision Avoidance:** `isAvatarSpeaking` (evaluated as `!!message || loading || pythonPlaying`) suppresses microphone input when the avatar is speaking to prevent acoustic feedback loops.
- **Silence Auto-Dispatch:** Once the user ceases speaking, a `1400ms` silence timer triggers `triggerAutoSend()`, dispatching the transcript to `/chat` without requiring button presses.

### 3. Interactive Anatomical 2D Body Map (`components/bodyMap/`)
- SVG vector graphics depicting human anterior (front) and posterior (back) anatomical planes across 28 discrete clickable zones (e.g., `chest`, `abdomen`, `head`, `lower_back`, `left_knee`, `cervical_spine`).
- **Severity Scoring:** Includes a 1–10 slider (`Mild 1-3`, `Moderate 4-6`, `Severe 7-8`, `Extreme 9-10`).
- **Automated Triage Alerts:**
  - If a patient selects `chest`, `head`, or `spine`, or scores severity $\ge 7$, `highRiskEmergency` state is set to `true`.
  - A red alert banner instructs the patient on calling emergency services (108).
  - The payload transmitted to Swasya AI is flagged with `priority: "emergency"`.

### 4. Multimodal Prescription & Document OCR (`backend/index.js`)
- Route: `POST /upload-document`
- Accepts image buffers (`image/png`, `image/jpeg`) or PDFs via Multer memory storage.
- Dispatched to Groq Vision `llama-3.2-11b-vision-preview` with clinical extraction instructions.
- Extracted medications, dosages, and abnormal lab parameters are automatically injected into `chatHistory` as:
  `[SYSTEM ALERT: The patient has uploaded a prior medical document... Here is the AI-extracted summary...]`
  The Avatar immediately acknowledges the document in its next spoken turn.

### 5. Swasya Clinical Decision Support System (CDSS) (`AIDiagnosisPanel.jsx`)
- Leverages Groq LLaMA 3.3 (70B) to evaluate the Avatar's SOAP note assessment alongside patient age, gender, and comorbidity history.
- Returns:
  1. Top 3 differential diagnoses with calibrated confidence percentages.
  2. Urgency classification (`normal`, `urgent`, `emergency`).
  3. Recommended diagnostic investigations and clinical red flags.

---

## E. Database Architecture & Schemas

### 1. Edge Local SQLite Database (`backend/patient_records.db`)
- Managed by `better-sqlite3`.
- Initialized with **Write-Ahead Logging** (`PRAGMA journal_mode = WAL;`) for high concurrency and crash safety.

```sql
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  abhaId TEXT,
  name TEXT,
  age TEXT,
  mobile TEXT,
  language TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patientId TEXT,
  date TEXT,
  selectedBodyPart TEXT,
  painSeverity INTEGER,
  summary TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients (id)
);
```

### 2. Central Hub MongoDB Schemas (`swasya_ai/backend/simple_backend`)
- **Patients Collection (`patients`):**
  ```json
  {
    "patient_id": "DEMO_PAT_001",
    "uhid": "UHID001",
    "name": "Ramesh Kumar",
    "age": 62,
    "gender": "male",
    "phone": "9876543210",
    "address": "Village Khanna, Punjab",
    "blood_group": "O+",
    "status": "active",
    "chronic_conditions": ["Type 2 Diabetes", "Hypertension"],
    "allergies": ["Penicillin"],
    "created_at": "2026-06-30T10:00:00Z"
  }
  ```
- **Timeline Notes Collection (`notes`):**
  ```json
  {
    "note_id": "NOTE_PAT001_001",
    "patient_id": "DEMO_PAT_001",
    "created_at": "2026-10-30T16:45:00Z",
    "audio_file": "AI_Avatar_Generated",
    "intake_source": "sanjeevni_avatar",
    "soap_note": {
      "subjective": "Consultation done through Sanjeevni AI Avatar (ALLOPATHIC). Reported region: Lower Back, Severity: 7/10",
      "objective": "Pre-consultation kiosk screening. Attached records: prescription.jpg",
      "assessment": "Patient complains of sharp lower back pain radiating to left leg for 4 days.",
      "plan": "Review Sanjeevni AI summary and proceed with clinical assessment",
      "chief_complaint": "Sanjeevni Avatar Intake: Lower Back (Pain 7/10)"
    }
  }
  ```
- **Queue Collection (`queue`):**
  ```json
  {
    "queue_id": "Q_DEMO_001",
    "patient_id": "DEMO_PAT_001",
    "patient_name": "Ramesh Kumar",
    "token_number": 1,
    "priority": "emergency",
    "status": "ready_for_doctor",
    "source": "sanjeevni_avatar",
    "added_at": "2026-10-30T16:45:00Z",
    "nurse_completed_at": "2026-10-30T16:45:00Z",
    "vitals": {
      "temp": "98.6°F",
      "bp": "120/80",
      "heartRate": "72 bpm",
      "spo2": "98%",
      "weight": "68 kg"
    }
  }
  ```

---

## F. Complete API Reference

### Sanjeevni AI Backend (`localhost:3125`)

#### 1. `POST /chat`
- **Purpose:** Primary conversational turn with Sanjeevni 3D Doctor Avatar.
- **Request Body:**
  ```json
  {
    "message": "Doctor sahab, mere kamar mein bohot tej dard ho raha hai.",
    "patientData": {
      "id": "1001",
      "name": "Ramesh Kumar",
      "age": "45",
      "mobile": "9876543210",
      "language": "hi-IN",
      "system": "allopathic",
      "abhaId": "ABHA-9876-5432-1098",
      "selectedBodyPart": "Lower Back",
      "painSeverity": 7
    }
  }
  ```
- **Response Format:**
  ```json
  {
    "messages": [
      {
        "text": "नमस्ते रमेश जी। मैं समझ सकता हूँ। क्या यह दर्द चलने या झुकने पर और बढ़ जाता है?",
        "facialExpression": "concerned",
        "animation": "Talking_1",
        "audio": "UklGRi...",
        "lipsync": {
          "metadata": { "duration": 3.42 },
          "mouthCues": [
            { "start": 0.00, "end": 0.12, "value": "X" },
            { "start": 0.12, "end": 0.28, "value": "B" },
            { "start": 0.28, "end": 0.45, "value": "D" }
          ]
        }
      }
    ]
  }
  ```

#### 2. `GET /api/patient-lookup?query=:identifier`
- **Purpose:** Searches for existing patient by ABHA ID, mobile number, or patient ID.
- **Behavior:** Queries Swasya AI (`http://localhost:8000/patients/check-uhid/:query`) first. If found, fetches clinical summary. Falls back to local SQLite DB.
- **Response Format:**
  ```json
  {
    "found": true,
    "source": "Swasya AI PHC Records",
    "patient": {
      "id": "DEMO_PAT_001",
      "abhaId": "UHID001",
      "name": "Ramesh Kumar",
      "age": "62",
      "mobile": "9876543210",
      "language": "hi-IN",
      "chronicConditions": ["Type 2 Diabetes", "Hypertension"],
      "allergies": ["Penicillin"],
      "pastVisits": [
        {
          "date": "2026-10-27",
          "selectedBodyPart": "Routine Diabetic Follow-up",
          "painSeverity": 5,
          "summary": "Blood sugars elevated. Advised diet control."
        }
      ]
    }
  }
  ```

#### 3. `POST /send-to-doctor`
- **Purpose:** Concludes consultation, compiles clinical summary, updates local SQLite, and dispatches intake payload to Swasya AI live queue.
- **Request Body:**
  ```json
  {
    "name": "Ramesh Kumar",
    "age": "62",
    "mobile": "9876543210",
    "id": "UHID001",
    "system": "allopathic"
  }
  ```
- **Response Format:**
  ```json
  {
    "success": true,
    "summary": "### Clinical Summary\n**Chief Complaint:** Lower Back Pain...",
    "swasyaSynced": true,
    "message": "Summary generated and routed directly into Swasya Doctor Queue!",
    "file": "audios/summary_UHID001_1788640000.txt"
  }
  ```

#### 4. `POST /upload-document`
- **Purpose:** Uploads medical image or PDF for Groq Vision OCR extraction.
- **Form Data:** `document: File`
- **Response Format:**
  ```json
  {
    "success": true,
    "extractedData": "Prescription dated 12/08/2026. Rx: Metformin 500mg BD, Telmisartan 40mg OD."
  }
  ```

---

### Swasya AI Backend (`localhost:8000`)

#### 1. `POST /patients/avatar-summary`
- **Payload Schema:** `AvatarSummaryPayload` (`uhid`, `name`, `age`, `phone`, `summary`, `selected_body_part`, `pain_severity`, `system`, `attached_report`).
- **Response:** `{ "success": true, "message": "...", "patient_id": "PAT_..." }`

#### 2. `GET /patients/check-uhid/{uhid}`
- **Purpose:** Verifies whether a government UHID exists in MongoDB Atlas or local JSON storage.
- **Response:** `{ "success": true, "exists": true, "patient": { ... } }`

#### 3. `GET /patients/summary/{patient_id}`
- **Purpose:** Retrieves structured clinical briefing, latest SOAP note, and recent medication history by `patient_id` or `uhid`.

#### 4. `GET /queue`
- **Purpose:** Returns all active and waiting patients in the PHC queue sorted by arrival time and clinical priority.

---

## G. Critical Files & Engineering Directory Guide

| File Path | Purpose & Responsibility | Guidelines for Future Changes |
|---|---|---|
| `backend/index.js` | Core Express intake server, Groq chat completions, Murf API calls, Rhubarb subprocess spawns, Swasya proxying. | Maintain non-blocking error handling around TTS and Swasya fetch calls. Never allow a failed external network call to throw an uncaught exception. |
| `backend/db.js` | Initializes `better-sqlite3` instance and establishes WAL journal mode. | Use parameterized queries exclusively (`prepare(...).run(...)`). Always resolve `patient_records.db` relative to `__dirname`. |
| `frontend/src/components/UI.jsx` | Kiosk user interface, form inputs, speech recognition loop, emergency triage banner, and action buttons. | Maintain synchronized refs for audio/recording states to prevent stale closure bugs in SpeechRecognition callbacks. |
| `frontend/src/components/Avatar.jsx` | Three.js ReadyPlayerMe character rigging, morph targets, viseme interpolation, procedural blinking. | Do not alter viseme mapping keys without adjusting corresponding Rhubarb target phonemes. Ensure `lerp` factors stay between `0.08` and `0.15` for natural lip movement. |
| `frontend/src/components/bodyMap/BodyMap.jsx` | 2D anatomical coordinate selector with front/back SVG toggle and 1-10 pain slider. | Preserve SVG polygon `data-part` naming conventions so translations in `translations.js` match. |
| `frontend/src/hooks/useChat.jsx` | React context providing `chat()`, active audio message queues, and `isAvatarSpeaking` state. | Any state needed by both UI and 3D Canvas must be exposed through `ChatContext`. |
| `swasya_ai/backend/simple_backend/app/routes/patients.py` | FastAPI route handling `/avatar-summary` and `/check-uhid`. | Preserve priority escalation logic (`pain_severity >= 7` $\to$ `emergency`). |
| `swasya_ai/client/src/components/dashboard/PatientQueue.jsx` | Swasya Doctor Dashboard queue component with Notion-style collapsible completed lists. | Ensure `patient.source === 'sanjeevni_avatar'` badge is retained for incoming avatar consultations. |

---

## H. Step-by-Step User Journeys

### User Journey 1: Returning Rural Patient with ABHA ID
1. Patient approaches Sanjeevni Kiosk and selects **हिन्दी (Hindi)**.
2. In the intake modal, patient enters their ABHA ID: `UHID001` and clicks **🔍 Lookup Profile**.
3. Sanjeevni backend queries Swasya AI `GET /patients/check-uhid/UHID001`.
4. Swasya returns: *Ramesh Kumar, 62, Type 2 Diabetes, Hypertension, Penicillin allergy*.
5. Sanjeevni Avatar appears on screen, bows with a warm smile, and speaks in Hindi:
   *"नमस्ते रमेश जी। मैं संजीवनी एआई हूँ। आपके पुराने रिकॉर्ड्स मेरे सामने हैं। क्या आप शुगर/बीपी की नियमित जाँच के लिए आए हैं या कोई नई तकलीफ़ है?"*
6. Patient taps the microphone and speaks: *"Doctor sahab, do din se kamar mein bohot tej dard hai."*
7. Avatar acknowledges, asks for pain location, and automatically opens the **Interactive Body Map**.
8. Patient touches the **Lower Back** region and slides severity to **7/10**.
9. Emergency notice displays: Avatar expresses clinical concern, checks for radiating leg pain or numbness, and advises seeking emergency evaluation if weakness occurs.
10. Patient completes consultation: Kiosk sends summary to Swasya AI via `POST /patients/avatar-summary`.
11. Swasya enqueues Ramesh Kumar with **Priority: Emergency** under `ready_for_doctor`.
12. Dr. Priya opens Swasya Dashboard, sees `🤖 Avatar Intake` on Token #1, reviews the pre-generated SOAP assessment, and triggers the AI Differential Diagnosis panel.

---

## I. Known Limitations & Technical Debt

1. **Web Speech API Browser Dependency:** The kiosk's automated voice loop relies on `webkitSpeechRecognition`, which is fully supported in Chromium/Chrome but limited in Firefox. (Production kiosk hardware should run Chromium in kiosk mode).
2. **Synchronous Binary Subprocess Spawning:** `backend/index.js` invokes `ffmpeg` and `rhubarb` via Node's `child_process.exec`. Under heavy concurrent load, multiple subprocesses could saturate CPU cores. (Recommended: Worker queue or pre-computed viseme caches).
3. **Murf AI Network Latency:** Round-trip latency for Murf TTS generation + Rhubarb transcription averages ~1.8 seconds. While acceptable for a kiosk, edge-native ONNX TTS (e.g., Piper) would provide sub-second latency.
4. **Local Host Port Configuration:** Sanjeevni defaults to port `5173`/`3125` while Swasya Client defaults to `3000`/`5173`. When running concurrently on the same machine, ensure port separation is verified.

---

## J. AI AGENT OPERATIONAL RULES

Any future AI agent working on this codebase must adhere strictly to the following 12 rules:

1. **Read `PROJECT_KNOWLEDGE_BASE.md` First:** Understand the existing schemas, routing paths, and architectural boundaries before writing code.
2. **Inspect Existing Implementations:** Never guess what a function or component does. Read the implementation in `backend/index.js`, `frontend/src/components/`, or `swasya_ai/` before editing.
3. **Do Not Overwrite Application Features:** Preserve the 3D avatar, body map, Groq vision OCR, AYUSH/Allopathic selector, and Swasya queue integration.
4. **Follow Parameterized SQL Practices:** In `backend/db.js`, always use parameterized queries with SQLite (`db.prepare('... ? ...').run(...)`). Never concatenate raw strings into SQL.
5. **Preserve Fallback Resilience:** When calling external services (Murf, Groq, Swasya), always wrap calls in `try/catch` and provide graceful fallbacks (e.g., setting audio to null, saving to SQLite).
6. **Maintain Morph Target Naming:** Never rename visemes in `Avatar.jsx` unless you update Rhubarb output mappings in `backend/index.js` simultaneously.
7. **Strict JSON LLM Enforcements:** Ensure prompts to Groq demand strict JSON output without markdown code fences to prevent JSON parsing errors.
8. **Never Commit Secrets:** Do not hardcode API keys (Groq, Murf, Gemini, MongoDB) in source files. Always access via `process.env` or `os.environ`.
9. **Coordinate Changes Across Projects:** When modifying `AvatarSummaryPayload` in Swasya, verify the matching payload dispatched in `Sanjeevni-AI-1/backend/index.js` `POST /send-to-doctor`.
10. **Validate Vite Builds After Modifying Frontend:** Run `cd frontend && npm run build` to verify that no JSX or import issues exist.
11. **Run Syntax Checks on Node Files:** Run `node --check backend/index.js` after backend modifications.
12. **Document Architectural Changes:** Whenever an endpoint, state, or schema is altered, update `PROJECT_KNOWLEDGE_BASE.md` immediately.

