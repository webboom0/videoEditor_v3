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

export default function CanvasPreview({
  layers,
  currentTime,
  zoom,
  setZoom,
  panX,
  panY,
  onLayerClick,
  onLayerDoubleClick,
}) {
  const canvasRef = useRef(null);
  const layerRects = useRef([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasWidth = 1920;
  const canvasHeight = Math.round((canvasWidth * 9) / 16); // 1080

  // 레이어 렌더링 함수 (재귀 호출을 위해 분리)
  const renderLayer = (layer, ctx, width, height, currentTime, setZoom) => {
    if (
      currentTime < layer.start ||
      currentTime > layer.start + layer.duration
    )
      return;

    let needsRedraw = false;

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
        if (next.easing) {
          t = applyEasing(t, next.easing);
        }
        animOffsetX = (prev.x ?? 0) + ((next.x ?? 0) - (prev.x ?? 0)) * t;
        animOffsetY = (prev.y ?? 0) + ((next.y ?? 0) - (prev.y ?? 0)) * t;
        animScale = (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * t;
        animOpacity = (prev.opacity ?? layer.opacity ?? 1) + ((next.opacity ?? layer.opacity ?? 1) - (prev.opacity ?? layer.opacity ?? 1)) * t;
        animRotation = (prev.rotation ?? 0) + ((next.rotation ?? 0) - (prev.rotation ?? 0)) * t;
      }
    } else {
      animOpacity = layer.opacity ?? 1;
    }

    // 정렬 기준점 계산
    let anchorX = x;
    let anchorY = y;
    if (anchorX === 0 && layer.align === "center") anchorX = width / 2;
    else if (anchorX === 0 && layer.align === "right") anchorX = width;
    if (anchorY === 0 && layer.verticalAlign === "middle") anchorY = height / 2;
    else if (anchorY === 0 && layer.verticalAlign === "bottom") anchorY = height;

    const finalX = anchorX + animOffsetX;
    const finalY = anchorY + animOffsetY;
    const renderScale = scale * animScale;

    // 줌과 팬 적용
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // 레이어 타입별 렌더링
    if (layer.type === "image") {
      // 이미지 레이어 렌더링
        const img = getImage(layer.src, () => {
          if (!needsRedraw) {
            needsRedraw = true;
            requestAnimationFrame(() => {
              // 이미지 로드 완료 시 다시 그리기
            });
          }
        });

      if (img && img.complete && img.naturalHeight !== 0) {
        ctx.save();
        ctx.translate(finalX, finalY);
        ctx.rotate(animRotation);
        ctx.scale(renderScale, renderScale);
        ctx.globalAlpha = animOpacity;

        // 마스크가 있는 경우
        if (layer.mask) {
          ctx.beginPath();
          if (layer.mask.type === "rect") {
            const maskW = layer.mask.width ?? 200;
            const maskH = layer.mask.height ?? 200;
            let maskX = -maskW / 2;
            let maskY = -maskH / 2;
            
            if (layer.mask.align === "left") maskX = 0;
            else if (layer.mask.align === "right") maskX = -maskW;
            if (layer.mask.verticalAlign === "top") maskY = 0;
            else if (layer.mask.verticalAlign === "bottom") maskY = -maskH;
            
            ctx.rect(maskX, maskY, maskW, maskH);
          } else if (layer.mask.type === "circle") {
            const radius = layer.mask.radius ?? 100;
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
          }
          
          // 마스크 색상 적용
          if (layer.mask.fillColor) {
            ctx.fillStyle = layer.mask.fillColor;
            ctx.fill();
          }
          if (layer.mask.strokeColor) {
            ctx.strokeStyle = layer.mask.strokeColor;
            ctx.lineWidth = layer.mask.strokeWidth ?? 2;
            ctx.stroke();
          }
          
          ctx.clip();
        }

        // 이미지 크기 계산
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;
        let drawW = imgW;
        let drawH = imgH;
        let drawX = -imgW / 2;
        let drawY = -imgH / 2;

        // 스케일 모드 적용
        if (layer.scaleMode === "cover") {
          const scaleX = width / imgW;
          const scaleY = height / imgH;
          const scale = Math.max(scaleX, scaleY);
          drawW = imgW * scale;
          drawH = imgH * scale;
          drawX = -drawW / 2;
          drawY = -drawH / 2;
        } else if (layer.scaleMode === "contain") {
          const scaleX = width / imgW;
          const scaleY = height / imgH;
          const scale = Math.min(scaleX, scaleY);
          drawW = imgW * scale;
          drawH = imgH * scale;
          drawX = -drawW / 2;
          drawY = -drawH / 2;
        } else if (layer.scaleMode === "fit") {
          drawW = width;
          drawH = height;
          drawX = -width / 2;
          drawY = -height / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
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
              // 이미지 로드 완료 시 다시 그리기
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
    } else if (layer.type === "group") {
      // 그룹 레이어 렌더링
      
      // 그룹 애니메이션 변수 계산
      let animOffsetX = 0, animOffsetY = 0, animScale = 1, animOpacity = 1, animRotation = 0;
      
      if (Array.isArray(layer.animation) && layer.animation.length > 1) {
        const relTime = layer._clipTime !== undefined ? layer._clipTime : currentTime - layer.start;
        
        
        let prev = layer.animation[0];
        let next = layer.animation[layer.animation.length - 1];
        
        if (relTime <= prev.time) {
          // 첫 번째 키프레임 이전
          animOffsetX = prev.x ?? 0;
          animOffsetY = prev.y ?? 0;
          animScale = prev.scale ?? 1;
          animOpacity = prev.opacity ?? 1;
          animRotation = prev.rotation ?? 0;
        } else if (relTime >= next.time) {
          // 마지막 키프레임 이후
          animOffsetX = next.x ?? 0;
          animOffsetY = next.y ?? 0;
          animScale = next.scale ?? 1;
          animOpacity = next.opacity ?? 1;
          animRotation = next.rotation ?? 0;
        } else {
          // 키프레임 사이 보간
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
      
      // 그룹 정렬 기준점 계산
      let anchorX = layer.x ?? 0;
      let anchorY = layer.y ?? 0;
      if (anchorX === 0 && layer.align === "center") anchorX = width / 2;
      else if (anchorX === 0 && layer.align === "right") anchorX = width;
      if (anchorY === 0 && layer.verticalAlign === "middle") anchorY = height / 2;
      else if (anchorY === 0 && layer.verticalAlign === "bottom") anchorY = height;

      const finalX = anchorX + animOffsetX;
      const finalY = anchorY + animOffsetY;
      const renderScale = (layer.scale ?? 1) * animScale;

      // 그룹 변환 적용
      ctx.save();
      ctx.translate(finalX, finalY);
      ctx.rotate(animRotation);
      ctx.scale(renderScale, renderScale);
      ctx.globalAlpha = animOpacity;
      

      // 그룹 내 자식 레이어들 렌더링
      if (Array.isArray(layer.children)) {
        layer.children.forEach(childLayer => {
          // 자식 레이어의 시간 설정 (그룹의 시작 시간 기준)
          childLayer._clipTime = currentTime - layer.start;
          
          // 그룹의 opacity를 자식 레이어에 적용
          const originalOpacity = childLayer.opacity;
          childLayer.opacity = (childLayer.opacity ?? 1) * animOpacity;
          
          
          // 자식 레이어 렌더링 (재귀 호출)
          renderLayer(childLayer, ctx, width, height, currentTime, setZoom);
          
          // 원래 opacity 복원
          childLayer.opacity = originalOpacity;
        });
      }

      ctx.restore();
    }

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true; // 비디오 렌더링을 위해 활성화
    ctx.imageSmoothingQuality = "high";

    // 캔버스 전체를 검정색으로 채우기
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    layerRects.current = [];

    // 렌더링 함수 (이미지 로드 시 다시 호출될 수 있도록)
    let needsRedraw = false;

    // 레이어 렌더링
    layers.forEach((layer, idx) => {
      if (layer.type === "text") return; // 텍스트는 나중에
      renderLayer(layer, ctx, canvasWidth, canvasHeight, currentTime, setZoom);
    });

    // 텍스트 레이어는 항상 맨 위에 그림
    layers.forEach((layer, idx) => {
      if (layer.type !== "text") return;
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
          animScale = (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * t;
          animOpacity = (prev.opacity ?? layer.opacity ?? 1) + ((next.opacity ?? layer.opacity ?? 1) - (prev.opacity ?? layer.opacity ?? 1)) * t;
          animRotation = (prev.rotation ?? 0) + ((next.rotation ?? 0) - (prev.rotation ?? 0)) * t;
        }
      } else {
        animOpacity = layer.opacity ?? 1;
      }

      // 정렬 기준점 계산
      let anchorX = x;
      let anchorY = y;
      if (anchorX === 0 && layer.align === "center") anchorX = canvasWidth / 2;
      else if (anchorX === 0 && layer.align === "right") anchorX = canvasWidth;
      if (anchorY === 0 && layer.verticalAlign === "middle") anchorY = canvasHeight / 2;
      else if (anchorY === 0 && layer.verticalAlign === "bottom") anchorY = canvasHeight;

      const finalX = anchorX + animOffsetX;
      const finalY = anchorY + animOffsetY;
      const renderScale = scale * animScale;

      // 줌과 팬 적용
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      // 텍스트 렌더링
      ctx.save();
      ctx.translate(finalX, finalY);
      ctx.rotate(animRotation);
      ctx.scale(renderScale, renderScale);
      ctx.globalAlpha = animOpacity;

      ctx.fillStyle = layer.color ?? "#fff";
      ctx.font = `${layer.fontWeight ?? "normal"} ${layer.fontSize ?? 24}px ${layer.fontFamily ?? "Arial"}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // 텍스트 그리기
      ctx.fillText(layer.text ?? "", 0, 0);

      ctx.restore();
      ctx.restore();

      // 레이어 클릭 영역 저장
      layerRects.current.push({
        layer,
        x: finalX,
        y: finalY,
        width: (layer.fontSize ?? 24) * renderScale,
        height: (layer.fontSize ?? 24) * renderScale,
      });
    });

    // 이미지 로드 완료 시 다시 그리기
    if (needsRedraw) {
      requestAnimationFrame(() => {
        // 이미지 로드 완료 시 다시 그리기
      });
    }
  }, [layers, currentTime, zoom, panX, panY]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom - panX;
    const y = (e.clientY - rect.top) / zoom - panY;

    setDragStart({ x, y });
    setIsDragging(true);

    // 레이어 클릭 검사
    const clickedLayer = layerRects.current.find((layerRect) => {
      const layerX = layerRect.x;
      const layerY = layerRect.y;
      const layerWidth = layerRect.width;
      const layerHeight = layerRect.height;

      return (
        x >= layerX - layerWidth / 2 &&
        x <= layerX + layerWidth / 2 &&
        y >= layerY - layerHeight / 2 &&
        y <= layerY + layerHeight / 2
      );
    });

    if (clickedLayer && onLayerClick) {
      onLayerClick(clickedLayer.layer);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom - panX;
    const y = (e.clientY - rect.top) / zoom - panY;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    // 팬 업데이트 (현재는 비활성화)
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom - panX;
      const y = (e.clientY - rect.top) / zoom - panY;

      // 더블 클릭 검사
      const clickedLayer = layerRects.current.find((layerRect) => {
        const layerX = layerRect.x;
        const layerY = layerRect.y;
        const layerWidth = layerRect.width;
        const layerHeight = layerRect.height;

        return (
          x >= layerX - layerWidth / 2 &&
          x <= layerX + layerWidth / 2 &&
          y >= layerY - layerHeight / 2 &&
          y <= layerY + layerHeight / 2
        );
      });

      if (clickedLayer && onLayerDoubleClick) {
        onLayerDoubleClick(clickedLayer.layer);
      }
    }
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    if (typeof setZoom === 'function') {
      setZoom(prevZoom => Math.max(0.1, Math.min(5, prevZoom * delta)));
    }
  };

  // wheel 이벤트를 passive: false로 설정
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const handleWheelPassive = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        if (typeof setZoom === 'function') {
          setZoom(prevZoom => Math.max(0.1, Math.min(5, prevZoom * delta)));
        }
      };

      canvas.addEventListener('wheel', handleWheelPassive, { passive: false });
      
      return () => {
        canvas.removeEventListener('wheel', handleWheelPassive);
      };
    }
  }, [setZoom]);

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          border: "1px solid #ccc",
        }}
      />
    </div>
  );
}