import { exec } from "child_process";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import { createReadStream, promises as fs } from "fs";
import Groq from "groq-sdk";
import multer from "multer";
import db from "./db.js";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "gsk_placeholder_add_your_groq_api_key_in_env",
});

const murfApiKey = process.env.MURF_API_KEY;

// 🔹 Murf Voice Configuration — optimized for Indian PHC context
const MURF_VOICE_ID = process.env.MURF_VOICE_ID || "hi-IN-shweta"; // Default to high-quality Hindi voice
const MURF_LOCALE = process.env.MURF_LOCALE || "hi-IN";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

// Allow any origin in dev; lock it to your Vercel URL in production via CORS_ORIGIN env var
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
}));

const port = process.env.PORT || 3125;

// Groq model — standard high-performance production models
const GROQ_MODEL = process.env.GROQ_MODEL && process.env.GROQ_MODEL !== "groq/compound-mini" 
  ? process.env.GROQ_MODEL 
  : "llama-3.3-70b-versatile";

// Swasya AI integration endpoint (defaults to deployed Render in production or localhost in dev)
const SWASYA_API_URL = process.env.SWASYA_API_URL || (process.env.NODE_ENV === "production" ? "https://swasya-ai.onrender.com" : "http://localhost:8000");

// ── Session Management (Fixes Multi-Patient & Multi-Kiosk Race Conditions) ──
const sessions = new Map();

const getSession = (sessionId) => {
  const sid = (sessionId || "default-kiosk").trim();
  if (!sessions.has(sid)) {
    sessions.set(sid, {
      id: sid,
      chatHistory: [],
      currentPatient: null,
      createdAt: Date.now(),
      lastActive: Date.now()
    });
  }
  const s = sessions.get(sid);
  s.lastActive = Date.now();
  return s;
};

// Periodic session cleanup (> 3 hours idle)
setInterval(() => {
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  for (const [sid, session] of sessions.entries()) {
    if (session.lastActive < cutoff) {
      sessions.delete(sid);
    }
  }
}, 30 * 60 * 1000);

// Session middleware: bind req.session for all incoming requests
app.use((req, res, next) => {
  const sid = req.headers["x-session-id"] || req.query.sessionId || req.body?.sessionId || "default-kiosk";
  req.session = getSession(sid);
  res.setHeader("x-session-id", req.session.id);
  next();
});

// ── Global state variables (preserved for backward compatibility & queue) ──
let patientQueue = []; // Doctor Dashboard Live Queue
let latestTranscript = "";
let pythonMode       = false;   // true = Python is in charge, React must stay silent
let latestAvatarPayload = null; // stores the payload Python sends

// Paths — set RHUBARB_PATH / FFMPEG_PATH in .env for local Windows dev.
// On Railway/Render (Linux) leave them blank to use system-installed binaries.
let RHUBARB_PATH = process.env.RHUBARB_PATH || (process.platform === "win32" ? "C:\\Rhubarb\\Rhubarb-Lip-Sync-1.14.0-Windows\\rhubarb.exe" : "rhubarb");
const FFMPEG_PATH = process.env.FFMPEG_PATH || (process.platform === "win32" ? "C:\\ffmpeg\\ffmpeg-8.1-essentials_build\\bin\\ffmpeg.exe" : "ffmpeg");

app.get("/", (req, res) => {
  res.send(`Sanjeevni AI backend running | Model: ${GROQ_MODEL} | Active Sessions: ${sessions.size}`);
});

// Reset a session for a new patient
app.post("/api/session/reset", (req, res) => {
  const sid = req.session.id;
  sessions.delete(sid);
  const freshSession = getSession(sid);
  res.json({ success: true, message: `Session ${sid} reset cleanly.` });
});

