import React, { useState, useRef } from "react";
import ClipTrack from "./ClipTrack";
import Clip from "./Clip";
import "../../styles/timeline.css";
import { getLayerDuration } from "../../utils/layerUtils";

function Timeline({
  mediaFiles,
  clips,
  audioTracks = [],
  onRemove,
  onClipDoubleClick,
  onClipRemove,
  onClipResize,
  onClipMove,
  onSelectClip,
  selectedClipId,
  onAudioTrackRemove,
  onAudioTrackResize,
  onAudioTrackMove,
  onSelectAudioTrack,
  selectedAudioTrackId,
  selectedLayerIndex,
  onSelectLayer,
  playhead,
  onPlayheadChange,
  onChangeImage,
  isClipEditMode,
}) {
  const LAYER_TIMELINE_DURATION = 180; // 레이어 트랙: 3분(초)
  const CLIP_TIMELINE_DURATION = 600; // 클립 트랙: 10분(초)

  // 레이어 트랙용 시간 눈금 생성 (0, 10, 20, ..., 180)
  const layerTickStep = 10;
  const layerTicks = Array.from(
    { length: LAYER_TIMELINE_DURATION / layerTickStep + 1 },
    (_, i) => i * layerTickStep
  );

  // 클립 트랙용 시간 눈금 생성 (0, 30, 60, ..., 600)
  const clipTickStep = 30;
  const clipTicks = Array.from(
    { length: CLIP_TIMELINE_DURATION / clipTickStep + 1 },
    (_, i) => i * clipTickStep
  );

  const layers = Array.isArray(mediaFiles)
    ? mediaFiles
    : mediaFiles.layers || [];
  const headerRef = useRef(null);

  // 현재 모드에 따른 타임라인 duration 선택
  const getCurrentDuration = () => {
    return isClipEditMode ? LAYER_TIMELINE_DURATION : CLIP_TIMELINE_DURATION;
  };

  // playhead 이동 함수
  const movePlayhead = (clientX) => {
    const target = headerRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const currentDuration = getCurrentDuration();
    const newTime = Math.round(percent * currentDuration);
    onPlayheadChange && onPlayheadChange(newTime);
  };

  // 마우스 이벤트 핸들러
  const handleHeaderMouseDown = (e) => {
    movePlayhead(e.clientX);

    const handleMouseMove = (moveEvent) => {
      movePlayhead(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // 플레이헤드 위치
  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const currentDuration = getCurrentDuration();
    const newTime = Math.round(percent * currentDuration);
    onPlayheadChange && onPlayheadChange(newTime);
  };

  // 클립 편집 모드일 때는 레이어 트랙만 표시
  if (isClipEditMode) {
    return (
      <div className="timeline">
        <div
          className="timeline-header"
          ref={headerRef}
          onMouseDown={handleHeaderMouseDown}
          style={{ cursor: "pointer" }}
        >
          <div className="timeline-ticks">
            {layerTicks.map((t) => (
              <span key={t} className="timeline-tick">
                {t}s
              </span>
            ))}
          </div>
          <div className="timeline-current-time">
            {Math.floor(playhead / 60)}:{String(Math.floor(playhead % 60)).padStart(2, '0')}
          </div>
        </div>

        {/* 레이어 트랙들 */}
        <div className="timeline-tracks" onClick={handleTimelineClick}>
          {layers.map((layer, i) => (
            <div className="timeline-track" key={i}>
              <span className="track-label">
                {layer.type === "video" && "영상"}
                {layer.type === "audio" && "오디오"}
                {layer.type === "image" && "이미지"}
                {layer.type === "text" && "텍스트"}
                {layer.type === "effect" && "이펙트"}
                {layer.type === "shape" && "도형"}
          {layer.type === "group" && "그룹"}
              </span>
              <div
                className={`timeline-clip clip-${layer.type}${
                  selectedLayerIndex === i ? " selected" : ""
                }`}
                style={{
                  left: `${(layer.start / LAYER_TIMELINE_DURATION) * 100}%`,
                  width: `${(getLayerDuration(layer) / LAYER_TIMELINE_DURATION) * 100}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLayer && onSelectLayer(i);
                }}
              >
                <span>{layer.name || layer.text || layer.type}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(i);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* 플레이헤드 */}
          {playhead !== undefined && (
            <div
              className="timeline-playhead"
              style={{
                left: `${(playhead / LAYER_TIMELINE_DURATION) * 100}%`,
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // 일반 모드일 때는 클립 트랙과 레이어 트랙 모두 표시
  return (
    <div className="timeline">
      <div
        className="timeline-header"
        ref={headerRef}
        onMouseDown={handleHeaderMouseDown}
        style={{ cursor: "pointer" }}
      >
        <div className="timeline-ticks">
          {clipTicks.map((t) => (
            <span key={t} className="timeline-tick">
              {t}s
            </span>
          ))}
        </div>
        <div className="timeline-current-time">
          {Math.floor(playhead / 60)}:{String(Math.floor(playhead % 60)).padStart(2, '0')}
        </div>
      </div>

      {/* Template Clips Track */}
      <div className="timeline-track clip-track" style={{height: "100px"}}>
        <span className="track-label">템플릿 클립</span>
        <div className="" onClick={handleTimelineClick}>
          {clips.length === 0 && (
            <div
              style={{ color: "#999", padding: "10px", textAlign: "center" }}
            >
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
              onSelect={onSelectClip}
              isSelected={selectedClipId === clip.id}
            />
          ))}
        </div>
      </div>

      {/* Audio Tracks */}
      <div className="timeline-track audio-track" style={{height: "80px"}}>
        <span className="track-label">음악 트랙</span>
        <div className="" onClick={handleTimelineClick}>
          {audioTracks.length === 0 && (
            <div
              style={{ color: "#999", padding: "10px", textAlign: "center" }}
            >
              음악 트랙이 없습니다
            </div>
          )}
          {audioTracks.map((track) => (
            <div
              key={track.id}
              className={`timeline-clip clip-audio ${selectedAudioTrackId === track.id ? "selected" : ""}`}
              style={{
                left: `${(track.start / CLIP_TIMELINE_DURATION) * 100}%`,
                width: `${(track.duration / CLIP_TIMELINE_DURATION) * 100}%`,
                background: "#9b59b6",
                color: "#fff",
                border: "solid 2px #8e44ad",
                height: "60px",
                position: "absolute",
                top: "10px",
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                cursor: "pointer",
                borderRadius: "4px",
                overflow: "hidden",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectAudioTrack && onSelectAudioTrack(track.id);
              }}
            >
              <i className="fa fa-music" style={{ marginRight: 8 }}></i>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {track.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAudioTrackRemove && onAudioTrackRemove(track.id);
                }}
                style={{
                  background: "#e74c3c",
                  border: "none",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  marginLeft: 5,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 레이어 트랙들 */}
      <div className="timeline-tracks" onClick={handleTimelineClick}>
        {layers.map((layer, i) => (
          <div className="timeline-track" key={i}>
            <span className="track-label">
              {layer.type === "video" && "영상"}
              {layer.type === "audio" && "오디오"}
              {layer.type === "image" && "이미지"}
              {layer.type === "text" && "텍스트"}
              {layer.type === "effect" && "이펙트"}
              {layer.type === "shape" && "도형"}
          {layer.type === "group" && "그룹"}
            </span>
            <div
              className={`timeline-clip clip-${layer.type}${
                selectedLayerIndex === i ? " selected" : ""
              }`}
              style={{
                left: `${(layer.start / CLIP_TIMELINE_DURATION) * 100}%`,
                width: `${(getLayerDuration(layer) / CLIP_TIMELINE_DURATION) * 100}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLayer && onSelectLayer(i);
              }}
            >
              <span>{layer.name || layer.text || layer.type}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {/* 플레이헤드 */}
        {playhead !== undefined && (
          <div
            className="timeline-playhead"
            style={{
              left: `${(playhead / CLIP_TIMELINE_DURATION) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}

export default Timeline;
