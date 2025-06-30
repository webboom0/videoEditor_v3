// src/components/PropertyBox.js
import React, { useState, useRef, useEffect } from "react";

export default function PropertyBox({
  layer,
  selectedLayerIndex,
  allLayers,
  clips,
  audioSrc,
  onChange,
}) {
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

  if (!layer) return null;
  const maxFrame = 515;
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