// Universal Speech-to-Text via Groq Whisper Large v3
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    await ensureAudiosFolder();
    const tempAudioPath = `audios/whisper_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;
    await fs.writeFile(tempAudioPath, req.file.buffer);

    const fileStream = createReadStream(tempAudioPath);

    const lang = req.body.language === "hi-IN" ? "hi" : undefined;
    const transcription = await groq.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-large-v3",
      language: lang,
      response_format: "json",
      temperature: 0.0,
    });

    await fs.unlink(tempAudioPath).catch(() => {});

    res.json({ success: true, transcript: transcription.text || "" });
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({ error: "Failed to transcribe audio", details: err.message });
  }
});

// Doctor Dashboard Queue API
app.get("/api/patients", async (req, res) => {
  let combinedPatients = [...patientQueue];

  // Attempt to enrich with active Swasya AI queue if reachable
  const swasyaBaseUrl = SWASYA_API_URL;
  try {
    const queueRes = await fetch(`${swasyaBaseUrl}/queue`, { signal: AbortSignal.timeout(1200) });
    if (queueRes.ok) {
      const qData = await queueRes.json();
      const swasyaQueue = qData.queue || qData.waiting_patients || [];
      swasyaQueue.forEach(sq => {
        const id = sq.patient_id || sq.uhid || sq.id;
        if (!combinedPatients.some(cp => String(cp.id) === String(id))) {
          combinedPatients.push({
            id: id,
            name: sq.patient_name || sq.name || "PHC Patient",
            age: sq.age || "N/A",
            mobile: sq.phone || sq.mobile || "",
            status: sq.status || "ready_for_doctor",
            priority: sq.priority || "normal",
            source: sq.source || "Swasya AI Queue",
            selectedBodyPart: "PHC General Queue",
            painSeverity: sq.priority === "emergency" ? 8 : 4
          });
        }
      });
    }
  } catch (_) {}

  res.json({ patients: combinedPatients });
});

// ABHA ID / Patient Health Profile Lookup API
app.get("/api/patient-lookup", async (req, res) => {
  const query = (req.query.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Missing lookup query parameter" });
  }

  const queryLower = query.toLowerCase();

  const matchLocal = patientQueue.find(
    (p) =>
      (p.abhaId && p.abhaId.toLowerCase().includes(queryLower)) ||
      (p.mobile && p.mobile.includes(query)) ||
      (p.id && String(p.id) === query)
  );

  if (matchLocal) {
    return res.json({ found: true, patient: matchLocal, source: "Live Session Queue" });
  }

  // 1. Look up in Swasya AI PHC database first for comprehensive hospital records
  const swasyaBaseUrl = SWASYA_API_URL;
  try {
    const swasyaRes = await fetch(`${swasyaBaseUrl}/patients/check-uhid/${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(2000)
    });
    if (swasyaRes.ok) {
      const swasyaData = await swasyaRes.json();
      if (swasyaData.exists && swasyaData.patient) {
        const pt = swasyaData.patient;
        let pastVisits = [];
        try {
          const sumRes = await fetch(`${swasyaBaseUrl}/patients/summary/${pt.patient_id || pt.uhid}`, {
            signal: AbortSignal.timeout(1500)
          });
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            if (sumData.latest_note?.soap_note) {
              const sn = sumData.latest_note.soap_note;
              pastVisits.push({
                date: sumData.latest_note.created_at ? sumData.latest_note.created_at.split("T")[0] : "Recent",
                selectedBodyPart: sn.chief_complaint || "Previous PHC Consultation",
                painSeverity: 5,
                summary: sn.assessment || sn.subjective || "Consultation completed."
              });
            }
          }
        } catch (_) {}

        const patient = {
          id: pt.patient_id || pt.uhid,
          abhaId: pt.uhid || query,
          name: pt.name || "Patient",
          age: String(pt.age || ""),
          mobile: pt.phone || "",
          language: "hi-IN",
          source: "Swasya AI PHC Records",
          chronicConditions: pt.chronic_conditions || [],
          allergies: pt.allergies || [],
          pastVisits: pastVisits
        };

        // Cache into local SQLite
        try {
          const insertStmt = db.prepare('INSERT OR REPLACE INTO patients (id, abhaId, name, age, mobile, language) VALUES (?, ?, ?, ?, ?, ?)');
          insertStmt.run(String(patient.id), patient.abhaId, patient.name, patient.age, patient.mobile, patient.language);
        } catch (_) {}

        return res.json({ found: true, patient, source: "Swasya AI PHC Records" });
      }
    }
  } catch (err) {
    console.log("ℹ️ Swasya AI lookup unavailable (offline or not running):", err.message);
  }

  // 2. Look up in local SQLite DB
  try {
    const patientRow = db.prepare('SELECT * FROM patients WHERE abhaId LIKE ? OR mobile LIKE ? OR id = ?').get(`%${query}%`, `%${query}%`, query);
    
    if (patientRow) {
      // Fetch past visits
      const pastVisits = db.prepare('SELECT date, selectedBodyPart, painSeverity, summary FROM visits WHERE patientId = ? ORDER BY createdAt DESC').all(patientRow.id);
      
      const patient = {
        ...patientRow,
        pastVisits: pastVisits
      };
      return res.json({ found: true, patient, source: "Local Clinic Database" });
    }
  } catch (err) {
    console.error("DB Lookup error:", err);
  }

  return res.json({ found: false, message: "No existing ABHA patient profile found." });
});

