import React from "react";

function VideoTrack({
  mediaFiles,
  onRemove,
  selectedLayerIndex,
  onSelectLayer,
  onChangeImage,
}) {
  const layers = Array.isArray(mediaFiles)
    ? mediaFiles
    : mediaFiles.layers || [];

  return (
    <div className="timeline-track video-track">
      <div className="timeline-tracks">
        {layers.map((layer, index) => {
          if (
            layer.type === "video" ||
            layer.type === "image" ||
            layer.type === "effect"
          ) {
            return (
              <div
                key={index}
                className={`timeline-clip clip-${layer.type} ${
                  selectedLayerIndex === index ? "selected" : ""
                }`}
                style={{
                  left: `${(layer.start / 180) * 100}%`,
                  width: `${(layer.duration / 180) * 100}%`,
                }}
                onClick={() => onSelectLayer(index)}
              >
                <span>{layer.name || layer.type}</span>
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

export default VideoTrack;
