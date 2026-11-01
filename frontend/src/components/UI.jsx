import { useRef, useState, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { BodyMap } from "./bodyMap/BodyMap";
import { DoctorDashboard } from "./DoctorDashboard";
import { generatePDFReport } from "../utils/reportGenerator";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3125";

export const UI = ({ hidden }) => {
  const input = useRef();
  const { chat, resetSession, loading, message, messages, playCustomMessage, pythonPlaying, isAvatarSpeaking } = useChat();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("");
  const [autoVoiceLoop, setAutoVoiceLoop] = useState(false);

  const [showModal, setShowModal] = useState(true);
  const [showBodyMap, setShowBodyMap] = useState(false);
  const [showDoctorDashboard, setShowDoctorDashboard] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    mobile: "",
    language: "hi-IN",
    system: "allopathic",
    abhaId: "",
  });
  const [sentToDoctor, setSentToDoctor] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [isSendingToDoctor, setIsSendingToDoctor] = useState(false);
  const [pulse, setPulse] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedReportName, setUploadedReportName] = useState("");
  const [highRiskEmergency, setHighRiskEmergency] = useState(false);
  const fileInputRef = useRef(null);

  const [abhaSearch, setAbhaSearch] = useState("");
  const [abhaStatus, setAbhaStatus] = useState(null);
  const [isSearchingAbha, setIsSearchingAbha] = useState(false);

  const handleAbhaLookup = async () => {
    if (!abhaSearch.trim()) return;
    setIsSearchingAbha(true);
    setAbhaStatus(null);
    try {
      const sessId = sessionStorage.getItem("sanjeevni_session_id") || "default-kiosk";
      const res = await fetch(`${backendUrl}/api/patient-lookup?query=${encodeURIComponent(abhaSearch.trim())}`, {
        headers: { "x-session-id": sessId }
      });
      const data = await res.json();
      if (data.found && data.patient) {
        const pt = data.patient;
        setFormData((prev) => ({
          ...prev,
          name: pt.name || "",
          age: pt.age || "",
          mobile: pt.mobile || "",
          language: pt.language || prev.language || "hi-IN",
          id: pt.id,
          abhaId: pt.abhaId || abhaSearch.trim(),
          pastVisits: pt.pastVisits || [],
        }));
        setAbhaStatus({
          success: true,
          message: `✅ Profile Found: ${pt.name} (${(pt.pastVisits || []).length} past visit(s) loaded)`
        });
      } else {
        setAbhaStatus({
          success: false,
          message: "ℹ️ New Patient profile (no existing ABHA record found)."
        });
      }
    } catch (err) {
      console.warn("ABHA lookup failed:", err);
      setAbhaStatus({ success: false, message: "⚠️ Lookup server error." });
    } finally {
      setIsSearchingAbha(false);
    }
  };

  // Animate the pulse icon on modal open
  useEffect(() => {
    if (showModal) {
      const t = setInterval(() => setPulse((p) => !p), 900);
      return () => clearInterval(t);
    }
  }, [showModal]);

  const hasAutoOpenedBodyMap = useRef(false);

  // ── Auto-Voice Loop Logic ────────────────────────────────────────────────
  useEffect(() => {
    if (autoVoiceLoop) {
      if (!isAvatarSpeaking && !isRecordingRef.current && !loading && !pythonPlaying) {
        // Avatar just stopped speaking, restart mic after short delay
        const t = setTimeout(() => {
          if (!isAvatarSpeakingRef.current && autoVoiceLoopRef.current && !isRecordingRef.current) {
            handleRecord(true);
          }
        }, 700);
        return () => clearTimeout(t);
      } else if ((isAvatarSpeaking || loading || pythonPlaying) && isRecordingRef.current) {
        // Stop recording when avatar starts speaking
        handleRecord(false);
      }
    }
  }, [isAvatarSpeaking, autoVoiceLoop, loading, pythonPlaying]);

  // ── Auto-open Body Map when doctor asks about pain/location (ONLY ONCE) ────
  useEffect(() => {
    if (!showModal && message?.text && !hasAutoOpenedBodyMap.current) {
      const txtLower = message.text.toLowerCase();
      const painKeywords = [
        "pain", "where", "dard", "hisse", "hissey", "kahan", "body part", "body",
        "takleef", "taklif", "konse", "kaunse", "which area", "discomfort", "symptom",
        "symptoms", "locate", "dikkat", "pareshani", "samasya", "problem", "bothering",
        "batao", "bataiye", "bataen", "sharir", "area", "map", "help", "swagat"
      ];
      const isPainInquiry = painKeywords.some((kw) => txtLower.includes(kw));

      if (isPainInquiry || (messages.length >= 1 && !hasAutoOpenedBodyMap.current)) {
        hasAutoOpenedBodyMap.current = true; // Auto-open at most once per session
        const timer = setTimeout(() => {
          setShowBodyMap(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [message, showModal, messages]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedReportName(file.name);
    setIsUploading(true);
    setUploadSuccess(false);

    const fd = new FormData();
    fd.append("document", file);

    try {
      const sessId = sessionStorage.getItem("sanjeevni_session_id") || "default-kiosk";
      const response = await fetch(`${backendUrl}/upload-document`, {
        method: "POST",
        headers: { "x-session-id": sessId },
        body: fd,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setUploadSuccess(true);

      // If consultation is already active, notify avatar in chat
      if (!showModal) {
        chat(`I have uploaded my medical document: ${file.name}. Please review the extracted notes.`, {
          ...formData,
          attachedReport: file.name,
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to analyze document. Ensure backend is running.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBodyPartSelect = (partName, severity = 5, severityLabel = "Moderate") => {
    console.log("📍 Selected Body Part:", partName, "Severity:", severity);
    setShowBodyMap(false); // Hide body map, avatar reappears

    const isEmergencyPart = ["chest", "head", "spine"].some((p) => partName.toLowerCase().includes(p));
    if (severity >= 7 || isEmergencyPart) {
      setHighRiskEmergency(true);
    } else {
      setHighRiskEmergency(false);
    }

    chat(`I am experiencing ${severityLabel.toLowerCase()} pain (Severity ${severity}/10) in my ${partName}.`, {
      ...formData,
      selectedBodyPart: partName,
      painSeverity: severity,
      painSeverityLabel: severityLabel,
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const id = formData.id || Math.floor(1000 + Math.random() * 9000);
    const data = { ...formData, id };
    setFormData(data);
    setShowModal(false);
    hasAutoOpenedBodyMap.current = false; // Reset for new session
    // Send initial ping with patient context
    chat("", data);
  };

  const handleSendToDoctor = async () => {
    setIsSendingToDoctor(true);
    const sessId = sessionStorage.getItem("sanjeevni_session_id") || "default-kiosk";
    try {
      const response = await fetch(`${backendUrl}/send-to-doctor`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-session-id": sessId
        },
        body: JSON.stringify({
          name: formData.name,
          age: formData.age,
          mobile: formData.mobile,
          id: formData.id || Math.floor(1000 + Math.random() * 9000),
          system: formData.system,
          sessionId: sessId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send to doctor.");
      }

      const resData = await response.json();
      setSummaryData(resData.summary || "Summary generated and saved successfully.");
      setSentToDoctor(true);
    } catch (err) {
      console.error("Error sending to doctor:", err);
      // Fallback: try generating summary directly
      try {
        const sumRes = await fetch(`${backendUrl}/generate-summary`, { 
          method: "POST",
          headers: { "x-session-id": sessId }
        });
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setSummaryData(sumData.summary);
          setSentToDoctor(true);
          return;
        }
      } catch (_) {}
      alert("Error sending to doctor dashboard. Please check backend connection.");
    } finally {
      setIsSendingToDoctor(false);
    }
  };

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const lastSentTime = useRef(0);
  const isRecognizingRef = useRef(false);
  const networkErrorCountRef = useRef(0);
  const silenceTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Tracks pythonMode from Node backend (prevents React from sending chat)
  const pythonModeRef = useRef(false);

  // Synchronized state refs for callbacks
  const isRecordingRef = useRef(false);
  const autoVoiceLoopRef = useRef(false);
  const isAvatarSpeakingRef = useRef(false);
  const loadingRef = useRef(false);
  const pythonPlayingRef = useRef(false);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { autoVoiceLoopRef.current = autoVoiceLoop; }, [autoVoiceLoop]);
  useEffect(() => { isAvatarSpeakingRef.current = isAvatarSpeaking; }, [isAvatarSpeaking]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { pythonPlayingRef.current = pythonPlaying; }, [pythonPlaying]);

  // ── Universal MediaRecorder + Groq Whisper STT Fallback ──────────────────
  const startMediaRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 500) {
          setIsRecording(false);
          isRecordingRef.current = false;
          return;
        }

        setRecordingStatus("🔄 Transcribing with Groq Whisper AI...");
        try {
          const fd = new FormData();
          fd.append("audio", audioBlob, "speech.webm");
          fd.append("language", formData.language === "mixed" ? "hi" : (formData.language?.slice(0, 2) || "hi"));
          const sessId = sessionStorage.getItem("sanjeevni_session_id") || "default-kiosk";

          const res = await fetch(`${backendUrl}/api/transcribe`, {
            method: "POST",
            headers: { "x-session-id": sessId },
            body: fd,
          });

          if (!res.ok) throw new Error("Whisper transcription failed");
          const data = await res.json();
          if (data && data.text && data.text.trim()) {
            const transcript = data.text.trim();
            if (input.current) input.current.value = transcript;
            console.log("🚀 Transcribed via Groq Whisper:", transcript);
            chat(transcript);
            setRecordingStatus("✓ Sent");
            setTimeout(() => setRecordingStatus(""), 2000);
          } else {
            setRecordingStatus("");
          }
        } catch (err) {
          console.error("Groq Whisper transcription error:", err);
          setRecordingStatus("⚠️ Transcription error. Please try again.");
          setTimeout(() => setRecordingStatus(""), 3000);
        } finally {
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingStatus("🎙 Recording (Whisper AI)...");
    } catch (err) {
      console.error("Microphone capture failed:", err);
      setIsRecording(false);
      isRecordingRef.current = false;
      setRecordingStatus("⚠️ Mic access denied");
      setTimeout(() => setRecordingStatus(""), 3000);
    }
  };

  const stopMediaRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // ── Poll pythonMode flag from Node ────────────────────────────────────────
  useEffect(() => {
    const checkPythonMode = async () => {
      try {
        const res = await fetch(`${backendUrl}/python-mode`);
        const data = await res.json();
        pythonModeRef.current = data.pythonMode === true;
      } catch (_) {}
    };
    const interval = setInterval(checkPythonMode, 800);
    return () => clearInterval(interval);
  }, []);

  // ── Auto-send helper ──────────────────────────────────────────────────────
  const triggerAutoSend = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const text = input.current?.value?.trim();

    if (text && !loadingRef.current && !pythonPlayingRef.current && Date.now() - lastSentTime.current > 1200) {
      console.log("🚀 Auto-sending transcript:", text);
      lastSentTime.current = Date.now();
      chat(text);
      if (input.current) input.current.value = "";
      setRecordingStatus("✓ Sent");

      // Temporarily stop recording while avatar thinks/speaks
      setIsRecording(false);
      isRecordingRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      isRecognizingRef.current = false;

      setTimeout(() => setRecordingStatus(""), 2000);
    }
  };

  // ── Record toggle ─────────────────────────────────────────────────────────
  const handleRecord = (forceState, fromGradio = false) => {
    const nextState = typeof forceState === "boolean" ? forceState : !isRecordingRef.current;
    const hasWebSpeech = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

    // If browser lacks Web Speech API or recognition initialization failed, use MediaRecorder + Groq Whisper
    if (!hasWebSpeech || !recognitionRef.current) {
      if (nextState) {
        startMediaRecording();
      } else {
        stopMediaRecording();
      }
      return;
    }

    // If triggered by Gradio postMessage
    if (fromGradio) {
      setIsRecording(nextState);
      isRecordingRef.current = nextState;
      setRecordingStatus(nextState ? "🎙 Recording via Gradio mic..." : "");
      return;
    }

    // Manual React button click — broadcast to Gradio parent
    window.parent.postMessage(nextState ? "REACT_RCD_START" : "REACT_RCD_STOP", "*");

    if (!nextState) {
      setIsRecording(false);
      isRecordingRef.current = false;
      stopMediaRecording();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      isRecognizingRef.current = false;
      setRecordingStatus("");
    } else {
      if (input.current) input.current.value = "";
      setIsRecording(true);
      isRecordingRef.current = true;
      networkErrorCountRef.current = 0;

      try {
        recognitionRef.current.stop();
      } catch (_) {}

      setTimeout(() => {
        if (!isRecordingRef.current) return;
        try {
          recognitionRef.current.start();
          isRecognizingRef.current = true;
        } catch (e) {
          console.warn("Recognition start fallback to MediaRecorder:", e);
          startMediaRecording();
        }
      }, 100);
    }
  };

  // ── Listen to Gradio iframe postMessages ──────────────────────────────────
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data === "GRADIO_RCD_START") {
        if (!isRecordingRef.current) handleRecord(true, true);
      } else if (e.data === "GRADIO_RCD_STOP") {
        if (isRecordingRef.current) handleRecord(false, true);
      } else if (e.data && e.data.type === "PLAY_AVATAR") {
        playCustomMessage(e.data.text, e.data.audio, e.data.lipsync);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ── Speech Recognition Setup ──────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = formData.language === "mixed" ? "hi-IN" : (formData.language || "hi-IN");
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      networkErrorCountRef.current = 0;
      setRecordingStatus("🎙 Listening...");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) {
        setRecordingStatus("🎙 " + interimTranscript);
      }

      if (finalTranscript && input.current) {
        input.current.value = (input.current.value + " " + finalTranscript).trim();
      }

      // Silence detection auto-send: trigger 1.4s after user stops speaking
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (input.current?.value?.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          triggerAutoSend();
        }, 1400);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);

      if (event.error === "no-speech" || event.error === "aborted") return;

      if (event.error === "network") {
        networkErrorCountRef.current += 1;
        if (networkErrorCountRef.current >= 3) {
          console.warn("Speech network error count reached max. Stopping loop.");
          isRecordingRef.current = false;
          isRecognizingRef.current = false;
          setIsRecording(false);
          setAutoVoiceLoop(false);
          setRecordingStatus("⚠️ Speech network error. Tap 🎙 to retry.");
          setTimeout(() => setRecordingStatus(""), 4000);
          return;
        }
        setRecordingStatus("🔄 Reconnecting mic...");
        return;
      }

      isRecordingRef.current = false;
      isRecognizingRef.current = false;
      setIsRecording(false);
      setAutoVoiceLoop(false);
      setRecordingStatus("⚠ Mic error: " + event.error + ". Tap 🎙 to retry.");
      setTimeout(() => setRecordingStatus(""), 4000);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      const text = input.current?.value?.trim();
      if (text && !loadingRef.current && !pythonPlayingRef.current && Date.now() - lastSentTime.current > 1200) {
        triggerAutoSend();
        return;
      }

      // Restart if still recording, autoVoiceLoop is active, and avatar is silent
      if (isRecordingRef.current && autoVoiceLoopRef.current && !isAvatarSpeakingRef.current && !loadingRef.current && !pythonPlayingRef.current) {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (!isRecordingRef.current || isAvatarSpeakingRef.current) return;
          try {
            recognition.start();
            isRecognizingRef.current = true;
            setRecordingStatus("🎙 Listening...");
          } catch (e) {
            console.warn("Recognition restart info:", e);
            isRecordingRef.current = false;
            setIsRecording(false);
          }
        }, 600);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      try {
        recognition.stop();
      } catch (_) {}
    };
  }, [formData.language]);

  const sendMessage = () => {
    if (pythonModeRef.current) {
      console.log("🔒 Blocked: Python mode active, please wait for avatar to finish.");
      return;
    }
    const text = input.current?.value?.trim();
    if (!loading && !message && text) {
      chat(text);
      if (input.current) input.current.value = "";
    }
  };

  if (hidden) return null;

  // ── Patient Intake Form Modal ──────────────────────────────────────────────
  if (showModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
        style={{
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(16px)",
          padding: "20px",
          overflowY: "auto"
        }}
      >
        <form
          onSubmit={handleFormSubmit}
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.8)",
            borderRadius: 28,
            padding: "36px 32px",
            maxWidth: 520,
            width: "100%",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
            position: "relative",
            margin: "auto"
          }}
        >
          {/* Animated logo */}
          <div className="flex justify-center mb-4">
            <div
              style={{
                width: 72, height: 72, borderRadius: "20px",
                background: "linear-gradient(135deg, #0EA5E9, #6366F1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: pulse ? "0 0 35px rgba(14,165,233,0.4)" : "0 0 12px rgba(14,165,233,0.2)",
                transition: "all 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
                fontSize: 32,
                transform: pulse ? "scale(1.05)" : "scale(1)"
              }}
            >
              🩺
            </div>
          </div>

          <h2 className="text-center text-2xl font-bold mb-1" style={{ color: "#0F172A" }}>
            Sanjeevni <span style={{ color: "#0EA5E9" }}>AI</span>
          </h2>
          <p className="text-center text-xs mb-6 opacity-60" style={{ color: "#475569" }}>
            Comprehensive Clinical Pre-Consultation Intake
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* ABHA ID / Patient Search Row */}
            <div style={{ background: "rgba(14,165,233,0.06)", padding: "12px 14px", borderRadius: 16, border: "1px solid rgba(14,165,233,0.2)" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#0EA5E9", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ABHA ID / Patient Health Search
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={abhaSearch}
                  onChange={e => setAbhaSearch(e.target.value)}
                  placeholder="Try 'ABHA-9876-5432-1098' or Mobile"
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 12,
                    background: "#fff", border: "1px solid rgba(148,163,184,0.3)",
                    color: "#0F172A", outline: "none", fontSize: 12,
                  }}
                />
                <button
                  type="button"
                  onClick={handleAbhaLookup}
                  disabled={isSearchingAbha}
                  style={{
                    padding: "9px 12px", borderRadius: 12,
                    background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
                    color: "#fff", fontWeight: 700, fontSize: 11, border: "none",
                    cursor: "pointer", whiteSpace: "nowrap"
                  }}
                >
                  {isSearchingAbha ? "Searching..." : "🔍 Lookup Profile"}
                </button>
              </div>

              {abhaStatus && (
                <div style={{
                  marginTop: 8, padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: abhaStatus.success ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                  color: abhaStatus.success ? "#15803d" : "#b45309",
                }}>
                  {abhaStatus.message}
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
              <input
                required type="text" value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Ramesh Kumar"
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 14,
                  background: "#fff", border: "1px solid rgba(148,163,184,0.2)",
                  color: "#0F172A", outline: "none", fontSize: 14,
                }}
              />
            </div>

            {/* Age + Mobile row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Age</label>
                <input
                  required type="number" min="1" max="120" value={formData.age}
                  onChange={e => setFormData({...formData, age: e.target.value})}
                  placeholder="45"
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 14,
                    background: "#fff", border: "1px solid rgba(148,163,184,0.2)",
                    color: "#0F172A", outline: "none", fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile Number</label>
                <input
                  required type="tel" value={formData.mobile}
                  onChange={e => setFormData({...formData, mobile: e.target.value})}
                  placeholder="9876543210"
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 14,
                    background: "#fff", border: "1px solid rgba(148,163,184,0.2)",
                    color: "#0F172A", outline: "none", fontSize: 14,
                  }}
                />
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preferred Language</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[
                  { value: "hi-IN", label: "🇮🇳 हिन्दी" },
                  { value: "mixed", label: "🇮🇳 Hinglish" },
                  { value: "en-IN", label: "🇬🇧 English" },
                  { value: "bn-IN", label: "🇮🇳 Bengali" },
                  { value: "kn-IN", label: "🇮🇳 Kannada" },
                ].map(lang => (
                  <button
                    key={lang.value} type="button"
                    onClick={() => setFormData({...formData, language: lang.value})}
                    style={{
                      padding: "9px 6px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                      border: formData.language === lang.value
                        ? "2px solid #0EA5E9"
                        : "1px solid rgba(148,163,184,0.2)",
                      background: formData.language === lang.value
                        ? "rgba(14,165,233,0.08)" : "#fff",
                      color: formData.language === lang.value ? "#0EA5E9" : "#64748B",
                      cursor: "pointer", transition: "all 0.2s ease",
                      textAlign: "center"
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* System Type Selector (Allopathic vs AYUSH) */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clinical Intake System</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { value: "allopathic", label: "🩺 Allopathic (SOCRATES)" },
                  { value: "ayush", label: "🌿 AYUSH (Ayurveda)" },
                ].map(sys => (
                  <button
                    key={sys.value} type="button"
                    onClick={() => setFormData({...formData, system: sys.value})}
                    style={{
                      padding: "10px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                      border: formData.system === sys.value
                        ? "2px solid #10B981"
                        : "1px solid rgba(148,163,184,0.2)",
                      background: formData.system === sys.value
                        ? "rgba(16,185,129,0.08)" : "#fff",
                      color: formData.system === sys.value ? "#10B981" : "#64748B",
                      cursor: "pointer", transition: "all 0.2s ease",
                      textAlign: "center"
                    }}
                  >
                    {sys.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Upload via Groq Vision */}
            <div style={{ padding: "12px", borderRadius: 14, background: "rgba(99,102,241,0.05)", border: "1px dashed rgba(99,102,241,0.3)" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 700, color: "#6366F1", marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Prior Records (Optional)</span>
                {uploadSuccess && <span style={{ color: "#10B981" }}>✅ AI Extracted</span>}
              </label>
              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>Upload prescription or lab report. Groq Vision AI extracts clinical context.</p>
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                disabled={isUploading || uploadSuccess}
                style={{ fontSize: 11, width: "100%" }}
              />
              {isUploading && <p style={{ fontSize: 11, color: "#6366F1", marginTop: 6, fontWeight: 600 }}>Reading document via Groq Vision AI...</p>}
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: "100%", marginTop: 24, padding: "16px", borderRadius: 16,
              background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
              color: "#fff", fontWeight: 800, fontSize: 15, border: "none",
              cursor: "pointer", letterSpacing: "0.05em", textTransform: 'uppercase',
              boxShadow: "0 10px 28px rgba(14,165,233,0.3)",
              transition: "all 0.3s",
            }}
          >
            Start Intake Session →
          </button>
        </form>
      </div>
    );
  }

  // ── Consultation Completed Modal ───────────────────────────────────────────
  if (sentToDoctor) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(20px)", padding: 20 }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, rgba(15,15,30,0.98) 0%, rgba(20,25,50,0.98) 100%)",
            border: "1px solid rgba(34,197,94,0.35)",
            borderRadius: 24, padding: "36px 32px", maxWidth: 640, width: "100%",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 40px rgba(34,197,94,0.1)",
            maxHeight: "90vh", overflowY: "auto"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2))",
              border: "2px solid rgba(34,197,94,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
            }}>✅</div>
            <div>
              <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>
                Consultation Complete
              </h2>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0 }}>
                Intake notes recorded & forwarded to Swasya Medical Officer Dashboard
              </p>
            </div>
          </div>

          {summaryData && (
            <div style={{
              background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px",
              color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap",
              fontFamily: "monospace", marginBottom: 20, maxHeight: 240, overflowY: "auto",
              border: "1px solid rgba(255,255,255,0.1)"
            }}>
              {summaryData}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => generatePDFReport(formData, messages)}
              style={{
                width: "100%", padding: "14px", borderRadius: 14,
                background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
                color: "#fff", fontWeight: 700, fontSize: 13, border: "none",
                cursor: "pointer", letterSpacing: "0.03em", textTransform: 'uppercase',
                boxShadow: "0 8px 24px rgba(14,165,233,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <span>📄</span> Download Medical PDF Summary
            </button>

            <button
              onClick={async () => {
                await resetSession();
                setSentToDoctor(false);
                setShowModal(true);
                setSummaryData(null);
                setFormData({ name: "", age: "", mobile: "", language: "hi-IN", system: "allopathic", abhaId: "" });
              }}
              style={{
                width: "100%", padding: "12px", borderRadius: 14,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Start New Patient Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top Floating Buttons: Doctor Portal & Body Map */}
      <div className="fixed top-6 right-6 z-40 pointer-events-auto flex items-center gap-3">
        <button
          onClick={() => setShowDoctorDashboard(true)}
          className="px-4 py-2.5 rounded-2xl bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 text-sky-400 font-bold text-xs uppercase tracking-wider border border-sky-500/30 shadow-xl flex items-center gap-2 transition-all hover:scale-105"
        >
          <span>👨‍⚕️</span> Doctor Portal (Queue)
        </button>
      </div>

      <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-end">
        <div className="w-full max-w-3xl mx-auto mb-6 px-4 pointer-events-auto">

          {/* Emergency Triage Banner */}
          {highRiskEmergency && (
            <div className="mb-3 flex justify-center">
              <div className="bg-red-600/95 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400/50 animate-pulse max-w-xl text-left">
                <span className="text-2xl">🚨</span>
                <div>
                  <strong className="block text-xs uppercase tracking-wider font-extrabold text-red-200">
                    High Risk Emergency Triage Notice
                  </strong>
                  <p className="text-xs font-medium text-white/90 leading-tight">
                    Severe pain detected. If experiencing crushing chest pain, shortness of breath, or sudden weakness, seek emergency medical care immediately or call 108.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Python speaking badge */}
          {pythonPlaying && (
            <div className="mb-2 flex justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium shadow bg-blue-100 text-blue-700 border border-blue-300">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping inline-block" />
                🩺 Doctor is speaking...
              </span>
            </div>
          )}

          {/* Recording / status badge */}
          {!pythonPlaying && (isRecording || recordingStatus) && (
            <div className="mb-2 flex justify-center">
              <span
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium shadow
                  ${isRecording
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "bg-green-100 text-green-700 border border-green-300"
                  }`}
              >
                {isRecording && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                )}
                {recordingStatus || (isRecording ? "🎙 Listening..." : "")}
              </span>
            </div>
          )}

          {/* Capsule Chat Bar */}
          <div
            className={`flex items-center gap-3 bg-white/80 backdrop-blur-3xl border border-white/40 shadow-[0_32px_80px_rgba(15,23,42,0.15)] rounded-full p-2.5 transition-all duration-500
              ${pythonPlaying ? "opacity-40 pointer-events-none translate-y-4" : "opacity-100 translate-y-0"}`}
          >
            {/* 🎙 Auto-Voice Record Capsule */}
            <button
              onClick={() => {
                if (autoVoiceLoop || isRecording) {
                  setAutoVoiceLoop(false);
                  handleRecord(false);
                } else {
                  setAutoVoiceLoop(true);
                  if (!isAvatarSpeaking) handleRecord(true);
                }
              }}
              disabled={pythonPlaying}
              title={autoVoiceLoop ? "Stop Voice Chat" : "Start Hands-Free Voice Chat"}
              className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-500
                ${autoVoiceLoop || isRecording
                  ? "bg-rose-500 scale-90 ring-4 ring-rose-500/20 animate-pulse"
                  : "bg-[#0EA5E9] hover:rotate-12"
                }`}
            >
              {autoVoiceLoop || isRecording ? <span className="w-4 h-4 bg-white rounded-sm animate-pulse" /> : "🎙"}
            </button>

            {/* Hidden File Input for Medical Reports */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pythonPlaying}
              title="Upload Prescription / Medical Report Image"
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all pointer-events-auto shadow-inner"
            >
              📷
            </button>

            {/* Text Input */}
            <input
              ref={input}
              placeholder={pythonPlaying ? "Doctor is speaking..." : "How can I help you today?"}
              disabled={pythonPlaying}
              className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 font-medium px-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />

            {/* Action Group */}
            <div className="flex items-center gap-2 pr-1">
              <button
                type="button"
                onClick={() => setShowBodyMap(true)}
                disabled={pythonPlaying}
                title="Open Body Map to select pain area"
                className="px-4 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 shadow-lg shadow-rose-500/20 pointer-events-auto"
              >
                <span>🧍</span>
                <span className="hidden sm:inline">Body Map</span>
              </button>

              <button
                onClick={sendMessage}
                disabled={loading || pythonPlaying}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all duration-300
                  ${loading || pythonPlaying
                    ? "bg-slate-200"
                    : "bg-[#6366F1] hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
                  }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "↑"
                )}
              </button>

              <button
                onClick={handleSendToDoctor}
                disabled={isSendingToDoctor || pythonPlaying}
                title="Finish consultation and send to doctor"
                className={`px-5 h-12 rounded-full text-white font-bold text-xs uppercase tracking-widest transition-all duration-500 pointer-events-auto
                  ${isSendingToDoctor
                    ? "bg-slate-400 animate-pulse"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                  }`}
              >
                {isSendingToDoctor ? "Sending..." : "Done"}
              </button>
            </div>
          </div>

          {/* Hint */}
          <p className="text-center text-xs text-gray-400 mt-2 select-none">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 text-xs">Enter</kbd> to send ·
            🎙 Record · 🧍 Click Body Map to point to pain area
          </p>

        </div>
      </div>

      {/* Interactive Body Map Modal */}
      {showBodyMap && (
        <BodyMap
          language={formData.language}
          onSelectBodyPart={handleBodyPartSelect}
          onClose={() => setShowBodyMap(false)}
        />
      )}

      {/* Real-Time Doctor Dashboard Modal */}
      {showDoctorDashboard && (
        <DoctorDashboard onClose={() => setShowDoctorDashboard(false)} />
      )}
    </>
  );
};
