import React, { useRef, useEffect, useState } from "react";
import { EFFECT_MAP } from "../effects/effectUtils";
import { applyEasing } from "../utils/easingFunctions";

// 이미지 캐싱 및 로딩 함수
const imageCache = {};
const imageLoadListeners = {};

function getImage(src, onLoad) {
  if (!src) return null;
  
  // 이미 캐시에 있고 로드가 완료된 경우
  if (imageCache[src]) {
    const img = imageCache[src];
    // 로드가 완료되었으면 바로 반환
    if (img.complete && img.naturalHeight !== 0) {
      return img;
    }
    // 로드 중이면 리스너만 추가하고 반환
    if (onLoad && !imageLoadListeners[src]?.includes(onLoad)) {
      if (!imageLoadListeners[src]) imageLoadListeners[src] = [];
      imageLoadListeners[src].push(onLoad);
    }
    return img;
  }
  
  // 새로운 이미지 생성
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  
  // 로드 성공 핸들러
  img.onload = () => {
    console.log('이미지 로드 성공:', src);
    // 모든 리스너 호출
    if (imageLoadListeners[src]) {
      imageLoadListeners[src].forEach(listener => listener());
      delete imageLoadListeners[src];
    }
  };
  
  // 로드 실패 핸들러
  img.onerror = () => {
    console.error('이미지 로드 실패:', src);
    console.error('이미지 경로를 확인하세요. 현재 경로:', img.src);
    delete imageCache[src]; // 캐시에서 제거하여 재시도 가능하도록
  };
  
  img.src = src;
  imageCache[src] = img;
  
  // 로드 리스너 추가
  if (onLoad) {
    if (!imageLoadListeners[src]) imageLoadListeners[src] = [];
    imageLoadListeners[src].push(onLoad);
  }
  
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
  const animationFrameRef = useRef(null);

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
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true; // 비디오 렌더링을 위해 활성화
    ctx.imageSmoothingQuality = "high";

    // 캔버스 전체를 검정색으로 채우기
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    layerRects.current = [];

    // 줌과 팬 적용
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // 렌더링 함수 (이미지 로드 시 다시 호출될 수 있도록)
    let needsRedraw = false;

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
        animOpacity = 1,
        animRotation = 0;
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
          animRotation = prev.rotation ?? 0;
        } else if (relTime >= next.time) {
          animOffsetX = next.x ?? 0;
          animOffsetY = next.y ?? 0;
          animScale = next.scale ?? 1;
          animOpacity = next.opacity ?? layer.opacity ?? 1;
          animRotation = next.rotation ?? 0;
        } else {
          for (let i = 1; i < layer.animation.length; i++) {
            if (layer.animation[i].time > relTime) {
              next = layer.animation[i];
              prev = layer.animation[i - 1];
              break;
            }
          }
          // 키프레임 간의 실제 시간 차이로 보간
          let t = (relTime - prev.time) / (next.time - prev.time);
          
          // Easing 함수 적용 (next 키프레임에 easing이 지정되어 있으면)
          if (next.easing) {
            t = applyEasing(t, next.easing);
          }
          
          animOffsetX = (prev.x ?? 0) + ((next.x ?? 0) - (prev.x ?? 0)) * t;
          animOffsetY = (prev.y ?? 0) + ((next.y ?? 0) - (prev.y ?? 0)) * t;
          animScale =
            (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * t;
          const prevOpacity = prev.opacity ?? layer.opacity ?? 1;
          const nextOpacity = next.opacity ?? layer.opacity ?? 1;
          animOpacity = prevOpacity + (nextOpacity - prevOpacity) * t;
          animRotation =
            (prev.rotation ?? 0) + ((next.rotation ?? 0) - (prev.rotation ?? 0)) * t;
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
        // 이미지 로드 시 다시 그리도록 콜백 전달
        const img = getImage(layer.src, () => {
          // 이미지가 로드되면 강제로 리렌더링
          if (!needsRedraw) {
            needsRedraw = true;
            // 다음 프레임에 다시 그리기
            requestAnimationFrame(() => {
              // 작은 상태 변경으로 리렌더링 트리거
              setZoom(z => z);
            });
          }
        });
        
        // 이미지가 완전히 로드되고 유효한지 확인
        if (img && img.complete && img.naturalHeight !== 0) {
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
          ctx.rotate(animRotation);
          ctx.scale(renderScale, renderScale);

          // 마스크 기능 적용
          if (layer.mask) {
            const relTime =
              layer._clipTime !== undefined
                ? layer._clipTime
                : currentTime - layer.start;
            
            let maskProps = {};
            
            // 마스크 애니메이션 보간
            if (Array.isArray(layer.mask.animation) && layer.mask.animation.length > 0) {
              const maskAnim = layer.mask.animation;
              
              if (relTime <= maskAnim[0].time) {
                maskProps = { ...maskAnim[0] };
              } else if (relTime >= maskAnim[maskAnim.length - 1].time) {
                maskProps = { ...maskAnim[maskAnim.length - 1] };
              } else {
                let prev = maskAnim[0];
                let next = maskAnim[maskAnim.length - 1];
                for (let i = 1; i < maskAnim.length; i++) {
                  if (maskAnim[i].time > relTime) {
                    next = maskAnim[i];
                    prev = maskAnim[i - 1];
                    break;
                  }
                }
                let t = (relTime - prev.time) / (next.time - prev.time);
                
                // Easing 함수 적용
                if (next.easing) {
                  t = applyEasing(t, next.easing);
                }
                
                // 각 속성 보간
                Object.keys(next).forEach(key => {
                  if (key !== 'time' && key !== 'easing' && typeof next[key] === 'number') {
                    const prevVal = prev[key] ?? 0;
                    const nextVal = next[key] ?? 0;
                    maskProps[key] = prevVal + (nextVal - prevVal) * t;
                  }
                });
              }
            }
            
            // 마스크 타입별 클리핑 처리
            ctx.save();
            
            // 마스크 도형 경로를 그리는 함수
            const drawMaskPath = () => {
              ctx.beginPath();
              if (layer.mask.type === "circle") {
                const radius = maskProps.radius ?? 0;
                const maskX = maskProps.x ?? 0;
                const maskY = maskProps.y ?? 0;
                ctx.arc(maskX, maskY, radius, 0, Math.PI * 2);
              } else if (layer.mask.type === "rect") {
                const maskW = maskProps.width ?? 0;
                const maskH = maskProps.height ?? 0;
                const maskX = maskProps.x ?? -maskW / 2;
                const maskY = maskProps.y ?? -maskH / 2;
                ctx.rect(maskX, maskY, maskW, maskH);
              } else if (layer.mask.type === "ellipse") {
                const radiusX = maskProps.radiusX ?? 0;
                const radiusY = maskProps.radiusY ?? 0;
                const maskX = maskProps.x ?? 0;
                const maskY = maskProps.y ?? 0;
                ctx.ellipse(maskX, maskY, radiusX, radiusY, 0, 0, Math.PI * 2);
              } else if (layer.mask.type === "horizontal") {
                // 좌우에서 중앙으로 열림
                const progress = maskProps.progress ?? 0; // 0~1
                const maskW = imgW * progress;
                ctx.rect(-maskW / 2, -imgH / 2, maskW, imgH);
              } else if (layer.mask.type === "vertical") {
                // 상하에서 중앙으로 열림
                const progress = maskProps.progress ?? 0; // 0~1
                const maskH = imgH * progress;
                ctx.rect(-imgW / 2, -maskH / 2, imgW, maskH);
              }
            };
            
            // 마스크에 색상이 있으면 먼저 그리기
            if (layer.mask.fillColor || layer.mask.strokeColor) {
              drawMaskPath();
              
              if (layer.mask.fillColor) {
                ctx.fillStyle = layer.mask.fillColor;
                ctx.fill();
              }
              
              if (layer.mask.strokeColor) {
                ctx.strokeStyle = layer.mask.strokeColor;
                ctx.lineWidth = layer.mask.strokeWidth ?? 2;
                ctx.stroke();
              }
            }
            
            // 클리핑을 위해 같은 경로 다시 그리기
            drawMaskPath();
            ctx.clip();
          }

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

          // 마스크가 적용된 경우 복원
          if (layer.mask) {
            ctx.restore();
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
          video.preload = "auto";
          videoRefs.current[layer.src] = video;
        }
        
        // 비디오 시간 설정 최적화 (0.2초 이상 차이날 때만 seek)
        const targetTime = Math.max(0, currentTime - layer.start);
        if (Math.abs(video.currentTime - targetTime) > 0.2) {
          video.currentTime = targetTime;
        }

        // 비디오 메타데이터가 준비되지 않았으면 그리지 않음
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        if (!videoW || !videoH || video.readyState < 2) return;

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
      } else if (layer.type === "shape") {
        // 도형 레이어 렌더링
        
        // 애니메이션 변수 계산
        let animOffsetX = 0, animOffsetY = 0, animScale = 1, animOpacity = 1, animRotation = 0;
        
        if (Array.isArray(layer.animation) && layer.animation.length > 1) {
          const relTime = layer._clipTime !== undefined ? layer._clipTime : currentTime - layer.start;
          
          if (relTime >= 0) {
            let prev = layer.animation[0];
            let next = layer.animation[layer.animation.length - 1];
            
            // 애니메이션 시간이 마지막 키프레임을 넘으면 마지막 위치 고정
            if (relTime >= layer.animation[layer.animation.length - 1].time) {
              prev = layer.animation[layer.animation.length - 1];
              next = layer.animation[layer.animation.length - 1];
              // 마지막 위치 고정
              animOffsetX = prev.x ?? 0;
              animOffsetY = prev.y ?? 0;
              animScale = prev.scale ?? 1;
              animOpacity = prev.opacity ?? 1;
              animRotation = prev.rotation ?? 0;
            } else {
              for (let i = 1; i < layer.animation.length; i++) {
                if (layer.animation[i].time > relTime) {
                  next = layer.animation[i];
                  prev = layer.animation[i - 1];
                  break;
                }
              }
              
              let t = (relTime - prev.time) / (next.time - prev.time);
              if (next.easing) {
                t = applyEasing(t, next.easing);
              }
              
              animOffsetX = (prev.x ?? 0) + ((next.x ?? 0) - (prev.x ?? 0)) * t;
              animOffsetY = (prev.y ?? 0) + ((next.y ?? 0) - (prev.y ?? 0)) * t;
              animScale = (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * t;
              animOpacity = (prev.opacity ?? 1) + ((next.opacity ?? 1) - (prev.opacity ?? 1)) * t;
              animRotation = (prev.rotation ?? 0) + ((next.rotation ?? 0) - (prev.rotation ?? 0)) * t;
            }
          }
        }
        
        // 정렬 기준점 계산
        let anchorX = layer.x ?? 0;
        let anchorY = layer.y ?? 0;
        if (anchorX === 0 && layer.align === "center") anchorX = width / 2;
        else if (anchorX === 0 && layer.align === "right") anchorX = width;
        if (anchorY === 0 && layer.verticalAlign === "middle") anchorY = height / 2;
        else if (anchorY === 0 && layer.verticalAlign === "bottom") anchorY = height;

        const finalX = anchorX + animOffsetX;
        const finalY = anchorY + animOffsetY;
        const renderScale = (layer.scale ?? 1) * animScale;

        ctx.save();
        ctx.translate(finalX, finalY);
        ctx.rotate(animRotation);
        ctx.scale(renderScale, renderScale);
        ctx.globalAlpha = animOpacity;

        // 도형 그리기
        ctx.beginPath();

        if (layer.shapeType === "rect") {
          const w = layer.width ?? 100;
          const h = layer.height ?? 100;
          
          // 정렬에 따른 위치 계산
          let rectX = -w / 2, rectY = -h / 2;
          
          if (layer.align === "left") {
            rectX = 0;
          } else if (layer.align === "right") {
            rectX = -w;
          }
          
          if (layer.verticalAlign === "top") {
            rectY = 0;
          } else if (layer.verticalAlign === "bottom") {
            rectY = -h;
          }
          
          ctx.rect(rectX, rectY, w, h);
        } else if (layer.shapeType === "circle") {
          const radius = layer.radius ?? 50;
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
        } else if (layer.shapeType === "ellipse") {
          const radiusX = layer.radiusX ?? 100;
          const radiusY = layer.radiusY ?? 50;
          ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
        } else if (layer.shapeType === "triangle") {
          const size = layer.size ?? 100;
          ctx.moveTo(0, -size / 2);
          ctx.lineTo(size / 2, size / 2);
          ctx.lineTo(-size / 2, size / 2);
          ctx.closePath();
        } else if (layer.shapeType === "star") {
          const outerRadius = layer.outerRadius ?? 50;
          const innerRadius = layer.innerRadius ?? 25;
          const points = layer.points ?? 5;
          
          for (let i = 0; i < points * 2; i++) {
            const angle = (Math.PI / points) * i;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.cos(angle - Math.PI / 2) * radius;
            const y = Math.sin(angle - Math.PI / 2) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        } else if (layer.shapeType === "polygon") {
          const radius = layer.radius ?? 50;
          const sides = layer.sides ?? 6;
          
          for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 / sides) * i;
            const x = Math.cos(angle - Math.PI / 2) * radius;
            const y = Math.sin(angle - Math.PI / 2) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        }

        // 채우기
        if (layer.fillColor) {
          ctx.fillStyle = layer.fillColor;
          ctx.fill();
        }

        // 외곽선
        if (layer.strokeColor) {
          ctx.strokeStyle = layer.strokeColor;
          ctx.lineWidth = layer.strokeWidth ?? 2;
          ctx.stroke();
        }

        // Shape 안에 이미지가 있으면 이미지 렌더링
        if (layer.imageSrc) {
          const img = getImage(layer.imageSrc, () => {
            if (!needsRedraw) {
              needsRedraw = true;
              requestAnimationFrame(() => {
                setZoom(z => z);
              });
            }
          });
          
          if (img && img.complete && img.naturalHeight !== 0) {
            // 도형 경로를 클리핑 마스크로 사용
            ctx.clip();
            
            // 이미지 크기 계산
            const imgW = img.naturalWidth;
            const imgH = img.naturalHeight;
            
            // 이미지가 도형 안에 맞도록 스케일링
            let imageScale = 1;
            let drawX = 0, drawY = 0, drawW = imgW, drawH = imgH;
            
            if (layer.shapeType === "rect") {
              const w = layer.width ?? 100;
              const h = layer.height ?? 100;
              
              // scaleMode에 따른 스케일링
              if (layer.imageScaleMode === "cover") {
                imageScale = Math.max(w / imgW, h / imgH);
                drawW = imgW * imageScale;
                drawH = imgH * imageScale;
                
                // cover 모드에서는 도형의 정렬에 따라 위치 조정
                if (layer.align === "left") {
                  drawX = 0;  // 도형 왼쪽 상단부터
                } else if (layer.align === "center") {
                  drawX = -drawW / 2;  // 도형 중앙
                } else if (layer.align === "right") {
                  drawX = -drawW;  // 도형 오른쪽 상단부터
                }
                
                if (layer.verticalAlign === "top") {
                  drawY = 0;  // 도형 상단부터
                } else if (layer.verticalAlign === "middle") {
                  drawY = -drawH / 2;  // 도형 중앙
                } else if (layer.verticalAlign === "bottom") {
                  drawY = -drawH;  // 도형 하단부터
                }
                
              } else if (layer.imageScaleMode === "contain") {
                imageScale = Math.min(w / imgW, h / imgH);
                drawW = imgW * imageScale;
                drawH = imgH * imageScale;
                
                // contain 모드에서는 정렬 설정에 따라 위치 조정
                if (layer.imageAlign === "left") {
                  drawX = 0;
                } else if (layer.imageAlign === "center") {
                  drawX = -drawW / 2;
                } else if (layer.imageAlign === "right") {
                  drawX = -drawW;
                }
                
                if (layer.imageVerticalAlign === "top") {
                  drawY = 0;
                } else if (layer.imageVerticalAlign === "middle") {
                  drawY = -drawH / 2;
                } else if (layer.imageVerticalAlign === "bottom") {
                  drawY = -drawH;
                }
                
              } else if (layer.imageScaleMode === "fill") {
                // 도형을 완전히 채우도록 (비율 무시)
                drawW = w;
                drawH = h;
                imageScale = 1;
                drawX = 0;
                drawY = 0;
                
              } else {
                // 기본값: contain
                imageScale = Math.min(w / imgW, h / imgH);
                drawW = imgW * imageScale;
                drawH = imgH * imageScale;
                drawX = -drawW / 2;
                drawY = -drawH / 2;
              }
              
            } else if (layer.shapeType === "circle") {
              const radius = layer.radius ?? 50;
              const diameter = radius * 2;
              
              if (layer.imageScaleMode === "cover") {
                imageScale = Math.max(diameter / imgW, diameter / imgH);
              } else if (layer.imageScaleMode === "contain") {
                imageScale = Math.min(diameter / imgW, diameter / imgH);
              } else {
                imageScale = Math.min(diameter / imgW, diameter / imgH);
              }
              
              drawW = imgW * imageScale;
              drawH = imgH * imageScale;
              drawX = -drawW / 2;
              drawY = -drawH / 2;
              
            } else if (layer.shapeType === "ellipse") {
              const radiusX = layer.radiusX ?? 100;
              const radiusY = layer.radiusY ?? 50;
              
              if (layer.imageScaleMode === "cover") {
                imageScale = Math.max((radiusX * 2) / imgW, (radiusY * 2) / imgH);
              } else if (layer.imageScaleMode === "contain") {
                imageScale = Math.min((radiusX * 2) / imgW, (radiusY * 2) / imgH);
              } else {
                imageScale = Math.min((radiusX * 2) / imgW, (radiusY * 2) / imgH);
              }
              
              drawW = imgW * imageScale;
              drawH = imgH * imageScale;
              drawX = -drawW / 2;
              drawY = -drawH / 2;
            }
            
            // 이미지 그리기
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          }
        }

        ctx.restore();
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
      let animRotation = 0;

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
          animRotation = anim[0].rotation ?? 0;
        } else if (relTime >= anim[anim.length - 1].time) {
          x = anim[anim.length - 1].x ?? x;
          y = anim[anim.length - 1].y ?? y;
          scale = anim[anim.length - 1].scale ?? scale;
          animOpacity = anim[anim.length - 1].opacity ?? layer.opacity ?? 1;
          animRotation = anim[anim.length - 1].rotation ?? 0;
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
          let t = (relTime - prev.time) / (next.time - prev.time);
          
          // Easing 함수 적용 (next 키프레임에 easing이 지정되어 있으면)
          if (next.easing) {
            t = applyEasing(t, next.easing);
          }
          
          x = (prev.x ?? x) + ((next.x ?? prev.x ?? x) - (prev.x ?? x)) * t;
          y = (prev.y ?? y) + ((next.y ?? prev.y ?? y) - (prev.y ?? y)) * t;
          scale =
            (prev.scale ?? scale) +
            ((next.scale ?? prev.scale ?? scale) - (prev.scale ?? scale)) * t;
          const prevOpacity = prev.opacity ?? layer.opacity ?? 1;
          const nextOpacity = next.opacity ?? layer.opacity ?? 1;
          animOpacity = prevOpacity + (nextOpacity - prevOpacity) * t;
          animRotation =
            (prev.rotation ?? 0) + ((next.rotation ?? 0) - (prev.rotation ?? 0)) * t;
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

      // 회전 적용
      ctx.translate(drawX, drawY);
      ctx.rotate(animRotation);
      ctx.fillText(layer.text || "", 0, 0);
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
