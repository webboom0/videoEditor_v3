import React, { useState, useRef, useEffect } from "react";

import Timeline from "./Timeline/Timeline";

import MediaLibrary from "./MediaLibrary";

import EffectsPanel from "./EffectsPanel";

import PreviewWindow from "./PreviewWindow";

import CanvasPreview from "./CanvasPreview";

import PropertyBox from "./PropertyBox";

// import layersData from "../data/layers.json"; // 또는 fetch로 불러와도 됨

const TIMELINE_DURATION = 180; // 3분(초)

const effects = [
  { name: "Template", icon: "fa fa-cubes" },
  // { name: "Blur", icon: "fa fa-adjust" },
  // { name: "Fade", icon: "fa fa-adjust" },
  // 등등 필요한 이펙트 추가
];

function VideoEditor() {
  const [mediaFiles, setMediaFiles] = useState([]);

  const [layers, setLayers] = useState([]);

  const [playhead, setPlayhead] = useState(0);

  const [selectedLayerIndex, setSelectedLayerIndex] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const animationRef = useRef();

  const audioRef = useRef(null);

  const [isExporting, setIsExporting] = useState(false);

  const [audioSrc, setAudioSrc] = useState("");

  const [showTemplates, setShowTemplates] = useState(false);

  const [templateFiles, setTemplateFiles] = useState([]);

  const [selectedEffect, setSelectedEffect] = useState(null);

  const mediaLibraryRef = useRef(null);

  // 클립 관련 상태 추가
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [isClipEditMode, setIsClipEditMode] = useState(false);
  const [originalLayers, setOriginalLayers] = useState([]);

  // 템플릿 추가 방식 선택 모달
  const [showTemplateChoice, setShowTemplateChoice] = useState(false);
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);

  // 클립 ID 생성 함수
  const generateClipId = () => {
    return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 클립 추가 함수
  const addClip = (templateName, templateData) => {
    console.log("addClip 호출됨:", templateName, templateData);
    const clipId = generateClipId();
    const clip = {
      id: clipId,
      name: templateName,
      templateData: templateData,
      start: playhead,
      duration: 10, // 기본 10초
      thumbnail: `/template/thumb/${templateName}.png`,
      layers: templateData.layers || templateData,
    };

    console.log("생성된 클립:", clip);
    setClips((prev) => {
      const newClips = [...prev, clip];
      console.log("새로운 클립 배열:", newClips);
      return newClips;
    });
    return clipId;
  };

  // 클립 더블클릭 처리
  const handleClipDoubleClick = (clip) => {
    setSelectedClipId(clip.id);
    setIsClipEditMode(true);
    setOriginalLayers([...layers]); // 현재 레이어 백업
    setLayers(clip.layers); // 클립의 레이어로 변경
    setPlayhead(0);
    setIsPlaying(false);
  };

  // 클립 편집 모드 종료
  const exitClipEditMode = () => {
    if (selectedClipId && isClipEditMode) {
      // 클립의 레이어를 업데이트
      setClips((prev) =>
        prev.map((clip) =>
          clip.id === selectedClipId ? { ...clip, layers: [...layers] } : clip
        )
      );

      // 원래 레이어로 복원
      setLayers(originalLayers);
      setIsClipEditMode(false);
      setSelectedClipId(null);
      setOriginalLayers([]);
    }
  };

  // 클립 삭제
  const handleClipRemove = (clipId) => {
    setClips((prev) => prev.filter((clip) => clip.id !== clipId));
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
      setIsClipEditMode(false);
    }
  };

  // 클립 크기 조정
  const handleClipResize = (clipId, newDuration) => {
    setClips((prev) => {
      const updatedClips = prev.map((clip) =>
        clip.id === clipId ? { ...clip, duration: newDuration } : clip
      );

      // 겹침 검사 및 조정
      const resizedClip = updatedClips.find((clip) => clip.id === clipId);
      if (resizedClip) {
        const resizedEnd = resizedClip.start + resizedClip.duration;

        // 다른 클립들과 겹치는지 확인
        const overlappingClip = updatedClips.find(
          (clip) =>
            clip.id !== clipId &&
            !(
              resizedClip.start >= clip.start + clip.duration ||
              resizedEnd <= clip.start
            )
        );

        if (overlappingClip) {
          // 겹치면 원래 크기로 되돌리기
          return prev;
        }
      }

      return updatedClips;
    });
  };

  // 클립 이동
  const handleClipMove = (clipId, newStart) => {
    setClips((prev) => {
      const updatedClips = prev.map((clip) =>
        clip.id === clipId ? { ...clip, start: newStart } : clip
      );

      // 겹침 검사 및 조정
      const movedClip = updatedClips.find((clip) => clip.id === clipId);
      if (movedClip) {
        const movedEnd = movedClip.start + movedClip.duration;

        // 다른 클립들과 겹치는지 확인
        const overlappingClip = updatedClips.find(
          (clip) =>
            clip.id !== clipId &&
            !(
              movedClip.start >= clip.start + clip.duration ||
              movedEnd <= clip.start
            )
        );

        if (overlappingClip) {
          // 겹치면 원래 위치로 되돌리기
          return prev;
        }
      }

      return updatedClips;
    });
  };

  useEffect(() => {
    if (!showTemplates) return;

    function handleClickOutside(e) {
      if (
        mediaLibraryRef.current &&
        !mediaLibraryRef.current.contains(e.target)
      ) {
        setShowTemplates(false);
        setSelectedEffect(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTemplates]);

  // 최초 마운트 시 localStorage에서 불러오거나, 없으면 json에서 불러오기

  useEffect(() => {
    const saved = localStorage.getItem("layers");

    if (saved) {
      // setLayers(JSON.parse(saved));
    }
  }, []);

  // layers가 바뀔 때마다 localStorage에 저장

  useEffect(() => {
    if (layers.length > 0) {
      localStorage.setItem("layers", JSON.stringify(layers));
    }
  }, [layers]);

  // clips 상태 변화 추적
  useEffect(() => {
    console.log("clips 상태 변화:", clips);
  }, [clips]);

  // 애니메이션 프레임

  useEffect(() => {
    if (isPlaying) {
      const startTime = Date.now() - playhead * 1000; // 밀리초 단위로 변환

      const tick = () => {
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - startTime) / 1000;

        if (elapsedSeconds >= TIMELINE_DURATION) {
          setIsPlaying(false);
          setPlayhead(TIMELINE_DURATION);
          return;
        }

        setPlayhead(elapsedSeconds);
        animationRef.current = requestAnimationFrame(tick);
      };

      animationRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animationRef.current);
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, playhead]);

  // 오디오 동기화

  useEffect(() => {
    let animationId;

    function syncPlayhead() {
      const audio = audioRef.current;

      if (isPlaying && audio) {
        setPlayhead(audio.currentTime);

        animationId = requestAnimationFrame(syncPlayhead);
      }
    }

    if (isPlaying) {
      // 오디오 재생

      const audio = audioRef.current;

      if (audio) {
        audio.currentTime = playhead;

        audio.play();

        animationId = requestAnimationFrame(syncPlayhead);
      }
    } else {
      // 오디오 일시정지

      const audio = audioRef.current;

      if (audio) audio.pause();

      cancelAnimationFrame(animationId);
    }

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  // 슬라이더 등으로 playhead가 바뀔 때 오디오 위치도 맞춰줌

  useEffect(() => {
    const audio = audioRef.current;

    if (audio && Math.abs(audio.currentTime - playhead) > 0.1) {
      audio.currentTime = playhead;
    }
  }, [playhead]);

  const handleSelectEffect = async (effect) => {
    // 이미 선택된 이펙트를 다시 클릭하면 해제
    if (selectedEffect && selectedEffect.name === effect.name) {
      setSelectedEffect(null);
    } else {
      setSelectedEffect(effect);

      // 프레임 시퀀스 이펙트 선택 시 자동으로 타임라인에 추가
      if (effect.name === "Frame Sequence") {
        // 프레임 시퀀스 이펙트 인스턴스 생성
        const { frameSequenceEffect } = await import(
          "../effects/frameSequenceEffect.js"
        );

        // 프레임 개수 확인
        await frameSequenceEffect.preloadFrames();
        const frameCount = frameSequenceEffect.maxFrameCount;
        const duration = frameCount / 30; // 30fps 기준

        const frameSequenceLayer = {
          type: "effect",
          effectType: "frameSequence",
          name: "프레임 시퀀스",
          start: playhead,
          duration: duration,
          maxFrameCount: frameCount,
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          align: "center",
          verticalAlign: "middle",
          scaleMode: "fit",
          animation: [{ time: 0, x: 0, y: 0, scale: 1, opacity: 1 }],
        };

        setLayers((prev) => [...prev, frameSequenceLayer]);
        setSelectedLayerIndex(layers.length); // 새로 추가된 레이어 선택
      }
    }
  };

  const handleRemove = (index) => {
    setLayers((prevLayers) => prevLayers.filter((_, i) => i !== index));
  };

  const handlePlayheadChange = (newTime) => {
    setPlayhead(newTime);
  };

  // 텍스트 수정 핸들러

  const handleTextChange = (e) => {
    const value = e.target.value;

    setLayers((layers) =>
      layers.map((layer, i) =>
        i === selectedLayerIndex ? { ...layer, text: value } : layer
      )
    );
  };

  // Export 함수 추가

  const handleExport = () => {
    const canvas = document.querySelector("canvas"); // 또는 canvasRef.current 사용

    if (!canvas) {
      alert("캔버스를 찾을 수 없습니다.");

      return;
    }

    setIsExporting(true); // 녹화 시작 시 표시

    const stream = canvas.captureStream(30); // 30fps

    const recorder = new window.MediaRecorder(stream, {
      mimeType: "video/webm",
    });

    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = "export.webm";

      a.click();

      URL.revokeObjectURL(url);

      setIsExporting(false); // 녹화 끝나면 숨김
    };

    recorder.start();

    // 예시: 10초간 녹화 후 자동 정지 (원하는 길이로 수정)

    setTimeout(() => {
      recorder.stop();
    }, 10000);
  };

  const handleApplyTemplate = (template) => {
    // 타임라인에 template을 적용하는 로직 작성

    // 예: setTimelineLayers(template.layers);

    console.log("템플릿 적용:", template);
  };

  // 템플릿 파일 선택 시 JSON 불러와서 layers에 적용

  const handleSelectTemplateFile = async (file) => {
    try {
      const res = await fetch(`/template/${file}.json`);

      if (!res.ok) throw new Error("템플릿 파일을 불러올 수 없습니다.");

      const data = await res.json();

      let layersArr = [];

      if (Array.isArray(data)) {
        layersArr = data;
      } else if (Array.isArray(data.layers)) {
        layersArr = data.layers;
      } else {
        layersArr = [data];
      }

      setLayers(layersArr);

      // 오디오 트랙 찾기

      const audioLayer = layersArr.find((layer) => layer.type === "audio");

      setAudioSrc(audioLayer ? audioLayer.src : "");

      setSelectedLayerIndex(null);

      setPlayhead(0);

      setIsPlaying(false);
    } catch (e) {
      alert("템플릿 파일을 불러오지 못했습니다.");
    }
  };

  // 템플릿 버튼 클릭 시

  const handleTemplateButtonClick = () => {
    setShowTemplates(true);
    setTemplateFiles(["DRAMA", "LOVE", "WEDDING_01"]);
  };

  // 템플릿 선택 시

  const handleTemplateSelect = (templateName) => {
    // ... 템플릿 적용 코드 ...
    setSelectedEffect(null);
  };

  // 템플릿 파일 클릭 시

  const handleTemplateFileClick = async (file) => {
    try {
      const res = await fetch(`/template/${file}.json`);

      if (!res.ok) throw new Error("템플릿 파일을 불러올 수 없습니다.");

      const data = await res.json();

      let layersArr = [];

      if (Array.isArray(data)) {
        layersArr = data;
      } else if (Array.isArray(data.layers)) {
        layersArr = data.layers;
      } else {
        layersArr = [data];
      }

      // 템플릿 데이터 저장하고 선택 모달 표시
      setSelectedTemplateData({ file, layers: layersArr });
      setShowTemplateChoice(true);
    } catch (e) {
      alert("템플릿 파일을 불러오지 못했습니다.");
    }
  };

  // 클립으로 추가 선택
  const handleAddAsClip = () => {
    console.log(
      "handleAddAsClip 호출됨, selectedTemplateData:",
      selectedTemplateData
    );
    if (selectedTemplateData) {
      addClip(selectedTemplateData.file, {
        layers: selectedTemplateData.layers,
      });
      setShowTemplateChoice(false);
      setSelectedTemplateData(null);
      setShowTemplates(false);
      setSelectedEffect(null);
    }
  };

  // 레이어로 편집 선택
  const handleEditAsLayers = () => {
    if (selectedTemplateData) {
      setLayers(selectedTemplateData.layers);

      // 오디오 트랙 찾기
      const audioLayer = selectedTemplateData.layers.find(
        (layer) => layer.type === "audio"
      );
      setAudioSrc(audioLayer ? audioLayer.src : "");

      setSelectedLayerIndex(null);
      setPlayhead(0);
      setIsPlaying(false);

      setShowTemplateChoice(false);
      setSelectedTemplateData(null);
      setShowTemplates(false);
      setSelectedEffect(null);
    }
  };

  // 템플릿 선택 모달 닫기
  const handleTemplateChoiceClose = () => {
    setShowTemplateChoice(false);
    setSelectedTemplateData(null);
  };

  // 기존 템플릿 모달 닫기
  const handleTemplateModalClose = () => {
    setShowTemplates(false);
    setSelectedEffect(null);
  };

  const selectedLayer =
    selectedLayerIndex !== null ? layers[selectedLayerIndex] : null;

  const canvasWidth = 1920;

  const canvasHeight = Math.round((canvasWidth * 9) / 16);

  const getAllActiveLayers = () => {
    if (isClipEditMode) {
      return layers;
    }

    // 모든 클립에서 현재 시간에 해당하는 레이어들을 수집
    const activeLayers = [];

    // 기존 레이어들 추가 (클립 편집 모드가 아닐 때)
    layers.forEach((layer) => {
      if (playhead >= layer.start && playhead < layer.start + layer.duration) {
        activeLayers.push(layer);
      }
    });

    // 클립의 레이어들 추가
    clips.forEach((clip) => {
      const clipStart = clip.start;
      const clipEnd = clip.start + clip.duration;

      // 현재 시간이 클립 범위 내에 있는지 확인
      if (playhead >= clipStart && playhead < clipEnd) {
        const clipTime = playhead - clipStart;

        // 클립의 레이어들을 현재 시간에 맞게 조정
        clip.layers.forEach((layer) => {
          const adjustedLayer = {
            ...layer,
            start: layer.start + clipStart,
            // 클립 내부 시간으로 조정
            _clipTime: clipTime,
          };
          activeLayers.push(adjustedLayer);
        });
      }
    });

    return activeLayers;
  };

  return (
    <div className="video-editor">
      <EffectsPanel
        effects={effects}
        onSelectEffect={handleSelectEffect}
        onTemplateButtonClick={handleTemplateButtonClick}
        selectedEffect={selectedEffect}
      />

      <div className="editor-container">
        <div className="editor-media-container">
          <div
            className={`media-library${showTemplates ? " active" : ""}`}
            ref={mediaLibraryRef}
          >
            <MediaLibrary onUpload={setMediaFiles} />

            {showTemplates && (
              <div className="template-list-modal">
                <h4>템플릿 파일 선택</h4>

                <ul>
                  {templateFiles.map((file) => (
                    <li key={file}>
                      <button onClick={() => handleTemplateFileClick(file)}>
                        <img
                          src={`/template/thumb/${file}.png`}
                          alt={`${file} 썸네일`}
                        />

                        {file}
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  className="close-btn"
                  onClick={handleTemplateModalClose}
                >
                  <span className="blind">닫기</span>
                </button>
              </div>
            )}

            {/* 템플릿 추가 방식 선택 모달 */}
            {showTemplateChoice && selectedTemplateData && (
              <div className="template-choice-modal">
                <div className="template-choice-content">
                  <h4>템플릿 추가 방식 선택</h4>
                  <p>
                    "{selectedTemplateData.file}" 템플릿을 어떻게
                    추가하시겠습니까?
                  </p>

                  <div className="template-choice-buttons">
                    <button
                      className="choice-btn clip-choice"
                      onClick={handleAddAsClip}
                    >
                      <div className="choice-icon">🎬</div>
                      <div className="choice-text">
                        <strong>클립으로 추가</strong>
                        <span>새로운 타임라인에 클립 단위로 추가</span>
                      </div>
                    </button>

                    <button
                      className="choice-btn layer-choice"
                      onClick={handleEditAsLayers}
                    >
                      <div className="choice-icon">📝</div>
                      <div className="choice-text">
                        <strong>레이어로 편집</strong>
                        <span>기존 타임라인에서 레이어 단위로 편집</span>
                      </div>
                    </button>
                  </div>

                  <button
                    className="close-btn"
                    onClick={handleTemplateChoiceClose}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* <PreviewWindow mediaFiles={mediaFiles} /> */}

          <CanvasPreview
            layers={getAllActiveLayers()}
            currentTime={playhead}
            width={canvasWidth}
            height={canvasHeight}
            selectedLayerIndex={selectedLayerIndex}
            onSelectLayer={setSelectedLayerIndex}
            onMoveLayer={(idx, x, y) => {
              setLayers((layers) =>
                layers.map((layer, i) =>
                  i === idx ? { ...layer, x, y } : layer
                )
              );
            }}
          />
        </div>

        <div className="editor-timeline-container">
          <div className="animation-controls">
            {isClipEditMode && (
              <div className="clip-edit-mode-indicator">
                <span style={{ color: "#f39c12", fontWeight: "bold" }}>
                  📝 클립 편집 모드:{" "}
                  {clips.find((c) => c.id === selectedClipId)?.name}
                </span>
                <button
                  onClick={exitClipEditMode}
                  style={{
                    marginLeft: 10,
                    background: "#e74c3c",
                    color: "white",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  편집 완료
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (!isPlaying && showTemplates) {
                  setShowTemplates(false); // 재생 시작 시 템플릿 모달 닫기
                }
                setIsPlaying((p) => !p);
              }}
            >
              {isPlaying ? (
                <i className="fa fa-pause"></i>
              ) : (
                <i className="fa fa-play"></i>
              )}
            </button>

            <span style={{ margin: "0 10px" }}>
              {playhead.toFixed(2)}s / {TIMELINE_DURATION}s
            </span>

            <input
              type="range"
              min={0}
              max={TIMELINE_DURATION}
              step={0.01}
              value={playhead}
              onChange={(e) => setPlayhead(Number(e.target.value))}
              style={{ width: 200 }}
            />

            <button
              onClick={() => {
                if (selectedLayerIndex !== null && layers[selectedLayerIndex]) {
                  setLayers((layers) =>
                    layers.filter((_, i) => i !== selectedLayerIndex)
                  );

                  setSelectedLayerIndex(null);
                }
              }}
              disabled={selectedLayerIndex === null}
              style={{ marginLeft: 10 }}
            >
              <i className="fa fa-trash"></i>
            </button>

            <button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "녹화 중..." : "Export"}
            </button>
          </div>

          <Timeline
            mediaFiles={layers}
            clips={clips}
            onRemove={handleRemove}
            onClipDoubleClick={handleClipDoubleClick}
            onClipRemove={handleClipRemove}
            onClipResize={handleClipResize}
            onClipMove={handleClipMove}
            selectedClipId={selectedClipId}
            selectedLayerIndex={selectedLayerIndex}
            onSelectLayer={setSelectedLayerIndex}
            playhead={playhead}
            onPlayheadChange={handlePlayheadChange}
            onChangeImage={(idx, newSrc) => {
              setLayers((layers) =>
                layers.map((layer, i) =>
                  i === idx ? { ...layer, src: newSrc } : layer
                )
              );
            }}
          />
        </div>
      </div>

      <div className="side-panel">
        <PropertyBox
          layer={selectedLayer}
          onChange={(updatedLayer) => {
            setLayers((layers) =>
              layers.map((layer, i) =>
                i === selectedLayerIndex ? updatedLayer : layer
              )
            );
          }}
        />
      </div>

      {/* 오디오 태그 (audioSrc가 있을 때만) */}

      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="auto" />}

      {/* 녹화 중이면 안내 메시지 또는 로딩바 표시 */}

      {isExporting && (
        <div
          style={{
            position: "fixed",

            top: 0,

            left: 0,

            right: 0,

            bottom: 0,

            background: "rgba(0,0,0,0.3)",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",

              padding: 40,

              borderRadius: 12,

              fontSize: 24,

              fontWeight: "bold",

              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            🎬 영상 녹화 중입니다...
            <br />
            잠시만 기다려주세요!
            <div
              style={{
                marginTop: 20,

                width: 200,

                height: 10,

                background: "#eee",

                borderRadius: 5,

                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "100%",

                  height: "100%",

                  background:
                    "linear-gradient(90deg, #4f8cff 40%, #a0c8ff 100%)",

                  animation: "progressBar 10s linear",
                }}
              />
            </div>
          </div>

          {/* 진행바 애니메이션용 스타일 */}

          <style>
            {`

              @keyframes progressBar {

                from { width: 0%; }

                to { width: 100%; }

              }

            `}
          </style>
        </div>
      )}
    </div>
  );
}

export default VideoEditor;
