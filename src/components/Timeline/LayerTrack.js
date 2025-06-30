import React from "react";

function LayerTrack({ layers, onRemove, selectedLayerIndex, onSelectLayer }) {
  return (
    <div className="layer-track">
      <div className="track-label">Layers</div>
      <div className="track-content">
        {layers.map((layer, index) => (
          <div
            key={index}
            className={`track-item ${
              selectedLayerIndex === index ? "selected" : ""
            }`}
            onClick={() => onSelectLayer(index)}
          >
            <span>{layer.name || layer.type || `Layer ${index + 1}`}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LayerTrack;
