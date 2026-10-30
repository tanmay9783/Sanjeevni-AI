import { useState, useEffect } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3125";

export const DoctorDashboard = ({ onClose }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/patients`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.warn("Error fetching doctor dashboard queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    const interval = setInterval(fetchPatients, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col text-slate-100 font-sans pointer-events-auto overflow-hidden">
      {/* Header */}
      <header className="px-8 py-5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-sky-500/20">
            👨‍⚕️
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Swasya Medical Officer Dashboard
            </h1>
            <p className="text-xs text-slate-400">
              Primary Health Centre (PHC) Live Intake Queue & AI Symptom Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
            title="Launch Full Swasya PHC Hospital Portal"
          >
            <span>🏥</span> Open Swasya Portal
          </a>

          <button
            onClick={fetchPatients}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all border border-slate-700 flex items-center gap-2"
          >
            <span>🔄</span> Refresh Queue
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-xs font-bold text-white transition-all shadow-md shadow-sky-500/20"
          >
            ← Return to Avatar View
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Patient Queue List */}
        <div className="w-1/3 border-r border-slate-800 p-6 overflow-y-auto space-y-4 bg-slate-900/40">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Intake Queue ({patients.length})
            </h2>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Loading active patient queue...
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-900/50 rounded-2xl border border-slate-800">
              <span className="text-3xl block mb-2">📋</span>
              <p className="text-sm font-semibold text-slate-300">No Patients in Queue</p>
              <p className="text-xs text-slate-500 mt-1">
                Completed pre-consultation intakes will appear here automatically.
              </p>
            </div>
          ) : (
            patients.map((pt, idx) => {
              const isHighRisk =
                (pt.painSeverity && pt.painSeverity >= 7) ||
                (pt.selectedBodyPart && ["chest", "head", "spine"].some((b) => pt.selectedBodyPart.toLowerCase().includes(b)));

              return (
                <div
                  key={pt.id || idx}
                  onClick={() => setSelectedPatient(pt)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedPatient?.id === pt.id
                      ? "bg-sky-950/60 border-sky-500 shadow-lg shadow-sky-500/10"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-base">{pt.name || "Anonymous Patient"}</h3>
                      <p className="text-xs text-slate-400">
                        Age: {pt.age || "N/A"} · ID: #{pt.id || "REG"}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isHighRisk
                          ? "bg-red-500/20 text-red-400 border border-red-500/40"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      }`}
                    >
                      {isHighRisk ? "🚨 High Emergency" : "🟢 Standard"}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <span>📍 Pain: <strong className="text-sky-400">{pt.selectedBodyPart || "General"}</strong></span>
                    <span>
                      Score: <strong className={isHighRisk ? "text-red-400" : "text-amber-400"}>{pt.painSeverity || 5}/10</strong>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Detailed Patient Analysis */}
        <div className="flex-1 p-8 overflow-y-auto bg-slate-950">
          {selectedPatient ? (
            <div className="max-w-2xl space-y-6">
              {/* Profile Card */}
              <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                      {selectedPatient.name}
                      {selectedPatient.abhaId && (
                        <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-mono font-bold">
                          🪪 {selectedPatient.abhaId}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Mobile: {selectedPatient.mobile} · Age: {selectedPatient.age} · Language: {selectedPatient.language || "Hindi/English"}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-500 block">Patient ID</span>
                    <span className="text-lg font-mono font-bold text-sky-400">#{selectedPatient.id}</span>
                  </div>
                </div>

                {/* Past Visits Summary Section */}
                {selectedPatient.pastVisits && selectedPatient.pastVisits.length > 0 && (
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                      📜 Cumulative History ({selectedPatient.pastVisits.length} Previous Visit(s))
                    </h4>
                    <div className="space-y-2">
                      {selectedPatient.pastVisits.map((visit, i) => (
                        <div key={i} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-200">
                            <span>📅 Visit {i + 1} ({visit.date || "Past"})</span>
                            <span className="text-amber-400">📍 {visit.selectedBodyPart || "General"} ({visit.painSeverity || 5}/10)</span>
                          </div>
                          <p className="text-slate-400 text-[11px] leading-relaxed">{visit.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-400 block font-semibold">Reported Body Region</span>
                    <strong className="text-base text-sky-400 font-bold mt-1 block">
                      📍 {selectedPatient.selectedBodyPart || "General Consultation"}
                    </strong>
                  </div>

                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-400 block font-semibold">Pain Intensity Rating</span>
                    <strong className="text-base text-amber-400 font-bold mt-1 block">
                      ⚡ {selectedPatient.painSeverity ? `${selectedPatient.painSeverity}/10 (${selectedPatient.painSeverityLabel})` : "Moderate"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Patient Attached Reports */}
              {selectedPatient.attachedReport && (
                <div className="p-5 bg-sky-950/30 border border-sky-800/40 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📷</span>
                    <div>
                      <h4 className="text-xs font-bold text-sky-300">Attached Prescription / Medical Report</h4>
                      <p className="text-xs text-slate-400">{selectedPatient.attachedReport}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Clinical Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => alert(`Initiating direct call to ${selectedPatient.mobile || "Patient"}...`)}
                  className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20"
                >
                  📞 Call Patient Directly
                </button>
                <button
                  onClick={() => alert(`Prescription link dispatched to ${selectedPatient.mobile || "Patient"}`)}
                  className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20"
                >
                  📝 Send E-Prescription
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
              <span className="text-5xl mb-4 opacity-50">🩺</span>
              <p className="text-base font-semibold text-slate-300">Select a Patient from the Queue</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Click any patient on the left to inspect their symptom heatmap, severity score, and intake summary.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