// Diagnostic: list all models available on your Groq API key
app.get("/list-models", async (req, res) => {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
    });
    const data = await response.json();
    res.json({ currentModel: GROQ_MODEL, available: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Optional: list Murf voices
app.get("/voices", async (req, res) => {
  try {
    if (!murfApiKey) {
      return res.status(400).send({ error: "MURF_API_KEY is missing" });
    }

    const response = await fetch("https://api.murf.ai/v1/speech/voices", {
      method: "GET",
      headers: {
        "api-key": murfApiKey,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Murf voices error: ${response.status} - ${errText}`);
    }

    const voices = await response.json();
    return res.send(voices);
  } catch (error) {
    console.error("Voices fetch error:", error);
    return res.status(500).send({
      error: "Failed to fetch Murf voices",
      details: error.message,
    });
  }
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Exec Error:", error);
        console.error("stderr:", stderr);
        reject(error);
        return;
      }

      if (stderr) {
        console.warn("Command stderr:", stderr);
      }

      resolve(stdout);
    });
  });
};

const ensureAudiosFolder = async () => {
  try {
    await fs.mkdir("audios", { recursive: true });
  } catch (error) {
    console.error("Error creating audios folder:", error);
  }
};

const readJsonTranscript = async (file) => {
  try {
    const data = await fs.readFile(file, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return { mouthCues: [] };
  }
};

const audioFileToBase64 = async (file) => {
  try {
    const data = await fs.readFile(file);
    return data.toString("base64");
  } catch (err) {
    return null;
  }
};

// Download file from URL if Murf returns audioFile instead of encodedAudio
const downloadFile = async (url, outputFilePath) => {
  const response = await fetch(url);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Audio download failed: ${response.status} - ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(outputFilePath, buffer);
};

// Murf TTS
const generateMurfAudio = async (text, outputFilePath, voiceId = MURF_VOICE_ID, locale = MURF_LOCALE) => {
  if (!murfApiKey) {
    throw new Error("MURF_API_KEY is missing");
  }

  const response = await fetch("https://api.murf.ai/v1/speech/generate", {
    method: "POST",
    headers: {
      "api-key": murfApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voiceId: voiceId,
      locale: locale,
      format: "MP3",
      sampleRate: 44100,
      channelType: "MONO",
      encodeAsBase64: true,
      modelVersion: "GEN2",
      rate: 0,
      pitch: 0,
      variation: 1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Murf TTS failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();

  // Preferred: write encoded audio directly
  if (data?.encodedAudio) {
    const buffer = Buffer.from(data.encodedAudio, "base64");
    await fs.writeFile(outputFilePath, buffer);
    return;
  }

  // Fallback: download from audioFile URL
  if (data?.audioFile) {
    await downloadFile(data.audioFile, outputFilePath);
    return;
  }

  throw new Error("Murf response did not contain encodedAudio or audioFile");
};

// Unique-scoped phoneme extraction
const lipSyncMessage = async (filePrefix) => {
  const time = Date.now();
  console.log(`Starting conversion for ${filePrefix}`);

  const mp3Path = `audios/${filePrefix}.mp3`;
  const wavPath = `audios/${filePrefix}.wav`;
  const jsonPath = `audios/${filePrefix}.json`;

  await execCommand(`"${FFMPEG_PATH}" -y -i "${mp3Path}" "${wavPath}"`);
  console.log(`MP3 to WAV done in ${Date.now() - time}ms`);

  await execCommand(
    `"${RHUBARB_PATH}" -f json -o "${jsonPath}" "${wavPath}" -r phonetic`
  );
  console.log(`Lip sync done in ${Date.now() - time}ms`);
};

app.post("/chat", async (req, res) => {
  try {
    if (pythonMode) {
      console.log("🔒 /chat blocked — pythonMode active");
      return res.status(423).json({ error: "python mode active" });
    }

    await ensureAudiosFolder();

    const session = req.session;
    const userMessage = req.body.message;
    
    // 🔹 Initialize patient context in session
    if (req.body.patientData) {
      session.currentPatient = { ...(session.currentPatient || {}), ...req.body.patientData };
      if (!session.currentPatient.id) {
        session.currentPatient.id = Math.floor(1000 + Math.random() * 9000);
      }
      // Add or update in patient queue for Doctor Dashboard
      const existingIdx = patientQueue.findIndex(p => String(p.id) === String(session.currentPatient.id));
      if (existingIdx >= 0) {
        patientQueue[existingIdx] = { ...patientQueue[existingIdx], ...session.currentPatient };
      } else {
        patientQueue.unshift({ ...session.currentPatient });
      }

      // Save new patient to DB
      try {
        const existing = db.prepare('SELECT id FROM patients WHERE id = ?').get(String(session.currentPatient.id));
        if (!existing) {
          const insertStmt = db.prepare('INSERT INTO patients (id, abhaId, name, age, mobile, language) VALUES (?, ?, ?, ?, ?, ?)');
          insertStmt.run(
            String(session.currentPatient.id),
            session.currentPatient.abhaId || "",
            session.currentPatient.name || "Unknown",
            String(session.currentPatient.age || ""),
            session.currentPatient.mobile || "",
            session.currentPatient.language || "en-IN"
          );
        }
      } catch (dbErr) {
        console.error("Failed to save patient to DB:", dbErr);
      }
    }

    const currentPatient = session.currentPatient;

    // 🔹 Default intro if no message and no new patient
    if (!userMessage && !req.body.patientData) {
      return res.send({
        messages: [
          {
            id: `intro_0_${Date.now()}`,
            text: "Namaste! I am Dr. Sanjeevni, your virtual healthcare assistant. How are you feeling today?",
            audio: await audioFileToBase64("audios/api_lipsync.mp3"),
            lipsync: await readJsonTranscript("audios/api_lipsync.json"),
            facialExpression: "smile",
            animation: "Talking_1",
          },
          {
            id: `intro_1_${Date.now() + 1}`,
            text: "You can describe your symptoms or tap any area on the 3D body map. I am here to help you.",
            audio: null,
            lipsync: { mouthCues: [] },
            facialExpression: "smile",
            animation: "Talking_2",
          },
        ],
      });
    }

    const hasValidGroqKey = process.env.GROQ_API_KEY && 
      !process.env.GROQ_API_KEY.includes("your_groq_api_key") && 
      !process.env.GROQ_API_KEY.includes("placeholder");

    // 🔹 Add user message to session memory
    if (userMessage) {
      session.chatHistory.push({
        role: "user",
        content: userMessage,
      });
    } else if (req.body.patientData) {
      // Synthetic first message — triggers a personalised welcome from the AI
      session.chatHistory.push({
        role: "user",
        content: "Please greet me warmly by my name and ask what body part or health problem is bothering me today.",
      });
    }

    // 🔹 Limit session memory (last 30 messages)
    if (session.chatHistory.length > 30) {
      session.chatHistory = session.chatHistory.slice(-30);
    }

    const clinicalSystem = currentPatient?.system === 'ayush' ? 'AYUSH (Ayurveda)' : 'Allopathic';

    let messages = null;
    let parsed = null;

    if (hasValidGroqKey) {
      try {
        let completion = null;
        try {
          completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            temperature: 0.35,
            max_tokens: 600,
            messages: [
              {
                role: "system",
                content: `You are Sanjeevni AI, a friendly, compassionate, and experienced virtual Primary Health Centre (PHC) doctor for Indian patients.

Your job is to conduct a safe, natural, human-like medical intake conversation. You are NOT a replacement for an in-person doctor and must never claim to provide a definitive diagnosis or prescription.

${currentPatient ? `
CURRENT PATIENT:
Name: ${currentPatient.name}
Age: ${currentPatient.age}
Patient ID: ${currentPatient.id}
${currentPatient.abhaId ? `ABHA Health ID: ${currentPatient.abhaId}` : ""}
System: ${clinicalSystem}
Preferred Language: ${
  currentPatient.language === "hi-IN"
    ? "Hindi (Devanagari script ONLY)"
    : currentPatient.language === "mixed"
    ? "Hinglish (natural Hindi-English mix)"
    : currentPatient.language === "bn-IN"
    ? "Bengali"
    : currentPatient.language === "kn-IN"
    ? "Kannada"
    : "Simple Indian English"
}
${currentPatient.pastVisits && currentPatient.pastVisits.length > 0 ? `
PREVIOUS MEDICAL HISTORY & PAST VISITS (${currentPatient.pastVisits.length} past visit(s)):
${currentPatient.pastVisits.map(v => `- [${v.date}] Pain Area: ${v.selectedBodyPart || 'General'} (Severity ${v.painSeverity || 5}/10): ${v.summary || 'Consultation completed.'}`).join("\n")}

CLINICAL INSTRUCTION FOR RETURNING PATIENTS:
Warmly acknowledge that you have access to their past medical records. Ask if current symptoms are related to past issues or if a new problem has arisen.
` : ""}
${currentPatient.selectedBodyPart ? `
SELECTED BODY REGION: ${currentPatient.selectedBodyPart}
PAIN SEVERITY RATING: ${currentPatient.painSeverity || 5}/10 (${currentPatient.painSeverityLabel || "Moderate"})
CLINICAL INSTRUCTION FOR SEVERITY:
- If severity is 8-10 or pain is in Chest/Head/Spine, express deep clinical care, ask if there is shortness of breath, radiating pain, or dizziness, and set "urgent": true if red flags appear.
` : ""}

CLINICAL INTAKE APPROACH (${clinicalSystem}):
${currentPatient.system === 'ayush' 
  ? `- Use the Dashavidha Pariksha framework implicitly.
- Probe Prakriti (constitution), Vikriti (imbalance), Agni (digestion), Koshtha (bowels), and Ahara-Vihara (diet/lifestyle).
- Ask ONE focused question per turn.` 
  : `- Use the SOCRATES framework for pain/symptoms (Site, Onset, Character, Radiation, Associated symptoms, Time course, Exacerbating/relieving factors, Severity).
- Ask ONE focused follow-up question per turn.`}

LANGUAGE REQUIREMENT:
Respond ONLY in the patient's selected language above. Never switch languages unless changed by the user.
` : ""}

CORE CLINICAL INTAKE RULES:
- Ask ONE focused clarifying question per response (Duration, Severity, Pattern, Associated symptoms, Triggers, Context).
- Do NOT ask multiple questions in a single response.
- Do NOT jump to premature diagnoses, medicines, dosages, or home remedies.
- Be warm, respectful, reassuring, and conversational.
- Keep responses concise: maximum 1–2 short messages per turn (2-3 sentences each).

EMERGENCY / RED-FLAG RULE:
If the patient describes crushing chest pain, severe breathlessness, stroke symptoms (facial drop, weakness), loss of consciousness, uncontrolled bleeding, or very high fever (>104°F):
- Set "urgent": true in the output JSON.
- Immediately instruct them to seek emergency medical care or visit the nearest hospital emergency room.

STRICT OUTPUT FORMAT — Return ONLY valid JSON, no markdown codeblocks, no extra text:
{
  "urgent": boolean,
  "messages": [
    {
      "text": "string",
      "facialExpression": "smile | sad | angry | surprised | funnyFace | default | thinking | concerned | nodding",
      "animation": "Talking_0 | Talking_1 | Talking_2 | Crying | Laughing | Rumba | Idle | Terrified | Angry"
    }
  ]
}

EMOTION & ANIMATION GUIDE:
- Greeting / warm response → smile + Talking_1
- Clarifying question → thinking + Talking_0
- Listening / acknowledging → nodding + Talking_2
- Reassurance / encouragement → smile + Talking_2
- Concern about symptoms → concerned + Talking_1
- Urgent / serious symptom → sad + Talking_1`,
              },
              ...session.chatHistory,
            ],
          });
        } catch (modelErr) {
          console.warn(`Groq primary model ${GROQ_MODEL} error: ${modelErr.message}. Trying fallback model...`);
          completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            temperature: 0.35,
            max_tokens: 600,
            messages: [
              { role: "system", content: "You are Dr. Sanjeevni, a virtual PHC doctor. Conduct safe medical intake. Return JSON: { urgent: false, messages: [{ text: string, facialExpression: string, animation: string }] }" },
              ...session.chatHistory,
            ],
          });
        }

        const raw = completion.choices[0]?.message?.content || "";
        console.log("🧠 Groq raw:", raw);

        const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
        messages = parsed.messages || parsed;
      } catch (aiErr) {
        console.error("Groq completions failed, falling back to clinical rules:", aiErr.message);
      }
    }

    // 🔹 Fallback Rule-Based Intake when Groq is unavailable or key not configured
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      const pName = currentPatient?.name && currentPatient.name !== "Unknown" ? currentPatient.name : "";
      const bodyPart = currentPatient?.selectedBodyPart;
      const severity = currentPatient?.painSeverity;
      const uMsgLower = (userMessage || "").toLowerCase();

      let replyText = "";
      let emotion = "smile";
      let anim = "Talking_1";

      if (!userMessage && req.body.patientData) {
        replyText = pName 
          ? `Namaste ${pName}! I am Dr. Sanjeevni. What symptoms or medical problems are bothering you today?`
          : `Namaste! I am Dr. Sanjeevni, your virtual doctor. How can I assist you with your health today?`;
      } else if (bodyPart || uMsgLower.includes("pain") || uMsgLower.includes("arm") || uMsgLower.includes("chest") || uMsgLower.includes("head") || uMsgLower.includes("stomach")) {
        const area = bodyPart || "that region";
        replyText = `I see you have discomfort in your ${area}${severity ? ` with an intensity rating of ${severity}/10` : ""}. Could you tell me how long you have experienced this, and if the pain is continuous or sharp?`;
        emotion = "concerned";
        anim = "Talking_2";
      } else if (uMsgLower.includes("fever") || uMsgLower.includes("cough")) {
        replyText = `I have noted your fever and cough. Have you checked your temperature, and are you having any chills, body aches, or breathing difficulty?`;
        emotion = "concerned";
        anim = "Talking_1";
      } else {
        replyText = `Thank you for explaining that. To understand your condition better, could you tell me when these symptoms first began?`;
        emotion = "thinking";
        anim = "Talking_0";
      }

      messages = [
        {
          text: replyText,
          facialExpression: emotion,
          animation: anim,
        },
      ];
    }

    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    // 🔹 Save assistant reply in session memory
    session.chatHistory.push({
      role: "assistant",
      content: messages.map((m) => m.text).join(" "),
    });

    // 🔊 TTS + Lipsync processing with UNIQUE Session-scoped file paths
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const safeSessionId = session.id.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filePrefix = `${safeSessionId}_${Date.now()}_${i}`;
      const fileName = `audios/${filePrefix}.mp3`;
      const wavName = `audios/${filePrefix}.wav`;
      const jsonName = `audios/${filePrefix}.json`;
      const textInput = message.text || "Hello";

      console.log(`🔊 Generating audio ${i} for session ${session.id}:`, textInput);

      let voiceId = MURF_VOICE_ID || "Natalie";
      let locale = MURF_LOCALE || "en-US";
      
      if (currentPatient?.language === "hi-IN") {
        voiceId = "hi-IN-shweta";
        locale = "hi-IN";
      } else if (currentPatient?.language === "en-IN") {
        voiceId = "Natalie";
        locale = "en-US";
      }

      const hasValidMurfKey = murfApiKey && 
        !murfApiKey.includes("your_murf_api_key") && 
        !murfApiKey.includes("placeholder");

      if (hasValidMurfKey) {
        try {
          await generateMurfAudio(textInput, fileName, voiceId, locale);
          await lipSyncMessage(filePrefix);

          message.audio = await audioFileToBase64(fileName);
          message.lipsync = await readJsonTranscript(jsonName);

          // Clean up temporary audio files asynchronously to prevent disk bloat
          Promise.all([
            fs.unlink(fileName).catch(() => {}),
            fs.unlink(wavName).catch(() => {}),
            fs.unlink(jsonName).catch(() => {})
          ]);
        } catch (ttsError) {
          console.error("⚠️ TTS/Lipsync failed:", ttsError.message);
          message.audio = null;
          message.lipsync = { mouthCues: [] };
        }
      } else {
        message.audio = null;
        message.lipsync = { mouthCues: [] };
      }
    }

    // Support "urgent" flag
    if (parsed && parsed.urgent) {
      console.log("🚨 URGENT FLAG DETECTED");
      messages.unshift({
        text: "🚨 URGENT: Red flag symptoms detected. Please proceed to triage immediately.",
        facialExpression: "sad",
        animation: "Talking_1",
      });
    }

    messages.forEach((m, idx) => {
      m.id = m.id || `msg_${session.id}_${Date.now()}_${idx}`;
    });

    return res.send({ messages });

  } catch (error) {
    console.error("🔥 Chat route error:", error);
    return res.status(200).send({
      messages: [
        {
          id: `fallback_${Date.now()}`,
          text: "Namaste! I am Dr. Sanjeevni, your virtual doctor. How can I assist you with your health today?",
          facialExpression: "smile",
          animation: "Talking_1",
          audio: null,
          lipsync: { mouthCues: [] },
        }
      ]
    });
  }
});

app.post("/generate-summary", async (req, res) => {
  try {
    const session = req.session;
    const currentPatient = session.currentPatient;

    if (!currentPatient) {
      return res.status(400).json({ error: "No patient session active." });
    }
    
    const prompt = `You are a clinical summarization AI.
Generate a structured physician-ready clinical summary from the following conversation.
Use professional medical terminology in English, regardless of the conversation language.

Patient Name: ${currentPatient.name}, Age: ${currentPatient.age}
System: ${currentPatient.system === 'ayush' ? 'AYUSH (Ayurveda)' : 'Allopathic'}

FORMAT:
${currentPatient.system === 'ayush' 
  ? `Chief Complaint:
History of Present Illness:
Dashavidha Pariksha Observations (Prakriti, Vikriti, Agni, Koshtha etc. if discussed):
Ahara-Vihara (Diet & Lifestyle):` 
  : `Chief Complaint:
History of Present Illness (SOCRATES):
Past Medical/Surgical History:
Review of Systems:`}

Conversation:
${session.chatHistory.map(m => m.role.toUpperCase() + ": " + m.content).join("\n")}

Return ONLY the markdown formatted summary.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    });

    const summaryText = completion.choices[0]?.message?.content || "No summary could be generated.";

    // Save visit to SQLite DB
    try {
      const insertVisit = db.prepare('INSERT INTO visits (patientId, date, selectedBodyPart, painSeverity, summary) VALUES (?, ?, ?, ?, ?)');
      insertVisit.run(
        String(currentPatient.id || '1001'), 
        new Date().toISOString().split('T')[0], 
        currentPatient?.selectedBodyPart || 'General', 
        currentPatient?.painSeverity || 5, 
        summaryText
      );
      console.log(`✅ Saved visit to database for patient ${currentPatient.id}`);
    } catch (dbErr) {
      console.error("⚠️ Failed to save visit to DB:", dbErr.message);
    }

    res.json({ success: true, summary: summaryText });
  } catch (err) {
    console.error("🔥 /generate-summary error:", err);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

app.post("/upload-document", upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    console.log("📸 Processing uploaded document via Groq Vision...");
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    
    const completion = await groq.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "You are a clinical AI. Carefully read this medical document. Identify if it is a prescription, lab report, or discharge summary. Extract key clinical information: Date, Diagnoses, Medications (with dosage/frequency), and abnormal Lab Values. Present the findings clearly and concisely."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ]
    });
    
    const extractedData = completion.choices[0]?.message?.content || "No text could be extracted.";
    
    // Inject the extracted data into session conversation history
    req.session.chatHistory.push({
      role: "system",
      content: `[SYSTEM ALERT: The patient has uploaded a prior medical document before the consultation. Here is the AI-extracted summary of that document:\n\n${extractedData}\n\nAcknowledge this in your first response and use it to guide your history taking.]`
    });
    
    res.json({ success: true, extractedData });
  } catch (error) {
    console.error("🔥 /upload-document error:", error);
    res.status(500).json({ error: "Failed to process document", details: error.message });
  }
});

app.post("/send-to-doctor", async (req, res) => {
  try {
    const session = req.session;
    const currentPatient = session.currentPatient;
    const { name, age, mobile, id } = req.body;
    
    // 1. Fetch history from Swasya AI
    const swasyaBaseUrl = SWASYA_API_URL;
    let historyContext = "No previous medical history found in Swasya records.";
    try {
      console.log(`🔍 Fetching history for patient ${id} from Swasya at ${swasyaBaseUrl}...`);
      const swasyaSummaryRes = await fetch(`${swasyaBaseUrl}/patients/summary/${id}`, {
        signal: AbortSignal.timeout(2000)
      });
      if (swasyaSummaryRes.ok) {
        const sData = await swasyaSummaryRes.json();
        if (sData.success) {
          const chiefComplaints = (sData.chief_complaints || []).map(c => `- ${c.date}: ${c.complaint}`).join("\n");
          const recentMeds = (sData.recent_medications || []).map(m => `- ${m}`).join("\n");
          
          historyContext = `
RECENT HISTORY:
${chiefComplaints || "None"}

RECENT MEDICATIONS:
${recentMeds || "None"}

LATEST ASSESSMENT:
${sData.latest_visit?.soap_note?.assessment || "None"}
`;
        }
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch patient history context:", err.message);
    }

    // 2. Generate summary from session chatHistory with context
    const prompt = `You are an AI generating a medical consultation summary. 
Patient info: Name: ${name}, Age: ${age}, Mobile: ${mobile}

PAST MEDICAL HISTORY (from records):
${historyContext}

Current Consultation History:
${session.chatHistory.map(m => m.role.toUpperCase() + ": " + m.content).join("\n")}

Provide a concise, professional medical summary of the patient's current symptoms and conditions discussed. 
Incorporate past history ONLY if it's relevant to the current symptoms (e.g., if a symptom is worsening since the last visit).
Do not include pleasantries.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }]
    });

    const summaryText = completion.choices[0]?.message?.content || "No summary could be generated.";

    // 2. Save text file of the summary locally
    await ensureAudiosFolder();
    const filename = `audios/summary_${id || 'unknown'}_${Date.now()}.txt`;
    await fs.writeFile(filename, `Name: ${name}\nAge: ${age}\nMobile: ${mobile}\nUUID: ${id}\n\nSummary:\n${summaryText}`);
    console.log(`✅ Summary text file generated: ${filename}`);

    // 3. Send payload to Swasya AI doctor dashboard (non-blocking if Swasya is offline)
    let swasyaSynced = false;
    try {
      console.log(`📤 Sending payload to Swasya AI backend at ${swasyaBaseUrl}...`);
      const swasyaPayload = {
        uhid: String(currentPatient?.abhaId || id),
        name: name || currentPatient?.name || "Unknown Avatar Patient",
        age: String(age || currentPatient?.age || ""),
        phone: String(mobile || currentPatient?.mobile || ""),
        summary: summaryText,
        selected_body_part: currentPatient?.selectedBodyPart || "General Consultation",
        pain_severity: Number(currentPatient?.painSeverity) || 5,
        system: currentPatient?.system || "allopathic",
        attached_report: currentPatient?.attachedReport || null
      };

      const swasyaRes = await fetch(`${swasyaBaseUrl}/patients/avatar-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(swasyaPayload),
        signal: AbortSignal.timeout(3000)
      });

      if (swasyaRes.ok) {
        swasyaSynced = true;
        console.log("✅ Successfully sent avatar summary & added to Swasya Doctor Queue!");
      } else {
        const errText = await swasyaRes.text();
        console.warn("Swasya AI Warning:", errText);
      }
    } catch (swasyaErr) {
      console.warn("⚠️ Swasya AI endpoint unreachable (local offline mode):", swasyaErr.message);
    }

    // 4. Save visit to SQLite DB
    try {
      const insertVisit = db.prepare('INSERT INTO visits (patientId, date, selectedBodyPart, painSeverity, summary) VALUES (?, ?, ?, ?, ?)');
      insertVisit.run(
        String(id), 
        new Date().toISOString().split('T')[0], 
        currentPatient?.selectedBodyPart || 'General', 
        currentPatient?.painSeverity || 5, 
        summaryText
      );
      console.log(`✅ Saved visit to database for patient ${id}`);
    } catch (dbErr) {
      console.error("⚠️ Failed to save visit to DB:", dbErr.message);
    }

    res.json({
      success: true,
      summary: summaryText,
      swasyaSynced,
      message: swasyaSynced 
        ? "Summary generated and routed directly into Swasya Doctor Queue!"
        : "Summary generated and saved locally.",
      file: filename
    });

  } catch (error) {
    console.error("🔥 /send-to-doctor error:", error);
    res.status(500).json({ error: "Failed to send to doctor", details: error.message });
  }
});

