import React from "react";
import Clip from "./Clip";

function ClipTrack({
  clips,
  onClipDoubleClick,
  onClipRemove,
  onClipResize,
  onClipMove,
  selectedClipId,
}) {
  console.log("ClipTrack 렌더링, clips:", clips);

  return (
    <div className="timeline-track clip-track">
      <div className="timeline-tracks">
        {clips.length === 0 && (
          <div style={{ color: "#999", padding: "10px", textAlign: "center" }}>
            템플릿 클립이 없습니다
          </div>
        )}
        {clips.map((clip) => (
          <Clip
            key={clip.id}
            clip={clip}
            onDoubleClick={onClipDoubleClick}
            onRemove={onClipRemove}
            onResize={onClipResize}
            onMove={onClipMove}
            isSelected={selectedClipId === clip.id}
          />
        ))}
      </div>
    </div>
  );
}

export default ClipTrack;
