import { useCallback, useMemo, useState } from "react";
import { getBodyParts } from "./bodyParts";
import style from "./BodyMap.module.css";
import { txt } from "./translations";

const BodyContainer = ({ children }) => (
  <div className={style.bodyContainer}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 375.42 832.97">
      <g>{children}</g>
    </svg>
  </div>
);

const BodyPart = ({ part, fill, onClick, onMouseEnter, onMouseLeave }) => {
  const handleClick = (e) => {
    e.stopPropagation();
    onClick(part);
  };

  const handleMouseEnter = () => {
    onMouseEnter(part.id);
  };

  const handleMouseLeave = () => {
    onMouseLeave(part.id);
  };

  return (
    <path
      id={part.id}
      d={part.d}
      fill={fill}
      className={style.bodyPart}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <title>{part.name}</title>
    </path>
  );
};

export const BodyMap = ({ language = "en", onSelectBodyPart, onClose }) => {
  // Extract base language key (e.g. "hi-IN" -> "hi", "en-IN" -> "en")
  const baseLang = (language || "en").split("-")[0].toLowerCase();
  const langKey = txt[baseLang] ? baseLang : "en";

  const [selectedPartId, setSelectedPartId] = useState(null);
  const [hoveredPartId, setHoveredPartId] = useState(null);
  const [severity, setSeverity] = useState(5);

  const data = useMemo(() => getBodyParts(langKey), [langKey]);

  const selectedPart = useMemo(() => {
    if (selectedPartId === null) return null;
    return data.find((part) => part.id === selectedPartId) || null;
  }, [data, selectedPartId]);

  const parts = useMemo(() => {
    const antParts = data.filter((part) => part.face === "ant");
    const postParts = data.filter((part) => part.face === "post");
    return [
      { name: txt[langKey][1], parts: antParts },
      { name: txt[langKey][2], parts: postParts },
    ];
  }, [data, langKey]);

  const handleClick = (part) => {
    setSelectedPartId(part.id);
  };

  const handleMouseEnter = (id) => {
    if ("ontouchstart" in window) return;
    setHoveredPartId(id);
  };

  const handleMouseLeave = () => {
    if ("ontouchstart" in window) return;
    setHoveredPartId(null);
  };

  // Severity color mapping (Mild: Yellow, Moderate: Orange, Severe: Red)
  const getSeverityColor = (sev) => {
    if (sev <= 3) return "rgb(234, 179, 8)";
    if (sev <= 6) return "rgb(249, 115, 22)";
    return "rgb(239, 68, 68)";
  };

  const getSeverityLabel = (sev) => {
    if (sev <= 3) return "Mild";
    if (sev <= 6) return "Moderate";
    return "Severe";
  };

  const getPartColor = useCallback(
    (id) => {
      if (selectedPartId === id) return getSeverityColor(severity);
      if (hoveredPartId === id) return "rgb(56, 189, 248)";
      return "rgb(100, 116, 139)";
    },
    [selectedPartId, hoveredPartId, severity]
  );

  const handleConfirm = () => {
    if (!selectedPart) return;
    if (onSelectBodyPart) {
      const label = getSeverityLabel(severity);
      onSelectBodyPart(selectedPart.name, severity, label);
    }
  };

  return (
    <div className={style.overlayModal}>
      <div className={style.modalContent}>
        {onClose && (
          <button className={style.closeButton} onClick={onClose} title="Close Body Map">
            ✕
          </button>
        )}

        <div className={style.header}>
          <h2 className={style.title}>📍 Select Pain Location & Severity</h2>
          <p className={style.subtitle}>
            Tap on a body part and set your pain severity from 1 (Mild) to 10 (Severe).
          </p>
          <div
            className={style.selectedBadge}
            style={{
              borderColor: selectedPart ? getSeverityColor(severity) : undefined,
              color: selectedPart ? getSeverityColor(severity) : undefined,
            }}
          >
            {selectedPart ? `${selectedPart.name} (${severity}/10 ${getSeverityLabel(severity)})` : txt[langKey][0]}
          </div>
        </div>

        <div className={style.bodies}>
          {parts.map((side) => (
            <div key={side.name}>
              <p className={style.sideLabel}>{side.name}</p>
              <BodyContainer>
                {side.parts.map((part) => (
                  <BodyPart
                    key={part.id}
                    part={part}
                    fill={getPartColor(part.id)}
                    onClick={handleClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  />
                ))}
              </BodyContainer>
            </div>
          ))}
        </div>

        {/* Severity Slider Panel (Shows when body part is selected) */}
        {selectedPart && (
          <div className={style.severityPanel}>
            <div className={style.severityHeader}>
              <span>Pain Intensity (VAS 1-10)</span>
              <span style={{ color: getSeverityColor(severity), fontWeight: 700 }}>
                {severity} / 10 · {getSeverityLabel(severity)}
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className={style.slider}
              style={{ accentColor: getSeverityColor(severity) }}
            />

            <button className={style.confirmBtn} onClick={handleConfirm}>
              Confirm {selectedPart.name} ({severity}/10) & Tell Doctor →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
