import { createContext, useContext, useEffect, useRef, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://sanjeevni-ai-1.onrender.com" : "http://localhost:3125");

const getOrCreateSessionId = () => {
  let sid = sessionStorage.getItem("sanjeevni_session_id");
  if (!sid) {
    sid = "kiosk_" + Math.random().toString(36).slice(2) + "_" + Date.now();
    sessionStorage.setItem("sanjeevni_session_id", sid);
  }
  return sid;
};

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages]           = useState([]);
  const [message, setMessage]             = useState(null);
  const [loading, setLoading]             = useState(false);
  const [cameraZoomed, setCameraZoomed]   = useState(false);
  const [pythonPlaying, setPythonPlaying] = useState(false);

  const pythonPlayingRef = useRef(false);
  const isSendingRef     = useRef(false);
  const lastPayloadTsRef = useRef(0);

  const resetSession = async () => {
    try {
      const oldSid = getOrCreateSessionId();
      await fetch(`${backendUrl}/api/session/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": oldSid }
      });
    } catch (_) {}
    const newSid = "kiosk_" + Math.random().toString(36).slice(2) + "_" + Date.now();
    sessionStorage.setItem("sanjeevni_session_id", newSid);
    setMessages([]);
    setMessage(null);
    return newSid;
  };

  // ── Fallback Clinical Intake Generator (ensures Avatar never stays silent) ─
  const generateFallbackClinicalResponse = (messageText, patientData) => {
    const textLower = (messageText || "").toLowerCase();
    const name = patientData?.name && patientData.name !== "Unknown" ? patientData.name : "";
    const bodyPart = patientData?.selectedBodyPart || "";
    const severity = patientData?.painSeverity;

    let text = "";
    let animation = "Talking_1";
    let facialExpression = "smile";

    if (!messageText && patientData) {
      text = name 
        ? `Namaste ${name}! I am Dr. Sanjeevni, your AI medical consultation assistant. I have loaded your patient profile. What symptoms or health concerns are you experiencing today?`
        : `Namaste! I am Dr. Sanjeevni, your AI virtual physician. I am here to assist you. What symptoms or health concerns are you experiencing today?`;
      animation = "Talking_1";
      facialExpression = "smile";
    } else if (bodyPart || textLower.includes("pain") || textLower.includes("arm") || textLower.includes("head") || textLower.includes("chest") || textLower.includes("stomach") || textLower.includes("leg")) {
      const targetPart = bodyPart || (textLower.includes("arm") ? "arm" : textLower.includes("head") ? "head" : textLower.includes("chest") ? "chest" : "that region");
      text = `I have recorded your discomfort in your ${targetPart}${severity ? ` (rated ${severity}/10)` : ""}. Could you tell me whether this pain began suddenly or gradually, and if it radiates to any other part of your body?`;
      animation = "Talking_2";
      facialExpression = "concerned";
    } else if (textLower.includes("hello") || textLower.includes("hi") || textLower.includes("namaste") || textLower.includes("hey")) {
      text = `Namaste! I am Dr. Sanjeevni. How can I assist you with your health today? Please describe any pain, discomfort, or medical issues you have.`;
      animation = "Talking_1";
      facialExpression = "smile";
    } else if (textLower.includes("fever") || textLower.includes("cough") || textLower.includes("cold")) {
      text = `I understand. When did your fever or cough first begin, and have you noticed any shivering, body aches, or shortness of breath?`;
      animation = "Talking_1";
      facialExpression = "concerned";
    } else {
      text = `Thank you for explaining that. To help evaluate your condition, could you share how long you have had this issue and if any specific movement or medicine provides relief?`;
      animation = "Talking_0";
      facialExpression = "thinking";
    }

    return [
      {
        id: "clinical_reply_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        text,
        facialExpression,
        animation,
        audio: null,
        lipsync: { mouthCues: [] },
      },
    ];
  };

  // ── chat() — resilient dispatch with dual-endpoint & clinical fallback ───
  const chat = async (messageText, patientData = null) => {
    if (!messageText?.trim() && !patientData) return [];
    if (isSendingRef.current) return [];
    if (pythonPlayingRef.current) {
      console.log("🔇 chat() blocked — Python is speaking");
      return [];
    }

    isSendingRef.current = true;
    setLoading(true);

    try {
      const sid = getOrCreateSessionId();
      const payload = JSON.stringify({ message: messageText, patientData, sessionId: sid });
      const headers = {
        "Content-Type": "application/json",
        "x-session-id": sid,
      };

      let response = null;
      let data = null;

      // 1. Try configured backend
      try {
        response = await fetch(`${backendUrl}/chat`, {
          method: "POST",
          headers,
          body: payload,
        });
        if (response.ok) {
          data = await response.json();
        } else {
          console.warn(`Primary backend returned status ${response.status}`);
        }
      } catch (primaryErr) {
        console.warn("Primary backend network error:", primaryErr.message);
      }

      // 2. If primary failed and was not localhost, attempt local fallback
      if (!data && backendUrl !== "http://localhost:3125") {
        try {
          const localResp = await fetch("http://localhost:3125/chat", {
            method: "POST",
            headers,
            body: payload,
          });
          if (localResp.ok) {
            data = await localResp.json();
            console.log("✅ Recovered response via local fallback backend");
          }
        } catch (_) {}
      }

      // 3. Process backend response if successful
      if (data) {
        const resp = Array.isArray(data?.messages) ? data.messages : [];
        if (resp.length > 0) {
          setMessages((prev) => [...prev, ...resp]);
          return resp;
        }
      }

      // 4. Fallback: generate clinical doctor intake response so avatar is never silent
      console.log("🩺 Utilizing Dr. Sanjeevni clinical assistant fallback");
      const fallbackResp = generateFallbackClinicalResponse(messageText, patientData);
      setMessages((prev) => [...prev, ...fallbackResp]);
      return fallbackResp;

    } catch (error) {
      console.error("Chat request failed:", error);
      const fallbackResp = generateFallbackClinicalResponse(messageText, patientData);
      setMessages((prev) => [...prev, ...fallbackResp]);
      return fallbackResp;
    } finally {
      setLoading(false);
      isSendingRef.current = false;
    }
  };

  // ── Normal React message queue ────────────────────────────────────────────
  const onMessagePlayed = () => {
    setMessages((prev) => prev.slice(1));
  };

  const playCustomMessage = (text, audioBase64, lipsync) => {
    setMessages((prev) => [
      ...prev,
      { text, audio: audioBase64, lipsync, facialExpression: "smile", animation: "Talking_1" },
    ]);
  };

  // ── Python avatar: set message directly, bypass queue ────────────────────
  const playPythonMessage = (payload) => {
    console.log("🎭 playPythonMessage — cues:", payload.lipsync?.mouthCues?.length);

    setPythonPlaying(true);
    pythonPlayingRef.current = true;

    // Wipe any queued React messages so Python takes over cleanly
    setMessages([]);

    setMessage({
      text:             payload.text             || "",
      audio:            payload.audio,
      lipsync:          payload.lipsync          || { mouthCues: [] },
      facialExpression: payload.facialExpression || "smile",
      animation:        payload.animation        || "Talking_1",
      _pythonSource:    true,
    });
  };

  // ── Poll /get-avatar-payload every 1s ────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`${backendUrl}/get-avatar-payload`);
        const data = await res.json();

        if (data?.payload) {
          const p = data.payload;
          if (p.timestamp && p.timestamp <= lastPayloadTsRef.current) return;
          lastPayloadTsRef.current = p.timestamp || Date.now();
          playPythonMessage(p);
        }
      } catch (_) {}
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ── Normal queue → message (skip if Python is playing) ───────────────────
  useEffect(() => {
    if (pythonPlayingRef.current) return;
    setMessage(messages.length > 0 ? messages[0] : null);
  }, [messages]);

  // ── onMessagePlayed — aware of Python vs React source ────────────────────
  const onMessagePlayedWrapped = () => {
    if (message?._pythonSource) {
      console.log("✅ Python message finished — unmuting React");
      setPythonPlaying(false);
      pythonPlayingRef.current = false;
      setMessage(null);
      // Also clear any messages that queued up while Python was playing
      setMessages([]);
      // Tell Node to unmute too
      fetch(`${backendUrl}/python-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      }).catch(() => {});
    } else {
      onMessagePlayed();
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chat,
        resetSession,
        message,
        messages,
        onMessagePlayed: onMessagePlayedWrapped,
        playCustomMessage,
        loading,
        isAvatarSpeaking: !!message || loading || pythonPlaying,
        cameraZoomed,
        setCameraZoomed,
        pythonPlaying,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};