app.post("/lip-sync", async (req, res) => {
  try {
    await ensureAudiosFolder();
    const { audioBase64 } = req.body;
    if (!audioBase64) return res.status(400).send("No audioBase64 provided");

    console.log(`💋 Lip-sync audio size: ${audioBase64.length} chars`);

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const uniquePrefix = `api_lipsync_${Date.now()}`;
    const mp3Path  = `audios/${uniquePrefix}.mp3`;
    const wavPath  = `audios/${uniquePrefix}.wav`;
    const jsonPath = `audios/${uniquePrefix}.json`;

    await fs.writeFile(mp3Path, audioBuffer);
    console.log("💋 Audio written, starting FFmpeg...");

    await execCommand(`"${FFMPEG_PATH}" -y -i "${mp3Path}" "${wavPath}"`);
    console.log("💋 WAV ready, starting Rhubarb...");

    await execCommand(
      `"${RHUBARB_PATH}" -f json -o "${jsonPath}" "${wavPath}" -r phonetic`
    );
    console.log("💋 Rhubarb done");

    const lipsync = await readJsonTranscript(jsonPath);
    console.log(`💋 Mouth cues: ${lipsync.mouthCues?.length}`);

    // Clean up
    Promise.all([
      fs.unlink(mp3Path).catch(() => {}),
      fs.unlink(wavPath).catch(() => {}),
      fs.unlink(jsonPath).catch(() => {})
    ]);

    res.send({ lipsync });
  } catch (err) {
    console.error("Lip-sync error:", err);
    res.status(500).send({ error: err.message });
  }
});

