import React from "react";

function TextTrack({ mediaFiles, onRemove }) {
  const layers = Array.isArray(mediaFiles)
    ? mediaFiles
    : mediaFiles.layers || [];

  return (
    <div className="timeline-track text-track">
      <div className="timeline-tracks">
        {layers.map((layer, index) => {
          if (layer.type === "text") {
            return (
              <div
                key={index}
                className="timeline-clip clip-text"
                style={{
                  left: `${(layer.start / 180) * 100}%`,
                  width: `${(layer.duration / 180) * 100}%`,
                }}
              >
                <span>{layer.name || layer.text || "Text"}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                >
                  ×
                </button>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

export default TextTrack;
