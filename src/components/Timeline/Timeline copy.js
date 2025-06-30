import React from "react";
import VideoTrack from "./VideoTrack";
import AudioTrack from "./AudioTrack";
import TextTrack from "./TextTrack";
import ClipTrack from "./ClipTrack";
import "./Timeline.css";

function Timeline({
  mediaFiles,
  clips,
  onRemove,
  onClipDoubleClick,
  onClipRemove,
  onClipResize,
  onClipMove,
  selectedClipId,
}) {
  return (
    <div className="timeline">
      <div className="timeline-header">
        <span>Template Clips</span>
        <span>Video Track</span>
        <span>Audio Track</span>
        <span>Text Track</span>
      </div>
      <ClipTrack
        clips={clips}
        onClipDoubleClick={onClipDoubleClick}
        onClipRemove={onClipRemove}
        onClipResize={onClipResize}
        onClipMove={onClipMove}
        selectedClipId={selectedClipId}
      />
      <VideoTrack mediaFiles={mediaFiles.video} onRemove={onRemove} />
      <AudioTrack mediaFiles={mediaFiles.audio} onRemove={onRemove} />
      <TextTrack mediaFiles={mediaFiles.text} onRemove={onRemove} />
    </div>
  );
}

export default Timeline;