app.post("/set-transcript", (req, res) => {
  latestTranscript = req.body.transcript || "";
  console.log("📥 Transcript received:", latestTranscript);
  res.send({ ok: true });
});

app.get("/get-transcript", (req, res) => {
  res.send({ transcript: latestTranscript });
  latestTranscript = ""; // clear after reading
});

// pythonMode and latestAvatarPayload are declared at the top of the file

// ── Python calls this BEFORE Get Diagnosis starts processing ────────────────
app.post("/python-mode", (req, res) => {
  pythonMode = req.body.active === true;
  console.log("🐍 pythonMode:", pythonMode);
  res.json({ ok: true, pythonMode });
});

// ── React polls this to know whether to stay silent ────────────────────────
app.get("/python-mode", (req, res) => {
  res.json({ pythonMode });
});

// ── Python pushes full avatar payload here ─────────────────────────────────
app.post("/play-avatar", (req, res) => {
  const { text, audio, lipsync } = req.body;
  if (!audio) return res.status(400).json({ error: "audio required" });

  latestAvatarPayload = {
    text,
    audio,
    lipsync:          lipsync || { mouthCues: [] },
    facialExpression: "smile",
    animation:        "Talking_1",
    timestamp:        Date.now(),
  };
  console.log("✅ /play-avatar stored:", text?.slice(0, 60));
  res.json({ ok: true });
});

