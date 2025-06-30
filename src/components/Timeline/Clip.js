import React, { useState, useRef } from "react";

function Clip({ clip, onDoubleClick, onRemove, onResize, onMove, isSelected }) {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartLeft, setDragStartLeft] = useState(0);
  const clipRef = useRef(null);

  const handleDoubleClick = () => {
    onDoubleClick(clip);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onRemove(clip.id);
  };

  const handleMouseDown = (e) => {
    if (e.target.classList.contains("clip-resize-handle")) {
      setIsResizing(true);
      setResizeStartX(e.clientX);
      setResizeStartWidth(clipRef.current.offsetWidth);
      e.preventDefault();
    } else {
      setIsDragging(true);
      setDragStartX(e.clientX);
      setDragStartLeft(clip.start);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isResizing) {
      const deltaX = e.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + deltaX); // 최소 80px
      const newDuration =
        (newWidth / clipRef.current.parentElement.offsetWidth) * 600; // 600초 기준

      if (onResize) {
        onResize(clip.id, newDuration);
      }
    } else if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const parentWidth = clipRef.current.parentElement.offsetWidth;
      const deltaTime = (deltaX / parentWidth) * 600; // 600초 기준
      const newStart = Math.max(0, dragStartLeft + deltaTime);

      if (onMove) {
        onMove(clip.id, newStart);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isResizing || isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [
    isResizing,
    isDragging,
    resizeStartX,
    resizeStartWidth,
    dragStartX,
    dragStartLeft,
  ]);

  return (
    <div
      ref={clipRef}
      className={`timeline-clip clip-template ${isSelected ? "selected" : ""} ${
        isDragging ? "dragging" : ""
      }`}
      style={{
        left: `${(clip.start / 600) * 100}%`,
        width: `${(clip.duration / 600) * 100}%`,
        background: "#4caf50",
      }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
    >
      <span>{clip.name}</span>
      <button onClick={handleRemove}>×</button>
      <div className="clip-resize-handle"></div>
    </div>
  );
}

export default Clip;
