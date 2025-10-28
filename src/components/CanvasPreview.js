import React, { useRef, useEffect, useState } from "react";
import { EFFECT_MAP } from "../effects/effectUtils";
import { applyEasing } from "../utils/easingFunctions";
import { getLayerDuration } from "../utils/layerUtils";

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
  const videoRefs = useRef({});
  const layerRects = useRef([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasWidth = 1920;
  const canvasHeight = Math.round((canvasWidth * 9) / 16); // 1080

  // 레이어 렌더링 함수 (재귀 호출을 위해 분리)
  const renderLayer = (layer, ctx, width, height, currentTime, setZoom) => {
    const layerDuration = getLayerDuration(layer);
    if (
      currentTime < layer.start ||
      currentTime > layer.start + layerDuration
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
          // 마스크 애니메이션 처리
          let maskProps = {
            x: layer.mask.x ?? 0,
            y: layer.mask.y ?? 0,
            radius: layer.mask.radius ?? 100,
            radiusX: layer.mask.radiusX ?? 100,
            radiusY: layer.mask.radiusY ?? 100,
            width: layer.mask.width ?? 200,
            height: layer.mask.height ?? 200,
            progress: layer.mask.progress ?? 0,
            rotation: layer.mask.rotation ?? 0
          };

          if (Array.isArray(layer.mask.animation) && layer.mask.animation.length > 0) {
            const relTime = currentTime - layer.start;
            const maskAnim = layer.mask.animation;
            
            if (relTime <= maskAnim[0].time) {
              // 첫 번째 키프레임 이전
              maskProps = { ...maskProps, ...maskAnim[0] };
            } else if (relTime >= maskAnim[maskAnim.length - 1].time) {
              // 마지막 키프레임 이후
              maskProps = { ...maskProps, ...maskAnim[maskAnim.length - 1] };
            } else {
              // 키프레임 사이 보간
              let prev = maskAnim[0];
              let next = maskAnim[maskAnim.length - 1];
              
              for (let i = 1; i < maskAnim.length; i++) {
                if (maskAnim[i].time > relTime) {
                  next = maskAnim[i];
                  prev = maskAnim[i - 1];
                  break;
                }
              }
              
              const t = (relTime - prev.time) / (next.time - prev.time);
              
              // 각 속성 보간
              if (prev.x !== undefined && next.x !== undefined) {
                maskProps.x = prev.x + (next.x - prev.x) * t;
              }
              if (prev.y !== undefined && next.y !== undefined) {
                maskProps.y = prev.y + (next.y - prev.y) * t;
              }
              if (prev.radius !== undefined && next.radius !== undefined) {
                maskProps.radius = prev.radius + (next.radius - prev.radius) * t;
              }
              if (prev.radiusX !== undefined && next.radiusX !== undefined) {
                maskProps.radiusX = prev.radiusX + (next.radiusX - prev.radiusX) * t;
              }
              if (prev.radiusY !== undefined && next.radiusY !== undefined) {
                maskProps.radiusY = prev.radiusY + (next.radiusY - prev.radiusY) * t;
              }
              if (prev.width !== undefined && next.width !== undefined) {
                maskProps.width = prev.width + (next.width - prev.width) * t;
              }
              if (prev.height !== undefined && next.height !== undefined) {
                maskProps.height = prev.height + (next.height - prev.height) * t;
              }
              if (prev.progress !== undefined && next.progress !== undefined) {
                maskProps.progress = prev.progress + (next.progress - prev.progress) * t;
              }
              if (prev.rotation !== undefined && next.rotation !== undefined) {
                maskProps.rotation = prev.rotation + (next.rotation - prev.rotation) * t;
              }
            }
          }

          // 마스크 회전이 있으면 적용 (레이어 회전에 추가)
          if (maskProps.rotation !== 0) {
            ctx.rotate(maskProps.rotation);
          }

          ctx.beginPath();
          
          if (layer.mask.type === "circle") {
            ctx.arc(maskProps.x, maskProps.y, maskProps.radius, 0, Math.PI * 2);
          } else if (layer.mask.type === "ellipse") {
            ctx.ellipse(maskProps.x, maskProps.y, maskProps.radiusX, maskProps.radiusY, 0, 0, Math.PI * 2);
          } else if (layer.mask.type === "rect") {
            let maskX = maskProps.x - maskProps.width / 2;
            let maskY = maskProps.y - maskProps.height / 2;
            
            if (layer.mask.align === "left") maskX = maskProps.x;
            else if (layer.mask.align === "right") maskX = maskProps.x - maskProps.width;
            if (layer.mask.verticalAlign === "top") maskY = maskProps.y;
            else if (layer.mask.verticalAlign === "bottom") maskY = maskProps.y - maskProps.height;
            
            ctx.rect(maskX, maskY, maskProps.width, maskProps.height);
          } else if (layer.mask.type === "roundRect") {
            // 라운드 처리된 사각형
            let maskX = maskProps.x - maskProps.width / 2;
            let maskY = maskProps.y - maskProps.height / 2;
            
            if (layer.mask.align === "left") maskX = maskProps.x;
            else if (layer.mask.align === "right") maskX = maskProps.x - maskProps.width;
            if (layer.mask.verticalAlign === "top") maskY = maskProps.y;
            else if (layer.mask.verticalAlign === "bottom") maskY = maskProps.y - maskProps.height;
            
            const radius = maskProps.radius || layer.mask.borderRadius || 20;
            
            if (ctx.roundRect) {
              // 최신 브라우저의 roundRect API 사용
              ctx.roundRect(maskX, maskY, maskProps.width, maskProps.height, radius);
            } else {
              // 폴백: 수동으로 라운드 사각형 그리기
              const r = Math.min(radius, maskProps.width / 2, maskProps.height / 2);
              ctx.moveTo(maskX + r, maskY);
              ctx.lineTo(maskX + maskProps.width - r, maskY);
              ctx.arcTo(maskX + maskProps.width, maskY, maskX + maskProps.width, maskY + r, r);
              ctx.lineTo(maskX + maskProps.width, maskY + maskProps.height - r);
              ctx.arcTo(maskX + maskProps.width, maskY + maskProps.height, maskX + maskProps.width - r, maskY + maskProps.height, r);
              ctx.lineTo(maskX + r, maskY + maskProps.height);
              ctx.arcTo(maskX, maskY + maskProps.height, maskX, maskY + maskProps.height - r, r);
              ctx.lineTo(maskX, maskY + r);
              ctx.arcTo(maskX, maskY, maskX + r, maskY, r);
            }
          } else if (layer.mask.type === "horizontal") {
            // 좌우로 열림
            const halfWidth = (width * maskProps.progress) / 2;
            ctx.rect(-width / 2, -height / 2, halfWidth, height);
            ctx.rect(width / 2 - halfWidth, -height / 2, halfWidth, height);
          } else if (layer.mask.type === "vertical") {
            // 상하로 열림
            const halfHeight = (height * maskProps.progress) / 2;
            ctx.rect(-width / 2, -height / 2, width, halfHeight);
            ctx.rect(-width / 2, height / 2 - halfHeight, width, halfHeight);
          }
          
          // 마스크 색상 적용 (디버그용)
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
    } else if (layer.type === "effect") {
      // 이펙트 레이어 렌더링
      const effectType = layer.effectType;
      const effectFn = EFFECT_MAP[effectType];
      
      if (effectFn) {
        ctx.save();
        
        // 애니메이션 적용
        let animOpacity = 1;
        if (Array.isArray(layer.animation) && layer.animation.length > 1) {
          const relTime = layer._clipTime !== undefined ? layer._clipTime : currentTime - layer.start;
          
          let prev = layer.animation[0];
          let next = layer.animation[layer.animation.length - 1];
          
          if (relTime <= prev.time) {
            animOpacity = prev.opacity ?? 1;
          } else if (relTime >= next.time) {
            animOpacity = next.opacity ?? 1;
          } else {
            for (let i = 0; i < layer.animation.length - 1; i++) {
              const kf1 = layer.animation[i];
              const kf2 = layer.animation[i + 1];
              if (relTime >= kf1.time && relTime <= kf2.time) {
                const t = (relTime - kf1.time) / (kf2.time - kf1.time);
                const easedT = kf2.easing ? applyEasing(t, kf2.easing) : t;
                
                const opacity1 = kf1.opacity ?? 1;
                const opacity2 = kf2.opacity ?? 1;
                animOpacity = opacity1 + (opacity2 - opacity1) * easedT;
                break;
              }
            }
          }
        }
        
        ctx.globalAlpha = animOpacity * (layer.opacity ?? 1);
        
        // 이펙트 함수 호출
        effectFn(ctx, layer, currentTime, { width: canvasWidth, height: canvasHeight });
        
        ctx.restore();
      }
    } else if (layer.type === "video") {
      // 비디오 레이어 렌더링
      let video = videoRefs.current[layer.src];
      if (!video) {
        video = document.createElement("video");
        video.src = layer.src;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        
        // 모든 비디오에 이벤트 리스너 추가 (디버깅용)
        video.addEventListener('loadedmetadata', () => {
          console.log('Video metadata loaded:', layer.src, video.videoWidth, video.videoHeight, 'readyState:', video.readyState);
        });
        
        video.addEventListener('loadeddata', () => {
          console.log('Video data loaded:', layer.src, 'readyState:', video.readyState);
        });
        
        video.addEventListener('canplay', () => {
          console.log('Video canplay:', layer.src, 'readyState:', video.readyState);
        });
        
        video.addEventListener('error', (e) => {
          console.error('Video error:', layer.src, e, video.error);
        });
        
        video.load();
        videoRefs.current[layer.src] = video;
      }

      // 비디오가 로드되었는지 확인
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;

      if (videoW && videoH) {
        // 디버깅: 비디오 로드 상태 확인
        if (layer.src.includes('transparent')) {
          console.log('Transparent video:', {
            src: layer.src,
            width: videoW,
            height: videoH,
            readyState: video.readyState,
            duration: video.duration,
            currentTime: video.currentTime,
            targetTime: Math.max(0, currentTime - layer.start),
            isRendering: Math.max(0, currentTime - layer.start) < video.duration
          });
        }
        // 비디오 현재 시간 설정
        const targetTime = Math.max(0, currentTime - layer.start);
        
        // 비디오 duration 확인
        const videoDuration = video.duration || Infinity;
        
        // 현재 비디오 시간과 목표 시간의 차이가 클 때만 업데이트
        // 0.1초 차이는 프레임 단위로 충분히 부드럽게 보임
        if (targetTime < videoDuration && Math.abs(video.currentTime - targetTime) > 0.1) {
          video.currentTime = targetTime;
        }
        
        // 목표 시간이 비디오 길이를 넘어가면 그냥 마지막 프레임 유지
        if (targetTime >= videoDuration) {
          // 비디오의 마지막 프레임 유지
          if (Math.abs(video.currentTime - (videoDuration - 0.1)) > 0.1) {
            video.currentTime = videoDuration - 0.1;
          }
        }

        // 비디오 스케일 계산
        let baseScale = scale;
        if (layer.scaleMode === "fit") {
          baseScale = Math.min(width / videoW, height / videoH);
        } else if (layer.scaleMode === "cover") {
          baseScale = Math.max(width / videoW, height / videoH);
        }
        
        const renderScale = baseScale * animScale;

        // 정렬
        let anchorX = x;
        let anchorY = y;
        if (anchorX === 0 && layer.align === "center") anchorX = width / 2;
        else if (anchorX === 0 && layer.align === "right") anchorX = width;
        if (anchorY === 0 && layer.verticalAlign === "middle") anchorY = height / 2;
        else if (anchorY === 0 && layer.verticalAlign === "bottom") anchorY = height;

        const finalX = anchorX + animOffsetX;
        const finalY = anchorY + animOffsetY;

        // 그리기
        ctx.save();
        
        ctx.globalAlpha = animOpacity * (layer.opacity ?? 1);
        ctx.translate(finalX, finalY);
        ctx.rotate(animRotation);
        ctx.scale(renderScale, renderScale);
        
        const drawX = layer.align === "center" ? -videoW / 2 : (layer.align === "right" ? -videoW : 0);
        const drawY = layer.verticalAlign === "middle" ? -videoH / 2 : (layer.verticalAlign === "bottom" ? -videoH : 0);

        // 이미지 스무딩 설정 (알파 채널 렌더링 품질 향상)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        // transparent 파일인 경우 chromakey 처리
        if (layer.src.includes('transparent')) {
          // 임시 캔버스에 그리기
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = videoW;
          tempCanvas.height = videoH;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.drawImage(video, 0, 0, videoW, videoH);
          
          // 이미지 데이터 가져오기
          const imageData = tempCtx.getImageData(0, 0, videoW, videoH);
          const data = imageData.data;
          
          // 검정색을 투명하게 만들기
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 검정색에 가까운 픽셀을 투명하게 (threshold: 80)
            // 더 넓은 범위의 검정색을 제거
            if (r < 80 && g < 80 && b < 80) {
              data[i + 3] = 0; // alpha를 0으로
            }
          }
          
          // 수정된 이미지 데이터를 다시 캔버스에 그리기
          tempCtx.putImageData(imageData, 0, 0);
          ctx.drawImage(tempCanvas, drawX, drawY, videoW, videoH);
        } else {
          ctx.drawImage(video, drawX, drawY, videoW, videoH);
        }
        ctx.restore();
      }
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
      if (layer.type === "video") return; // 비디오는 나중에 (애니메이션 적용 전)
      renderLayer(layer, ctx, canvasWidth, canvasHeight, currentTime, setZoom);
    });

    // 비디오 레이어 렌더링 (이미지 뒤)
    layers.forEach((layer, idx) => {
      if (layer.type === "video") {
        renderLayer(layer, ctx, canvasWidth, canvasHeight, currentTime, setZoom);
      }
    });

    // 텍스트 레이어는 항상 맨 위에 그림
    layers.forEach((layer, idx) => {
      if (layer.type !== "text") return;
      const layerDuration = getLayerDuration(layer);
      if (
        currentTime < layer.start ||
        currentTime > layer.start + layerDuration
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