// src/components/PropertyBox.js
import React, { useState, useRef, useEffect } from "react";

export default function PropertyBox({
  layer,
  selectedLayerIndex,
  allLayers,
  clips,
  audioSrc,
  onChange,
  selectedClipId, // 선택된 클립 ID 추가
  onClipLayerChange, // 클립의 레이어 변경 핸들러 추가
  adminMode = false, // 관리자 모드 플래그 (기본값: 유저 모드)
}) {
  console.log('PropertyBox 렌더링:', {
    selectedClipId,
    selectedLayerIndex,
    clips: clips?.length,
    layer: layer?.type,
    adminMode
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState(null); // 'move', 'resize-left', 'resize-right', 'resize-top', 'resize-bottom'
  const previewRef = useRef(null);

  // 마우스 이벤트 리스너 추가 - 항상 호출되도록 수정
  useEffect(() => {
    if (isDragging) {
      const handleDragMove = (e) => {
        if (!layer?.crop) return;

        const rect = previewRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;

        // 픽셀을 퍼센트로 변환
        const percentX = (deltaX / rect.width) * 100;
        const percentY = (deltaY / rect.height) * 100;

        const crop = { ...layer.crop };

        switch (dragType) {
          case "move":
            // 전체 박스 이동
            crop.x = Math.max(0, Math.min(100 - crop.width, crop.x + percentX));
            crop.y = Math.max(
              0,
              Math.min(100 - crop.height, crop.y + percentY)
            );
            break;
          case "resize-left":
            // 왼쪽 경계 조절
            const newLeft = crop.x + percentX;
            const newWidth = crop.width - percentX;
            if (newWidth > 10 && newLeft >= 0) {
              crop.x = newLeft;
              crop.width = newWidth;
            }
            break;
          case "resize-right":
            // 오른쪽 경계 조절
            const newRightWidth = crop.width + percentX;
            if (newRightWidth > 10 && crop.x + newRightWidth <= 100) {
              crop.width = newRightWidth;
            }
            break;
          case "resize-top":
            // 위쪽 경계 조절
            const newTop = crop.y + percentY;
            const newHeight = crop.height - percentY;
            if (newHeight > 10 && newTop >= 0) {
              crop.y = newTop;
              crop.height = newHeight;
            }
            break;
          case "resize-bottom":
            // 아래쪽 경계 조절
            const newBottomHeight = crop.height + percentY;
            if (newBottomHeight > 10 && crop.y + newBottomHeight <= 100) {
              crop.height = newBottomHeight;
            }
            break;
        }

        onChange({ ...layer, crop });
        setDragStart({ x, y });
      };

      const handleDragEnd = () => {
        setIsDragging(false);
        setDragType(null);
      };

      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);

      return () => {
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [isDragging, dragType, layer, dragStart, onChange]);

  const handleChange = (property, value) => {
    onChange({ ...layer, [property]: value });
  };

  // 드래그 시작
  const handleDragStart = (e, type) => {
    e.preventDefault();
    setIsDragging(true);
    setDragType(type);

    const rect = previewRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDragStart({ x, y });
    }
  };

  // 선택된 클립 찾기
  const selectedClip = selectedClipId 
    ? clips.find(clip => clip.id === selectedClipId) 
    : null;

  // 레이어에서 모든 이미지를 찾는 함수 (재귀적으로)
  const findAllImages = (layers) => {
    const images = [];
    
    if (!Array.isArray(layers)) {
      console.warn('layers가 배열이 아닙니다:', layers);
      return images;
    }
    
    const processLayer = (layer, layerIndex, parentPath = []) => {
      console.log(`레이어 ${layerIndex} 처리 중:`, layer.type, layer);
      
      // image 타입: src 속성
      if (layer.type === 'image' && layer.src) {
        console.log(`이미지 발견 (레이어 ${layerIndex}):`, layer.src);
        images.push({
          layerIndex,
          parentPath,
          childPath: null,
          imageKey: 'src',
          imageSrc: layer.src,
          label: `이미지 (${layer.name || 'image'})`
        });
      }
      
      // shape 타입: imageSrc 속성
      if (layer.type === 'shape' && layer.imageSrc) {
        console.log(`도형 이미지 발견 (레이어 ${layerIndex}):`, layer.imageSrc);
        images.push({
          layerIndex,
          parentPath,
          childPath: null,
          imageKey: 'imageSrc',
          imageSrc: layer.imageSrc,
          label: `도형 이미지 (${layer.shapeType || 'shape'})`
        });
      }
      
      // group 타입: children 배열 안의 이미지들
      if (layer.type === 'group') {
        console.log(`그룹 발견 (레이어 ${layerIndex}):`, layer);
        console.log('children 확인:', layer.children);
        
        if (Array.isArray(layer.children) && layer.children.length > 0) {
          console.log(`그룹 내 children 개수: ${layer.children.length}`);
          
          layer.children.forEach((child, childIndex) => {
            console.log(`  Child ${childIndex}:`, child.type, child);
            
            if (child.type === 'image' && child.src) {
              console.log(`    그룹 내 이미지 발견:`, child.src);
              images.push({
                layerIndex,
                parentPath,
                childPath: childIndex,
                imageKey: 'src',
                imageSrc: child.src,
                label: `그룹 > 이미지 ${childIndex + 1}`
              });
            }
            
            if (child.type === 'shape' && child.imageSrc) {
              console.log(`    그룹 내 도형 이미지 발견:`, child.imageSrc);
              images.push({
                layerIndex,
                parentPath,
                childPath: childIndex,
                imageKey: 'imageSrc',
                imageSrc: child.imageSrc,
                label: `그룹 > 도형 이미지 ${childIndex + 1}`
              });
            }
          });
        } else {
          console.warn('children이 배열이 아니거나 비어있습니다');
        }
      }
    };
    
    layers.forEach((layer, index) => {
      processLayer(layer, index);
    });
    
    console.log('최종 찾은 이미지들:', images);
    return images;
  };

  // 텍스트를 찾는 함수 (group 내부도 포함)
  const findAllTexts = (layers) => {
    const texts = [];
    
    layers.forEach((layer, layerIndex) => {
      if (layer.type === 'text') {
        texts.push({
          layerIndex,
          childPath: null,
          text: layer.text,
          label: `텍스트`
        });
      }
      
      // group 안의 텍스트도 찾기
      if (layer.type === 'group' && Array.isArray(layer.children)) {
        layer.children.forEach((child, childIndex) => {
          if (child.type === 'text') {
            texts.push({
              layerIndex,
              childPath: childIndex,
              text: child.text,
              label: `그룹 > 텍스트 ${childIndex + 1}`
            });
          }
        });
      }
    });
    
    return texts;
  };

  // 클립이 선택되었고 유저 모드일 때는 클립 편집 UI 표시
  if (selectedClip && !adminMode) {
    // 디버깅: 클립 레이어 구조 확인
    console.log('선택된 클립:', selectedClip);
    console.log('클립 레이어들:', selectedClip.layers);
    
    const allImages = findAllImages(selectedClip.layers);
    const allTexts = findAllTexts(selectedClip.layers);
    
    console.log('찾은 이미지들:', allImages);
    console.log('찾은 텍스트들:', allTexts);

    const handleClipImageUpload = (imageInfo, file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newLayers = [...selectedClip.layers];
        const { layerIndex, childPath, imageKey } = imageInfo;
        
        if (childPath !== null) {
          // group 안의 이미지
          const newChildren = [...newLayers[layerIndex].children];
          newChildren[childPath] = {
            ...newChildren[childPath],
            [imageKey]: ev.target.result
          };
          newLayers[layerIndex] = {
            ...newLayers[layerIndex],
            children: newChildren
          };
        } else {
          // 최상위 레이어의 이미지
          newLayers[layerIndex] = {
            ...newLayers[layerIndex],
            [imageKey]: ev.target.result
          };
        }
        
        onClipLayerChange && onClipLayerChange(selectedClipId, newLayers);
      };
      reader.readAsDataURL(file);
    };

    const handleClipTextChange = (textInfo, newText) => {
      const newLayers = [...selectedClip.layers];
      const { layerIndex, childPath } = textInfo;
      
      if (childPath !== null) {
        // group 안의 텍스트
        const newChildren = [...newLayers[layerIndex].children];
        newChildren[childPath] = {
          ...newChildren[childPath],
          text: newText
        };
        newLayers[layerIndex] = {
          ...newLayers[layerIndex],
          children: newChildren
        };
      } else {
        // 최상위 레이어의 텍스트
        newLayers[layerIndex] = {
          ...newLayers[layerIndex],
          text: newText
        };
      }
      
      onClipLayerChange && onClipLayerChange(selectedClipId, newLayers);
    };

    return (
      <div className="property-box user-mode">
        <h4>클립 편집: {selectedClip.name}</h4>
        
        {/* 이미지 편집 섹션 */}
        {allImages.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
            <h5 style={{ marginBottom: '10px', color: '#333' }}>📷 이미지 변경</h5>
            {allImages.map((imageInfo, idx) => (
              <div key={`img-${idx}`} style={{ marginBottom: '15px', padding: '10px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  {imageInfo.label}
                </label>
                {imageInfo.imageSrc && (
                  <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                    <img 
                      src={imageInfo.imageSrc} 
                      alt="미리보기" 
                      style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById(`clip-img-upload-${idx}`).click();
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  🖼️ 이미지 변경
                </button>
                <input
                  id={`clip-img-upload-${idx}`}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleClipImageUpload(imageInfo, e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* 텍스트 편집 섹션 */}
        {allTexts.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
            <h5 style={{ marginBottom: '10px', color: '#333' }}>✏️ 텍스트 수정</h5>
            {allTexts.map((textInfo, idx) => (
              <div key={`text-${idx}`} style={{ marginBottom: '15px', padding: '10px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  {textInfo.label}
                </label>
                <input
                  type="text"
                  value={textInfo.text || ''}
                  onChange={(e) => handleClipTextChange(textInfo, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="텍스트를 입력하세요"
                />
              </div>
            ))}
          </div>
        )}

        {allImages.length === 0 && allTexts.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            이 클립에는 수정 가능한 이미지나 텍스트가 없습니다.
          </div>
        )}

        <div style={{ marginTop: '20px', padding: '10px', background: '#fff3cd', borderRadius: '5px', fontSize: '12px', color: '#856404' }}>
          💡 이미지를 변경하거나 텍스트를 수정하면 즉시 반영됩니다.
        </div>
      </div>
    );
  }

  // 레이어가 선택되지 않았으면 null 반환
  if (!layer) return null;
  const maxFrame = 515;
  
  // 유저 모드이고 레이어가 선택된 경우 간소화된 UI 표시
  if (!adminMode && layer) {
    // 그룹 타입인 경우 그룹 안의 이미지들을 찾기
    const isGroup = layer.type === 'group';
    const groupImages = isGroup ? findAllImages([layer]) : [];
    const groupTexts = isGroup ? findAllTexts([layer]) : [];
    
    const hasImage = layer.type === 'image' && layer.src;
    const hasShapeImage = layer.type === 'shape' && layer.imageSrc;
    const hasText = layer.type === 'text';

    return (
      <div className="property-box user-mode">
        <h4>레이어 편집: {layer.type === 'group' ? '그룹' : layer.type}</h4>
        
        {/* 그룹 레이어 - 그룹 안의 모든 이미지 */}
        {isGroup && groupImages.length > 0 && (
          <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
            <h5 style={{ marginBottom: '10px', color: '#333' }}>📷 그룹 내 이미지 변경</h5>
            {groupImages.map((imageInfo, idx) => (
              <div key={`group-img-${idx}`} style={{ marginBottom: '15px', padding: '10px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  {imageInfo.label}
                </label>
                {imageInfo.imageSrc && (
                  <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                    <img 
                      src={imageInfo.imageSrc} 
                      alt="미리보기" 
                      style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById(`group-img-upload-${idx}`).click();
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  🖼️ 이미지 변경
                </button>
                <input
                  id={`group-img-upload-${idx}`}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      // Base64 대신 ObjectURL 사용 (메모리 효율적)
                      const imageUrl = URL.createObjectURL(file);
                      
                      // 그룹 내 children 업데이트
                      const newChildren = [...layer.children];
                      newChildren[imageInfo.childPath] = {
                        ...newChildren[imageInfo.childPath],
                        [imageInfo.imageKey]: imageUrl
                      };
                      handleChange('children', newChildren);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* 그룹 레이어 - 그룹 안의 모든 텍스트 */}
        {isGroup && groupTexts.length > 0 && (
          <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
            <h5 style={{ marginBottom: '10px', color: '#333' }}>✏️ 그룹 내 텍스트 수정</h5>
            {groupTexts.map((textInfo, idx) => (
              <div key={`group-text-${idx}`} style={{ marginBottom: '15px', padding: '10px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  {textInfo.label}
                </label>
                <input
                  type="text"
                  value={textInfo.text || ''}
                  onChange={(e) => {
                    // 그룹 내 children 업데이트
                    const newChildren = [...layer.children];
                    newChildren[textInfo.childPath] = {
                      ...newChildren[textInfo.childPath],
                      text: e.target.value
                    };
                    handleChange('children', newChildren);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="텍스트를 입력하세요"
                />
              </div>
            ))}
          </div>
        )}

        {/* 단일 이미지 레이어 (image 타입) */}
        {hasImage && (
          <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
            <h5 style={{ marginBottom: '10px', color: '#333' }}>📷 이미지 변경</h5>
            {layer.src && (
              <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                <img 
                  src={layer.src} 
                  alt="미리보기" 
                  style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                document.getElementById('layer-img-upload').click();
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🖼️ 이미지 변경
            </button>
            <input
              id="layer-img-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  // ObjectURL 사용 (메모리 효율적)
                  const imageUrl = URL.createObjectURL(file);
                  handleChange('src', imageUrl);
                  e.target.value = '';
                }
              }}
            />
          </div>
        )}

        {/* 도형 이미지 레이어 (shape 타입) */}
        {hasShapeImage && (
          <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
            <h5 style={{ marginBottom: '10px', color: '#333' }}>📷 도형 이미지 변경</h5>
            {layer.imageSrc && (
              <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                <img 
                  src={layer.imageSrc} 
                  alt="미리보기" 
                  style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                document.getElementById('layer-shape-img-upload').click();
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🖼️ 이미지 변경
            </button>
            <input
              id="layer-shape-img-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  // ObjectURL 사용 (메모리 효율적)
                  const imageUrl = URL.createObjectURL(file);
                  handleChange('imageSrc', imageUrl);
                  e.target.value = '';
                }
              }}
            />
          </div>
        )}

        {/* 텍스트 레이어 */}
        {hasText && (
          <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
            <h5 style={{ marginBottom: '10px', color: '#333' }}>✏️ 텍스트 수정</h5>
            <input
              type="text"
              value={layer.text || ''}
              onChange={(e) => handleChange('text', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
              placeholder="텍스트를 입력하세요"
            />
          </div>
        )}

        {!hasImage && !hasShapeImage && !hasText && !isGroup && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            이 레이어는 유저 모드에서 수정할 수 없습니다.
          </div>
        )}

        {isGroup && groupImages.length === 0 && groupTexts.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            이 그룹에는 수정 가능한 이미지나 텍스트가 없습니다.
          </div>
        )}
      </div>
    );
  }

  // 관리자 모드 - 기존 UI
  // 공통 속성

  // 애니메이션 속성 변경 핸들러
  const handleAnimChange = (key, value) => {
    onChange({
      ...layer,
      animation: {
        ...layer.animation,
        [key]: value,
      },
    });
  };

  // 저장하기 기능
  const handleSaveProject = () => {
    const projectData = {
      name:
        "프로젝트_" + new Date().toISOString().slice(0, 19).replace(/:/g, "-"),
      layers: allLayers,
      clips: clips,
      audioSrc: audioSrc,
      createdAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(projectData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectData.name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveLayer = () => {
    if (!layer || selectedLayerIndex === null) {
      alert("저장할 레이어를 선택해주세요.");
      return;
    }

    const layerData = {
      name: `레이어_${selectedLayerIndex}_${layer.type || "unknown"}`,
      layer: layer,
      layerIndex: selectedLayerIndex,
      savedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(layerData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${layerData.name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="property-box">
      <h4>속성 편집</h4>
      <div>
        <label>
          시작 시간:
          <input
            type="number"
            value={layer.start}
            onChange={(e) => handleChange("start", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          지속 시간:
          <input
            type="number"
            value={layer.duration}
            onChange={(e) => handleChange("duration", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          시작 X:
          <input
            type="number"
            value={layer.x ?? ""}
            onChange={(e) => handleChange("x", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          시작 Y:
          <input
            type="number"
            value={layer.y ?? ""}
            onChange={(e) => handleChange("y", Number(e.target.value))}
          />
        </label>
      </div>
      {/* 타입별 속성 분기 */}
      {layer.type === "text" && (
        <>
          <div>
            <label>
              텍스트:
              <input
                type="text"
                value={layer.text}
                onChange={(e) => handleChange("text", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              색상:
              <input
                type="color"
                value={layer.color || "#ffffff"}
                onChange={(e) => handleChange("color", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              폰트 크기:
              <input
                type="number"
                min={8}
                max={200}
                value={layer.fontSize || 30}
                onChange={(e) =>
                  handleChange("fontSize", Number(e.target.value))
                }
                style={{ width: 60 }}
              />{" "}
              px
            </label>
          </div>
          <div>
            <label>
              글꼴:
              <select
                value={layer.fontFamily || "Arial"}
                onChange={(e) => handleChange("fontFamily", e.target.value)}
              >
                <option value="Arial">Arial</option>
                <option value="Verdana">Verdana</option>
                <option value="궁서">궁서</option>
              </select>
            </label>
          </div>
        </>
      )}
      {/* 타입별 속성 분기 */}
      {layer.type === "image" && (
        <>
          <div>
            <label>
              시작 Scale:
              <input
                type="number"
                step="0.01"
                value={layer.scale ?? 1}
                onChange={(e) => handleChange("scale", Number(e.target.value))}
              />
            </label>
          </div>
          {/* 이미지 변경 버튼과 파일 업로드 input */}
          <div>
            <label>
              이미지 URL:
              <input
                type="text"
                value={layer.src}
                onChange={(e) => handleChange("src", e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              document.getElementById("img-upload-propertybox").click();
            }}
          >
            이미지 변경
          </button>
          <input
            id="img-upload-propertybox"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (ev) => {
                  handleChange("src", ev.target.result);
                };
                reader.readAsDataURL(file);
              }
            }}
          />

          {/* 크롭 설정 */}
          <div
            style={{
              marginTop: "10px",
              border: "1px solid #ccc",
              padding: "10px",
            }}
          >
            <h5>이미지 크롭</h5>

            {/* 크롭 미리보기 */}
            <div
              style={{
                marginBottom: "10px",
                textAlign: "center",
                border: "1px solid #ddd",
                padding: "5px",
              }}
            >
              <div style={{ fontSize: "12px", marginBottom: "5px" }}>
                크롭 미리보기 (드래그 가능)
              </div>
              <div
                ref={previewRef}
                style={{
                  width: "100px",
                  height: "60px",
                  border: "2px solid #333",
                  position: "relative",
                  margin: "0 auto",
                  backgroundColor: "#f0f0f0",
                  cursor: isDragging ? "grabbing" : "grab",
                }}
              >
                {layer.crop && (
                  <>
                    {/* 메인 crop 박스 */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${layer.crop.x}%`,
                        top: `${layer.crop.y}%`,
                        width: `${layer.crop.width}%`,
                        height: `${layer.crop.height}%`,
                        border: "2px solid #007bff",
                        backgroundColor: "rgba(0, 123, 255, 0.3)",
                        boxSizing: "border-box",
                        cursor: "move",
                      }}
                      onMouseDown={(e) => handleDragStart(e, "move")}
                    ></div>

                    {/* 리사이즈 핸들들 */}
                    {/* 왼쪽 */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${layer.crop.x - 2}%`,
                        top: `${layer.crop.y}%`,
                        width: "4px",
                        height: `${layer.crop.height}%`,
                        backgroundColor: "#007bff",
                        cursor: "ew-resize",
                      }}
                      onMouseDown={(e) => handleDragStart(e, "resize-left")}
                    ></div>

                    {/* 오른쪽 */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${layer.crop.x + layer.crop.width - 2}%`,
                        top: `${layer.crop.y}%`,
                        width: "4px",
                        height: `${layer.crop.height}%`,
                        backgroundColor: "#007bff",
                        cursor: "ew-resize",
                      }}
                      onMouseDown={(e) => handleDragStart(e, "resize-right")}
                    ></div>

                    {/* 위쪽 */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${layer.crop.x}%`,
                        top: `${layer.crop.y - 2}%`,
                        width: `${layer.crop.width}%`,
                        height: "4px",
                        backgroundColor: "#007bff",
                        cursor: "ns-resize",
                      }}
                      onMouseDown={(e) => handleDragStart(e, "resize-top")}
                    ></div>

                    {/* 아래쪽 */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${layer.crop.x}%`,
                        top: `${layer.crop.y + layer.crop.height - 2}%`,
                        width: `${layer.crop.width}%`,
                        height: "4px",
                        backgroundColor: "#007bff",
                        cursor: "ns-resize",
                      }}
                      onMouseDown={(e) => handleDragStart(e, "resize-bottom")}
                    ></div>
                  </>
                )}
              </div>
              <div
                style={{ fontSize: "10px", marginTop: "5px", color: "#666" }}
              >
                {layer.crop
                  ? `X: ${layer.crop.x}%, Y: ${layer.crop.y}%, W: ${layer.crop.width}%, H: ${layer.crop.height}%`
                  : "크롭 없음"}
              </div>
            </div>

            {/* 좌우 크롭 */}
            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  fontSize: "12px",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                좌우 크롭 (Left/Right)
              </label>
              <div
                style={{ display: "flex", gap: "5px", alignItems: "center" }}
              >
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={layer.crop?.x ?? 0}
                  onChange={(e) => {
                    const crop = layer.crop || {
                      x: 0,
                      y: 0,
                      width: 100,
                      height: 100,
                    };
                    const cropAmount = Number(e.target.value);
                    // 좌우 양쪽에서 cropAmount만큼씩 자르기
                    handleChange("crop", {
                      ...crop,
                      x: cropAmount,
                      width: 100 - cropAmount * 2,
                    });
                  }}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: "11px", minWidth: "30px" }}>
                  {layer.crop?.x ?? 0}%
                </span>
              </div>
            </div>

            {/* 상하 크롭 */}
            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  fontSize: "12px",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                상하 크롭 (Top/Bottom)
              </label>
              <div
                style={{ display: "flex", gap: "5px", alignItems: "center" }}
              >
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={layer.crop?.y ?? 0}
                  onChange={(e) => {
                    const crop = layer.crop || {
                      x: 0,
                      y: 0,
                      width: 100,
                      height: 100,
                    };
                    const cropAmount = Number(e.target.value);
                    // 상하 양쪽에서 cropAmount만큼씩 자르기
                    handleChange("crop", {
                      ...crop,
                      y: cropAmount,
                      height: 100 - cropAmount * 2,
                    });
                  }}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: "11px", minWidth: "30px" }}>
                  {layer.crop?.y ?? 0}%
                </span>
              </div>
            </div>

            {/* 개별 조절 */}
            <div
              style={{
                borderTop: "1px solid #ddd",
                paddingTop: "10px",
                fontSize: "12px",
              }}
            >
              <div style={{ marginBottom: "5px", fontWeight: "bold" }}>
                개별 조절
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "5px",
                  marginBottom: "5px",
                }}
              >
                <div>
                  <label>Left:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={layer.crop?.x ?? 0}
                    onChange={(e) => {
                      const crop = layer.crop || {
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 100,
                      };
                      const newX = Number(e.target.value);
                      const newWidth = Math.max(
                        0,
                        crop.width - (newX - crop.x)
                      );
                      handleChange("crop", {
                        ...crop,
                        x: newX,
                        width: newWidth,
                      });
                    }}
                    style={{ width: "50px", marginLeft: "5px" }}
                  />
                </div>
                <div>
                  <label>Right:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={
                      100 - ((layer.crop?.x ?? 0) + (layer.crop?.width ?? 100))
                    }
                    onChange={(e) => {
                      const crop = layer.crop || {
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 100,
                      };
                      const rightMargin = Number(e.target.value);
                      const newWidth = 100 - crop.x - rightMargin;
                      handleChange("crop", {
                        ...crop,
                        width: Math.max(0, newWidth),
                      });
                    }}
                    style={{ width: "50px", marginLeft: "5px" }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "5px",
                }}
              >
                <div>
                  <label>Top:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={layer.crop?.y ?? 0}
                    onChange={(e) => {
                      const crop = layer.crop || {
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 100,
                      };
                      const newY = Number(e.target.value);
                      const newHeight = Math.max(
                        0,
                        crop.height - (newY - crop.y)
                      );
                      handleChange("crop", {
                        ...crop,
                        y: newY,
                        height: newHeight,
                      });
                    }}
                    style={{ width: "50px", marginLeft: "5px" }}
                  />
                </div>
                <div>
                  <label>Bottom:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={
                      100 - ((layer.crop?.y ?? 0) + (layer.crop?.height ?? 100))
                    }
                    onChange={(e) => {
                      const crop = layer.crop || {
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 100,
                      };
                      const bottomMargin = Number(e.target.value);
                      const newHeight = 100 - crop.y - bottomMargin;
                      handleChange("crop", {
                        ...crop,
                        height: Math.max(0, newHeight),
                      });
                    }}
                    style={{ width: "50px", marginLeft: "5px" }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (layer.crop) {
                  handleChange("crop", null);
                } else {
                  handleChange("crop", { x: 0, y: 0, width: 100, height: 100 });
                }
              }}
              style={{
                marginTop: "10px",
                width: "100%",
                padding: "5px",
                backgroundColor: layer.crop ? "#dc3545" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              {layer.crop ? "크롭 해제" : "크롭 활성화"}
            </button>
          </div>
        </>
      )}
      {(layer.type === "image" || layer.type === "text") && (
        <>
          <div>
            <label>애니메이션 키프레임:</label>
            {Array.isArray(layer.animation) && layer.animation.length > 0 ? (
              <div className="keyframes-list">
                {layer.animation.map((kf, idx) => (
                  <div key={idx} className="keyframe-row">
                    <span>
                      time:
                      <input
                        type="number"
                        min={0}
                        max={layer.duration}
                        value={kf.time}
                        onChange={(e) => {
                          const newAnim = [...layer.animation];
                          newAnim[idx] = {
                            ...newAnim[idx],
                            time: Number(e.target.value),
                          };
                          handleChange("animation", newAnim);
                        }}
                        style={{ width: 50 }}
                      />
                    </span>
                    <span>
                      x:
                      <input
                        type="number"
                        value={kf.x}
                        onChange={(e) => {
                          const newAnim = [...layer.animation];
                          newAnim[idx] = {
                            ...newAnim[idx],
                            x: Number(e.target.value),
                          };
                          handleChange("animation", newAnim);
                        }}
                        style={{ width: 50 }}
                      />
                    </span>
                    <span>
                      y:
                      <input
                        type="number"
                        value={kf.y}
                        onChange={(e) => {
                          const newAnim = [...layer.animation];
                          newAnim[idx] = {
                            ...newAnim[idx],
                            y: Number(e.target.value),
                          };
                          handleChange("animation", newAnim);
                        }}
                        style={{ width: 50 }}
                      />
                    </span>
                    <span>
                      scale:
                      <input
                        type="number"
                        step="0.01"
                        value={kf.scale}
                        onChange={(e) => {
                          const newAnim = [...layer.animation];
                          newAnim[idx] = {
                            ...newAnim[idx],
                            scale: Number(e.target.value),
                          };
                          handleChange("animation", newAnim);
                        }}
                        style={{ width: 50 }}
                      />
                    </span>
                    <span>
                      opacity:
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={1}
                        value={kf.opacity ?? 1}
                        onChange={(e) => {
                          const newAnim = [...layer.animation];
                          newAnim[idx] = {
                            ...newAnim[idx],
                            opacity: Number(e.target.value),
                          };
                          handleChange("animation", newAnim);
                        }}
                        style={{ width: 50 }}
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newAnim = layer.animation.filter(
                          (_, i) => i !== idx
                        );
                        handleChange("animation", newAnim);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const last = layer.animation[
                      layer.animation.length - 1
                    ] || { time: 0, x: 0, y: 0, scale: 1 };
                    const newKF = {
                      ...last,
                      time: Math.min((last.time ?? 0) + 1, layer.duration),
                    };
                    handleChange("animation", [...layer.animation, newKF]);
                  }}
                >
                  키프레임 추가
                </button>
              </div>
            ) : (
              <div>
                <span>애니메이션 없음</span>
                <button
                  type="button"
                  onClick={() =>
                    handleChange("animation", [
                      { time: 0, x: 0, y: 0, scale: 1 },
                    ])
                  }
                >
                  첫 키프레임 추가
                </button>
              </div>
            )}
          </div>
          <div>
            <label>
              가로 정렬:
              <select
                value={layer.align || "left"}
                onChange={(e) => handleChange("align", e.target.value)}
              >
                <option value="left">왼쪽</option>
                <option value="center">가운데</option>
                <option value="right">오른쪽</option>
              </select>
            </label>
          </div>
          <div>
            <label>
              세로 정렬:
              <select
                value={layer.verticalAlign || "top"}
                onChange={(e) => handleChange("verticalAlign", e.target.value)}
              >
                <option value="top">위</option>
                <option value="middle">중앙</option>
                <option value="bottom">아래</option>
              </select>
            </label>
          </div>
        </>
      )}
      {layer.type === "effect" && (
        <>
          <div>
            <label>이펙트 타입: {layer.effectType}</label>
          </div>

          {/* 프레임 시퀀스 전용 속성 */}
          {layer.effectType === "frameSequence" && (
            <>
              <div>
                <label>
                  FPS:
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={layer.fps || 30}
                    onChange={(e) =>
                      handleChange("fps", Number(e.target.value))
                    }
                    style={{ width: 60 }}
                  />
                </label>
              </div>
              <div>
                <label>
                  시작 프레임:
                  <input
                    type="number"
                    min={1}
                    max={maxFrame}
                    value={layer.startFrame || 1}
                    onChange={(e) =>
                      handleChange("startFrame", Number(e.target.value))
                    }
                    style={{ width: 60 }}
                  />
                </label>
              </div>
              <div>
                <label>
                  끝 프레임:
                  <input
                    type="number"
                    min={1}
                    max={maxFrame}
                    value={layer.endFrame || maxFrame}
                    onChange={(e) =>
                      handleChange("endFrame", Number(e.target.value))
                    }
                    style={{ width: 60 }}
                  />
                </label>
              </div>
              <div>
                <label>
                  반복:
                  <select
                    value={layer.loop || "once"}
                    onChange={(e) => handleChange("loop", e.target.value)}
                  >
                    <option value="once">한 번</option>
                    <option value="loop">반복</option>
                    <option value="pingpong">왕복</option>
                  </select>
                </label>
              </div>
              <div>
                <label>
                  스케일 모드:
                  <select
                    value={layer.scaleMode || "fit"}
                    onChange={(e) => handleChange("scaleMode", e.target.value)}
                  >
                    <option value="fit">맞춤</option>
                    <option value="cover">덮기</option>
                    <option value="none">원본</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {/* 다른 이펙트 타입별 속성 */}
          {layer.effectType === "hearts" && (
            <div>
              <label>
                하트 개수:
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={layer.count || 12}
                  onChange={(e) =>
                    handleChange("count", Number(e.target.value))
                  }
                  style={{ width: 60 }}
                />
              </label>
            </div>
          )}
        </>
      )}
      {/* 필요시 더 많은 타입별 속성 추가 */}

      {/* 저장하기 버튼들 */}
      <div
        style={{
          marginTop: "20px",
          paddingTop: "15px",
          borderTop: "2px solid #ddd",
        }}
      >
        <h5 style={{ marginBottom: "10px", color: "#333" }}>저장하기</h5>

        <button
          type="button"
          onClick={handleSaveLayer}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginBottom: "8px",
            fontSize: "14px",
          }}
        >
          💾 현재 레이어 저장
        </button>

        <button
          type="button"
          onClick={handleSaveProject}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          📁 프로젝트 저장
        </button>

        <div
          style={{
            fontSize: "11px",
            color: "#666",
            marginTop: "8px",
            textAlign: "center",
          }}
        >
          저장된 파일은 나중에 다시 불러올 수 있습니다
        </div>
      </div>
    </div>
  );
}
