import React from "react";

function AudioTrack({ mediaFiles, onRemove }) {
  const layers = Array.isArray(mediaFiles)
    ? mediaFiles
    : mediaFiles.layers || [];

  return (
    <div className="timeline-track audio-track">
      <div className="timeline-tracks">
        {layers.map((layer, index) => {
          if (layer.type === "audio") {
            return (
              <div
                key={index}
                className="timeline-clip clip-audio"
                style={{
                  left: `${(layer.start / 180) * 100}%`,
                  width: `${(layer.duration / 180) * 100}%`,
                }}
              >
                <span>{layer.name || "Audio"}</span>
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

export default AudioTrack;