// ── React polls this to pick up the payload ────────────────────────────────
app.get("/get-avatar-payload", (req, res) => {
  if (!latestAvatarPayload) return res.json({ payload: null });
  const p         = latestAvatarPayload;
  latestAvatarPayload = null;   // one-shot — clear after reading
  res.json({ payload: p });
});

// ── Start server (always last, after all routes are registered) ─────────────
const startServer = async () => {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Sanjeevni AI listening on port ${port}`);
    console.log(`Rhubarb path: ${RHUBARB_PATH}`);
    console.log(`FFmpeg path: ${FFMPEG_PATH}`);
    console.log(`Murf voice: ${MURF_VOICE_ID}`);
    console.log(`Murf locale: ${MURF_LOCALE}`);
  });

  if (process.platform === "linux") {
    try {
      await execCommand(`"${RHUBARB_PATH}" --version`);
    } catch (e) {
      console.log("Rhubarb not found globally. Setting up locally in /tmp...");
      try {
        await execCommand("wget -q https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip -O /tmp/rhubarb.zip");
        await execCommand("unzip -o /tmp/rhubarb.zip -d /tmp/");
        await execCommand("chmod +x /tmp/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb");
        RHUBARB_PATH = "/tmp/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb";
        console.log("Rhubarb downloaded and set up at " + RHUBARB_PATH);
      } catch (dlErr) {
        console.error("Failed to setup Rhubarb:", dlErr.message);
      }
    }
  }
};

startServer();
