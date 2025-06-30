import React, { useRef, useEffect, useState } from "react";
import { EFFECT_MAP } from "../effects/effectUtils";

// 이미지 캐싱 및 로딩 함수
const imageCache = {};
function getImage(src) {
  if (!src) return null;
  if (imageCache[src]) return imageCache[src];
  const img = new window.Image();
  img.src = src;
  imageCache[src] = img;
  return img;
}

function CanvasPreview({
  layers,
  currentTime,
  width = 1920,
  height = Math.round((width * 9) / 16),
  selectedLayerIndex,
  onSelectLayer,
}) {
  const canvasRef = useRef(null);
  const videoRefs = useRef({});
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 각 레이어의 위치와 크기 저장
  const layerRects = useRef([]);

  // 줌 컨트롤 함수들
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // 마우스 휠 이벤트
  const handleWheel = (e) => {
    // 캔버스 영역에서만 줌 동작
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 캔버스 영역 내에서만 줌 동작
    if (
      mouseX >= 0 &&
      mouseX <= rect.width &&
      mouseY >= 0 &&
      mouseY <= rect.height
    ) {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, zoom * delta));

      const zoomRatio = newZoom / zoom;
      setPanX((prev) => mouseX - (mouseX - prev) * zoomRatio);
      setPanY((prev) => mouseY - (mouseY - prev) * zoomRatio);
      setZoom(newZoom);
    }
  };

  // 마우스 드래그 이벤트
  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      // 중간 버튼 또는 Ctrl+좌클릭
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDragging(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // 캔버스 전체를 검정색으로 채우기
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    layerRects.current = [];

    // 줌과 팬 적용
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // 1. 이미지 캐싱 및 미리 로드
    layers.forEach((layer) => {
      if (layer.type === "image" && !imageCache[layer.src]) {
        const img = new window.Image();
        img.src = layer.src;
        imageCache[layer.src] = img;
      }
    });

    // 2. 레이어 그리기
    layers.forEach((layer, idx) => {
      if (layer.type === "text") return; // 텍스트는 건너뜀
      if (
        currentTime < layer.start ||
        currentTime > layer.start + layer.duration
      )
        return;

      // === 공통 위치/스케일 계산 ===
      let x = layer.x ?? 0;
      let y = layer.y ?? 0;
      let scale = layer.scale ?? 1;

      // 키프레임 애니메이션 처리
      let animOffsetX = 0,
        animOffsetY = 0,
        animScale = 1,
        animOpacity = 1;
      if (Array.isArray(layer.animation) && layer.animation.length > 1) {
        // 클립 시간이 있으면 클립 시간을 사용, 없으면 일반 시간 사용
        const relTime =
          layer._clipTime !== undefined
            ? layer._clipTime
            : currentTime - layer.start;
        let prev = layer.animation[0];
        let next = layer.animation[layer.animation.length - 1];

        if (relTime <= prev.time) {
          animOffsetX = prev.x ?? 0;
          animOffsetY = prev.y ?? 0;
          animScale = prev.scale ?? 1;
          animOpacity = prev.opacity ?? layer.opacity ?? 1;
        } else if (relTime >= next.time) {
          animOffsetX = next.x ?? 0;
          animOffsetY = next.y ?? 0;
          animScale = next.scale ?? 1;
          animOpacity = next.opacity ?? layer.opacity ?? 1;
        } else {
          for (let i = 1; i < layer.animation.length; i++) {
            if (layer.animation[i].time > relTime) {
              next = layer.animation[i];
              prev = layer.animation[i - 1];
              break;
            }
          }
          // 키프레임 간의 실제 시간 차이로 보간
          const t = (relTime - prev.time) / (next.time - prev.time);
          animOffsetX = (prev.x ?? 0) + ((next.x ?? 0) - (prev.x ?? 0)) * t;
          animOffsetY = (prev.y ?? 0) + ((next.y ?? 0) - (prev.y ?? 0)) * t;
          animScale =
            (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * t;
          const prevOpacity = prev.opacity ?? layer.opacity ?? 1;
          const nextOpacity = next.opacity ?? layer.opacity ?? 1;
          animOpacity = prevOpacity + (nextOpacity - prevOpacity) * t;
        }
      } else {
        animOpacity = layer.opacity ?? 1;
      }

      layerRects.current.push({
        x: (x + animOffsetX) * zoom + panX,
        y: (y + animOffsetY) * zoom + panY,
        w: (layer.width || 160) * zoom,
        h: (layer.height || 90) * zoom,
        index: idx,
      });

      // === 타입별 렌더링 ===
      if (layer.type === "image") {
        const img = getImage(layer.src);
        if (img && img.complete) {
          const canvasElem = canvasRef?.current;
          if (!canvasElem) return;
          const scaleToFit = Math.min(
            canvasElem.width / img.naturalWidth,
            canvasElem.height / img.naturalHeight
          );
          const imgW = layer.width || img.naturalWidth;
          const imgH = layer.height || img.naturalHeight;

          // 1. 정렬 기준점(anchorX, anchorY)
          let anchorX = layer.x ?? 0;
          let anchorY = layer.y ?? 0;
          if (anchorX === 0 && layer.align === "center") anchorX = width / 2;
          else if (anchorX === 0 && layer.align === "right") anchorX = width;
          if (anchorY === 0 && layer.verticalAlign === "middle")
            anchorY = height / 2;
          else if (anchorY === 0 && layer.verticalAlign === "bottom")
            anchorY = height;

          // 2. 애니메이션 값은 위에서 계산된 값 사용
          // animOffsetX, animOffsetY, animScale, animOpacity는 이미 계산됨

          // 3. 최종 위치
          const finalX = anchorX + animOffsetX;
          const finalY = anchorY + animOffsetY;
          let renderScale = (layer.scale ?? 1) * animScale;
          if (layer.scaleMode === "fit") renderScale *= scaleToFit;

          // 4. transform-origin 보정
          let drawX = 0,
            drawY = 0;
          if (layer.align === "center") drawX = -imgW / 2;
          else if (layer.align === "right") drawX = -imgW;
          if (layer.verticalAlign === "middle") drawY = -imgH / 2;
          else if (layer.verticalAlign === "bottom") drawY = -imgH;

          ctx.save();
          ctx.globalAlpha = animOpacity;
          ctx.translate(finalX, finalY);
          ctx.scale(renderScale, renderScale);

          // Crop 기능 적용
          if (layer.crop) {
            const crop = layer.crop;
            // 원본 이미지에서 crop 영역 추출
            const sourceX = (crop.x / 100) * img.naturalWidth;
            const sourceY = (crop.y / 100) * img.naturalHeight;
            const sourceWidth = (crop.width / 100) * img.naturalWidth;
            const sourceHeight = (crop.height / 100) * img.naturalHeight;

            console.log("Crop 렌더링:", {
              crop,
              imgNaturalSize: {
                width: img.naturalWidth,
                height: img.naturalHeight,
              },
              sourceArea: {
                x: sourceX,
                y: sourceY,
                width: sourceWidth,
                height: sourceHeight,
              },
              originalDrawArea: {
                x: drawX,
                y: drawY,
                width: imgW,
                height: imgH,
              },
            });

            // crop된 영역의 크기에 맞춰서 그릴 크기 계산
            const cropRatio = sourceWidth / sourceHeight;
            const originalRatio = imgW / imgH;

            let drawWidth, drawHeight;

            if (cropRatio > originalRatio) {
              // crop이 더 넓으면 원본 너비에 맞춤
              drawWidth = imgW;
              drawHeight = imgW / cropRatio;
            } else {
              // crop이 더 높으면 원본 높이에 맞춤
              drawHeight = imgH;
              drawWidth = imgH * cropRatio;
            }

            // 중앙 정렬을 위한 오프셋 계산
            let offsetX = 0,
              offsetY = 0;
            if (layer.align === "center") {
              offsetX = (imgW - drawWidth) / 2;
            } else if (layer.align === "right") {
              offsetX = imgW - drawWidth;
            }

            if (layer.verticalAlign === "middle") {
              offsetY = (imgH - drawHeight) / 2;
            } else if (layer.verticalAlign === "bottom") {
              offsetY = imgH - drawHeight;
            }

            console.log("Crop 계산 결과:", {
              cropRatio,
              originalRatio,
              drawSize: { width: drawWidth, height: drawHeight },
              offset: { x: offsetX, y: offsetY },
            });

            // 9개 파라미터 버전의 drawImage 사용 (crop 적용)
            ctx.drawImage(
              img,
              sourceX,
              sourceY,
              sourceWidth,
              sourceHeight, // 원본에서 자를 영역
              drawX + offsetX,
              drawY + offsetY,
              drawWidth,
              drawHeight // 캔버스에 그릴 영역 (crop 크기에 맞춤)
            );
          } else {
            // Crop이 없으면 기존 방식으로 그리기
            ctx.drawImage(img, drawX, drawY, imgW, imgH);
          }

          ctx.restore();
        }
      } else if (layer.type === "video") {
        let video = videoRefs.current[layer.src];
        if (!video) {
          video = document.createElement("video");
          video.src = layer.src;
          video.crossOrigin = "anonymous";
          video.muted = true;
          video.playsInline = true;
          videoRefs.current[layer.src] = video;
        }
        video.currentTime = Math.max(0, currentTime - layer.start);

        // 비디오 메타데이터가 준비되지 않았으면 그리지 않음
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        if (!videoW || !videoH) return;

        let renderScale = layer.scale ?? 1;

        // scaleMode: fit/cover
        if (layer.scaleMode === "fit") {
          renderScale = Math.min(width / videoW, height / videoH);
        } else if (layer.scaleMode === "cover") {
          renderScale = Math.max(width / videoW, height / videoH);
        }

        // 정렬
        let anchorX = layer.x ?? 0;
        let anchorY = layer.y ?? 0;
        if (anchorX === 0 && layer.align === "center") anchorX = width / 2;
        else if (anchorX === 0 && layer.align === "right") anchorX = width;
        if (anchorY === 0 && layer.verticalAlign === "middle")
          anchorY = height / 2;
        else if (anchorY === 0 && layer.verticalAlign === "bottom")
          anchorY = height;

        // 실제 그릴 위치 계산 (중앙 정렬 등)
        let drawX = 0,
          drawY = 0;
        if (layer.align === "center") drawX = -videoW / 2;
        else if (layer.align === "right") drawX = -videoW;
        if (layer.verticalAlign === "middle") drawY = -videoH / 2;
        else if (layer.verticalAlign === "bottom") drawY = -videoH;

        ctx.save();
        ctx.globalAlpha = layer.opacity ?? 1;
        ctx.translate(anchorX, anchorY);
        ctx.scale(renderScale, renderScale);
        ctx.drawImage(video, drawX, drawY, videoW, videoH);
        ctx.restore();
      } else if (layer.type === "text") {
        const fontSize = layer.fontSize || 30;
        const fontFamily = layer.fontFamily || "Arial";
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = layer.color || "#fff";
        ctx.fillText(layer.text, layer.x, layer.y);
      } else if (layer.type === "effect") {
        const effectFunc = EFFECT_MAP[layer.effectType];
        if (effectFunc) {
          effectFunc(ctx, layer, currentTime, canvas);
        }
      }
    });

    // 2. 텍스트 레이어는 항상 맨 위에 그림
    layers.forEach((layer, idx) => {
      if (layer.type !== "text") return;
      if (
        currentTime < layer.start ||
        currentTime > layer.start + layer.duration
      )
        return;

      let x = layer.x ?? 0;
      let y = layer.y ?? 0;
      let scale = layer.scale ?? 1;
      let animOpacity = 1;

      // 키프레임 애니메이션 처리 (수정)
      if (Array.isArray(layer.animation) && layer.animation.length > 1) {
        const relTime =
          layer._clipTime !== undefined
            ? layer._clipTime
            : currentTime - layer.start;
        const anim = layer.animation;
        if (relTime <= anim[0].time) {
          x = anim[0].x ?? x;
          y = anim[0].y ?? y;
          scale = anim[0].scale ?? scale;
          animOpacity = anim[0].opacity ?? layer.opacity ?? 1;
        } else if (relTime >= anim[anim.length - 1].time) {
          x = anim[anim.length - 1].x ?? x;
          y = anim[anim.length - 1].y ?? y;
          scale = anim[anim.length - 1].scale ?? scale;
          animOpacity = anim[anim.length - 1].opacity ?? layer.opacity ?? 1;
        } else {
          let prev = anim[0];
          let next = anim[anim.length - 1];
          for (let i = 1; i < anim.length; i++) {
            if (anim[i].time > relTime) {
              next = anim[i];
              prev = anim[i - 1];
              break;
            }
          }
          const t = (relTime - prev.time) / (next.time - prev.time);
          x = (prev.x ?? x) + ((next.x ?? prev.x ?? x) - (prev.x ?? x)) * t;
          y = (prev.y ?? y) + ((next.y ?? prev.y ?? y) - (prev.y ?? y)) * t;
          scale =
            (prev.scale ?? scale) +
            ((next.scale ?? prev.scale ?? scale) - (prev.scale ?? scale)) * t;
          const prevOpacity = prev.opacity ?? layer.opacity ?? 1;
          const nextOpacity = next.opacity ?? layer.opacity ?? 1;
          animOpacity = prevOpacity + (nextOpacity - prevOpacity) * t;
        }
      } else {
        animOpacity = layer.opacity ?? 1;
      }

      layerRects.current.push({
        x: x * zoom + panX,
        y: y * zoom + panY,
        w: (layer.width || 160) * zoom,
        h: (layer.height || 90) * zoom,
        index: idx,
      });

      ctx.save();
      ctx.globalAlpha = animOpacity;
      ctx.font = `${layer.fontSize ? layer.fontSize * scale : 32 * scale}px ${
        layer.fontFamily || "sans-serif"
      }`;
      ctx.fillStyle = layer.color || "#fff";

      // 가로 정렬
      let drawX = x;
      if (layer.align === "center") {
        ctx.textAlign = "center";
        drawX = width / 2;
      } else if (layer.align === "right") {
        ctx.textAlign = "right";
        drawX = width - (layer.marginRight || 0);
      } else {
        ctx.textAlign = "left";
        drawX = x;
      }

      // 세로 정렬
      let drawY = y;
      if (layer.verticalAlign === "middle") {
        ctx.textBaseline = "middle";
        drawY = height / 2;
      } else if (layer.verticalAlign === "bottom") {
        ctx.textBaseline = "bottom";
        drawY = height - (layer.marginBottom || 0);
      } else {
        ctx.textBaseline = "top";
        drawY = y;
      }

      ctx.fillText(layer.text || "", drawX, drawY);
      ctx.restore();
    });

    ctx.restore(); // 줌과 팬 변환 복원
  }, [
    layers,
    currentTime,
    width,
    height,
    selectedLayerIndex,
    zoom,
    panX,
    panY,
  ]);

  // 클릭 시 실제 layers의 인덱스를 넘김
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 줌과 팬을 고려한 실제 좌표 계산
    const actualX = (x - panX) / zoom;
    const actualY = (y - panY) / zoom;

    for (let i = layerRects.current.length - 1; i >= 0; i--) {
      const { x: lx, y: ly, w, h, index } = layerRects.current[i];
      if (x >= lx && x <= lx + w && y >= ly && y <= ly + h) {
        onSelectLayer && onSelectLayer(index);
        return;
      }
    }
    onSelectLayer && onSelectLayer(null);
  };

  return (
    <div
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        height: "100%",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="canvas-preview"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          border: "1px solid #ccc",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          display: "flex",
          gap: "5px",
          zIndex: 1000,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          style={{
            padding: "5px 10px",
            fontSize: "14px",
            cursor: "pointer",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "3px",
          }}
        >
          +
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          style={{
            padding: "5px 10px",
            fontSize: "14px",
            cursor: "pointer",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "3px",
          }}
        >
          -
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomReset();
          }}
          style={{
            padding: "5px 10px",
            fontSize: "12px",
            cursor: "pointer",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "3px",
          }}
        >
          Reset
        </button>
        <span
          style={{
            padding: "5px 10px",
            fontSize: "12px",
            backgroundColor: "rgba(0,0,0,0.7)",
            color: "white",
            borderRadius: "3px",
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
}

export default CanvasPreview;
