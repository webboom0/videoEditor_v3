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
  const [editModeName, setEditModeName] = useState(""); // 편집 모드에서 표시할 이름
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 재생 속도 (1 = 정상 속도)

  // 템플릿 추가 방식 선택 모달
  const [showTemplateChoice, setShowTemplateChoice] = useState(false);
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);

  // showTemplates 상태 변화 추적
  useEffect(() => {
    console.log("showTemplates 상태 변경됨:", showTemplates);
  }, [showTemplates]);

  // 클립 ID 생성 함수
  const generateClipId = () => {
    return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 클립 추가 함수
  const addClip = (templateName, templateData) => {
    console.log("addClip 호출됨:", templateName, templateData);
    const clipId = generateClipId();

    // 기존 클립들의 끝 위치 계산 (시작 시간으로 정렬 후)
    let newStart = 0;
    if (clips.length > 0) {
      // 클립들을 시작 시간으로 정렬
      const sortedClips = [...clips].sort((a, b) => a.start - b.start);
      const lastClip = sortedClips[sortedClips.length - 1];
      newStart = lastClip.start + lastClip.duration;
    }

    // 템플릿의 실제 길이 계산
    const templateLayers = templateData.layers || templateData;
    let templateDuration = 10; // 기본값

    if (Array.isArray(templateLayers) && templateLayers.length > 0) {
      // 모든 레이어 중 가장 긴 duration 찾기
      templateDuration = Math.max(
        ...templateLayers.map(
          (layer) => (layer.start || 0) + (layer.duration || 0)
        )
      );
    }

    const clip = {
      id: clipId,
      name: templateName,
      templateData: templateData,
      start: newStart, // 기존 클립 끝에 연속 배치
      duration: templateDuration, // 템플릿의 실제 길이
      thumbnail: `/template/thumb/${templateName}.png`,
      layers: templateLayers,
    };

    console.log("생성된 클립:", clip);
    setClips((prev) => {
      const newClips = [...prev, clip];
      console.log("새로운 클립 배열:", newClips);
      return newClips;
    });
    return clipId;
  };

  // 클립들의 위치를 다시 계산하는 함수
  const recalculateClipPositions = (clips) => {
    if (clips.length === 0) return clips;

    const sortedClips = [...clips].sort((a, b) => a.start - b.start);
    let currentStart = 0;

    return sortedClips.map((clip) => {
      const updatedClip = { ...clip, start: currentStart };
      currentStart += clip.duration;
      return updatedClip;
    });
  };

  // 클립 더블클릭 처리
  const handleClipDoubleClick = (clip) => {
    console.log("클립 더블클릭:", clip);
    setSelectedClipId(clip.id);
    setIsClipEditMode(true);
    setEditModeName(clip.name); // 클립 이름으로 설정
    setOriginalLayers([...layers]); // 현재 레이어 백업
    setLayers(clip.layers); // 클립의 레이어로 변경

    // playhead를 안전하게 0으로 설정
    setPlayhead(0);
    setIsPlaying(false);

    // 클립의 오디오 트랙 찾기
    const audioLayer = clip.layers.find((layer) => layer.type === "audio");
    console.log("클립에서 찾은 오디오 레이어:", audioLayer);
    setAudioSrc(audioLayer ? audioLayer.src : "");
  };

  // 클립 편집 모드 종료
  const exitClipEditMode = () => {
    console.log("exitClipEditMode 호출:", {
      selectedClipId,
      isClipEditMode,
      clipsCount: clips.length,
      layersCount: layers.length,
    });

    if (selectedClipId && isClipEditMode) {
      // 클립의 레이어를 업데이트하고 duration만 재계산
      setClips((prev) => {
        const updatedClips = prev.map((clip) => {
          if (clip.id === selectedClipId) {
            // 수정된 레이어로 업데이트
            const updatedClip = { ...clip, layers: [...layers] };

            // 레이어의 실제 길이를 다시 계산
            const templateLayers = layers;
            let templateDuration = 10; // 기본값

            if (Array.isArray(templateLayers) && templateLayers.length > 0) {
              // 모든 레이어 중 가장 긴 duration 찾기
              templateDuration = Math.max(
                ...templateLayers.map(
                  (layer) => (layer.start || 0) + (layer.duration || 0)
                )
              );
            }

            // 클립의 duration만 업데이트 (위치는 유지)
            updatedClip.duration = templateDuration;

            return updatedClip;
          }
          return clip;
        });

        // 위치는 변경하지 않고 그대로 반환
        return updatedClips;
      });

      // 원래 레이어로 복원
      setLayers(originalLayers);
      setIsClipEditMode(false);
      setSelectedClipId(null);
      setOriginalLayers([]);
      setEditModeName(""); // 편집 모드 이름 초기화

      // 재생 중지 및 플레이헤드를 클립 트랙 처음(0초)으로 이동
      setIsPlaying(false);
      setPlayhead(0);

      // 원래 오디오 소스로 복원
      const originalAudioLayer = originalLayers.find(
        (layer) => layer.type === "audio"
      );
      const originalAudioSrc = originalAudioLayer ? originalAudioLayer.src : "";
      console.log(
        "클립 편집 모드 종료 - 원래 오디오 소스 복원:",
        originalAudioSrc
      );
      setAudioSrc(originalAudioSrc);
    } else if (isClipEditMode) {
      // 레이어로 편집 모드에서 나올 때
      setLayers(originalLayers);
      setIsClipEditMode(false);
      setSelectedClipId(null);
      setOriginalLayers([]);
      setEditModeName(""); // 편집 모드 이름 초기화

      // 재생 중지 및 플레이헤드를 클립 트랙 처음(0초)으로 이동
      setIsPlaying(false);
      setPlayhead(0);

      // 원래 오디오 소스로 복원
      const originalAudioLayer = originalLayers.find(
        (layer) => layer.type === "audio"
      );
      const originalAudioSrc = originalAudioLayer ? originalAudioLayer.src : "";
      console.log(
        "레이어 편집 모드 종료 - 원래 오디오 소스 복원:",
        originalAudioSrc
      );
      setAudioSrc(originalAudioSrc);
    }
  };

  // 클립 삭제
  const handleClipRemove = (clipId) => {
    setClips((prev) => {
      // 클립 삭제
      const filteredClips = prev.filter((clip) => clip.id !== clipId);

      // 나머지 클립들의 위치를 다시 계산
      return recalculateClipPositions(filteredClips);
    });

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
    console.log("애니메이션 프레임 useEffect 실행:", {
      isPlaying,
      audioSrc,
      playhead,
      isClipEditMode,
    });

    // 오디오가 있을 때는 애니메이션 프레임을 사용하지 않음
    if (isPlaying && !audioSrc) {
      console.log("애니메이션 프레임 시작 - 오디오 없음");
      // 오디오가 없을 때만 애니메이션 사용
      const startTime = Date.now() - playhead * 1000; // 밀리초 단위로 변환
      let lastUpdateTime = 0;
      const updateInterval = 16; // 약 60fps (1000ms / 60fps ≈ 16.67ms)

      const tick = () => {
        const currentTime = Date.now();
        const elapsedSeconds =
          ((currentTime - startTime) / 1000) * playbackSpeed; // 재생 속도 적용
        const currentTimelineDuration = isClipEditMode ? 180 : 600;

        if (elapsedSeconds >= currentTimelineDuration) {
          console.log("애니메이션 종료 - 타임라인 끝");
          setIsPlaying(false);
          setPlayhead(currentTimelineDuration);
          return;
        }

        // 더 자주 업데이트하여 부드러운 애니메이션
        if (currentTime - lastUpdateTime >= updateInterval) {
          const newPlayhead = elapsedSeconds;
          // playhead 값이 유효한지 확인
          if (isFinite(newPlayhead) && newPlayhead >= 0) {
            console.log("애니메이션 프레임 - playhead 업데이트:", newPlayhead);
            setPlayhead(newPlayhead);
          } else {
            console.warn("유효하지 않은 playhead 값 계산:", newPlayhead);
            setPlayhead(0);
          }
          lastUpdateTime = currentTime;
        }

        animationRef.current = requestAnimationFrame(tick);
      };

      animationRef.current = requestAnimationFrame(tick);
    } else {
      console.log("애니메이션 프레임 중지 - 조건:", {
        isPlaying,
        hasAudioSrc: !!audioSrc,
        reason: audioSrc ? "오디오 있음" : "재생 중지",
      });
      cancelAnimationFrame(animationRef.current);
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, playbackSpeed, audioSrc]); // playhead 의존성 제거

  // 오디오 동기화
  useEffect(() => {
    console.log("오디오 동기화 useEffect 실행:", {
      isPlaying,
      audioSrc,
      playhead,
    });
    let animationId;
    let lastUpdateTime = 0;
    const updateInterval = 16; // 약 60fps로 제한

    function syncPlayhead() {
      const audio = audioRef.current;
      const currentTime = Date.now();

      if (isPlaying && audio && audioSrc) {
        // 업데이트 빈도 제한
        if (currentTime - lastUpdateTime >= updateInterval) {
          const audioCurrentTime = audio.currentTime;
          // audio.currentTime이 유효한지 확인
          if (isFinite(audioCurrentTime) && audioCurrentTime >= 0) {
            console.log("오디오 동기화 - playhead 업데이트:", audioCurrentTime);
            setPlayhead(audioCurrentTime);
          } else {
            console.warn("유효하지 않은 audio.currentTime:", audioCurrentTime);
          }
          lastUpdateTime = currentTime;
        }
        animationId = requestAnimationFrame(syncPlayhead);
      }
    }

    if (isPlaying) {
      // 오디오가 있을 때만 오디오 동기화 사용
      const audio = audioRef.current;
      if (audio && audioSrc) {
        console.log("오디오 재생 시작:", { audioSrc, playhead });
        // 오디오 재생 시작
        // playhead 값이 유효한지 확인
        if (isFinite(playhead) && playhead >= 0) {
          audio.currentTime = playhead;
        } else {
          console.warn("유효하지 않은 playhead 값, 0으로 설정:", playhead);
          audio.currentTime = 0;
          setPlayhead(0);
        }
        audio
          .play()
          .then(() => {
            console.log("오디오 재생 성공, 동기화 시작");
            // 재생이 시작되면 동기화 시작
            lastUpdateTime = Date.now();
            animationId = requestAnimationFrame(syncPlayhead);
          })
          .catch((error) => {
            console.error("오디오 재생 실패:", error);
            // 오디오 재생 실패 시 애니메이션으로 대체
            console.log("애니메이션으로 대체");
            setAudioSrc(""); // 오디오 소스를 비워서 애니메이션 모드로 전환
          });
      } else {
        console.log("오디오 없음 - 애니메이션으로 처리");
      }
      // 오디오가 없으면 애니메이션 프레임에서 처리됨
    } else {
      console.log("재생 중지");
      // 오디오 일시정지
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
      }
      cancelAnimationFrame(animationId);
    }

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, audioSrc]); // playhead 의존성 제거

  // 슬라이더 등으로 playhead가 바뀔 때 오디오 위치도 맞춰줌
  useEffect(() => {
    const audio = audioRef.current;

    if (audio && Math.abs(audio.currentTime - playhead) > 0.1) {
      // playhead 값이 유효한지 확인
      if (isFinite(playhead) && playhead >= 0) {
        audio.currentTime = playhead;
      } else {
        console.warn("유효하지 않은 playhead 값:", playhead);
        // 유효하지 않은 값이면 0으로 설정
        setPlayhead(0);
      }
    }
  }, [playhead]);

  // 재생 속도 변경 시 오디오에도 적용
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioSrc) {
      audio.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, audioSrc]);

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
    console.log("템플릿 버튼 클릭됨!");
    setShowTemplates(true);
    setTemplateFiles(["DRAMA", "LOVE", "WEDDING_01"]);
    console.log("showTemplates 상태 설정됨:", true);
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
      // 클립 편집 모드로 전환
      setIsClipEditMode(true);
      setEditModeName(selectedTemplateData.file); // 템플릿 이름으로 설정
      setOriginalLayers([...layers]); // 현재 레이어 백업
      setLayers(selectedTemplateData.layers); // 템플릿 레이어로 변경
      setPlayhead(0);
      setIsPlaying(false);
      setSelectedLayerIndex(null);

      // 오디오 트랙 찾기
      const audioLayer = selectedTemplateData.layers.find(
        (layer) => layer.type === "audio"
      );
      setAudioSrc(audioLayer ? audioLayer.src : "");

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

  // 현재 활성화된 오디오 소스 계산
  const getCurrentAudioSrc = () => {
    // playhead 값이 유효하지 않으면 빈 문자열 반환
    if (!isFinite(playhead) || playhead < 0) {
      console.warn("유효하지 않은 playhead 값:", playhead);
      return "";
    }

    console.log("getCurrentAudioSrc 호출:", {
      isClipEditMode,
      playhead,
      clipsCount: clips.length,
      layersCount: layers.length,
    });

    if (isClipEditMode) {
      // 클립 편집 모드에서는 현재 레이어에서 오디오 찾기
      const audioLayer = layers.find((layer) => layer.type === "audio");
      const result = audioLayer ? audioLayer.src : "";
      console.log("클립 편집 모드 오디오 소스:", result);
      return result;
    } else {
      // 클립 트랙 모드에서는 현재 시간에 해당하는 클립의 오디오 찾기
      console.log("클립 트랙 모드 - 클립 검색 중...");
      for (const clip of clips) {
        const clipStart = clip.start;
        const clipEnd = clip.start + clip.duration;

        console.log(`클립 "${clip.name}" 검사:`, {
          clipStart,
          clipEnd,
          playhead,
          isInRange: playhead >= clipStart && playhead < clipEnd,
        });

        if (playhead >= clipStart && playhead < clipEnd) {
          const audioLayer = clip.layers.find(
            (layer) => layer.type === "audio"
          );
          if (audioLayer) {
            console.log(`클립 "${clip.name}"에서 오디오 찾음:`, audioLayer.src);
            return audioLayer.src;
          } else {
            console.log(`클립 "${clip.name}"에 오디오 레이어 없음`);
          }
        }
      }

      // 기존 레이어에서도 오디오 찾기
      const audioLayer = layers.find((layer) => layer.type === "audio");
      const result = audioLayer ? audioLayer.src : "";
      console.log("기존 레이어에서 오디오 소스:", result);
      return result;
    }
  };

  // 현재 오디오 소스 업데이트
  useEffect(() => {
    const currentAudioSrc = getCurrentAudioSrc();
    console.log("오디오 소스 업데이트 useEffect:", {
      currentAudioSrc,
      previousAudioSrc: audioSrc,
      isDifferent: currentAudioSrc !== audioSrc,
      playhead,
      isClipEditMode,
    });

    if (currentAudioSrc !== audioSrc) {
      console.log("오디오 소스 변경:", { from: audioSrc, to: currentAudioSrc });
      setAudioSrc(currentAudioSrc);
    }
  }, [playhead, clips, layers, isClipEditMode]);

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
                  📝 클립 편집 모드: {editModeName}
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
                console.log("재생 버튼 클릭:", {
                  isPlaying,
                  audioSrc,
                  playhead,
                  layers: layers.length,
                  clips: clips.length,
                  isClipEditMode,
                });

                if (!isPlaying && showTemplates) {
                  setShowTemplates(false); // 재생 시작 시 템플릿 모달 닫기
                }

                // 클립 트랙 모드에서 재생 시작 시 현재 시간에 해당하는 클립의 오디오 즉시 설정
                if (!isPlaying && !isClipEditMode && clips.length > 0) {
                  const currentAudioSrc = getCurrentAudioSrc();
                  console.log(
                    "클립 트랙 재생 시작 - 현재 오디오 소스 설정:",
                    currentAudioSrc
                  );
                  if (currentAudioSrc && currentAudioSrc !== audioSrc) {
                    setAudioSrc(currentAudioSrc);
                  }
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

            {/* 재생 속도 조절 버튼 */}
            <button
              onClick={() => {
                const speeds = [0.5, 1, 1.5, 2, 3];
                const currentIndex = speeds.indexOf(playbackSpeed);
                const nextIndex = (currentIndex + 1) % speeds.length;
                setPlaybackSpeed(speeds[nextIndex]);
              }}
              style={{ marginLeft: 5, fontSize: "12px" }}
              title={`재생 속도: ${playbackSpeed}x`}
            >
              {playbackSpeed}x
            </button>

            <span style={{ margin: "0 10px" }}>
              {playhead.toFixed(2)}s / {isClipEditMode ? 180 : 600}s
            </span>

            <input
              type="range"
              min={0}
              max={isClipEditMode ? 180 : 600}
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
            isClipEditMode={isClipEditMode}
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
          selectedLayerIndex={selectedLayerIndex}
          allLayers={layers}
          clips={clips}
          audioSrc={audioSrc}
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
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="auto"
          crossOrigin="anonymous"
          onLoadStart={() => console.log("오디오 로딩 시작:", audioSrc)}
          onCanPlay={() => console.log("오디오 재생 가능:", audioSrc)}
          onPlay={() => console.log("오디오 재생 시작")}
          onPause={() => console.log("오디오 일시정지")}
          onError={(e) => console.error("오디오 로드 에러:", e)}
          onEnded={() => console.log("오디오 재생 종료")}
        />
      )}

      {/* 오디오 상태 디버깅 */}
      {audioSrc && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "10px",
            borderRadius: "5px",
            fontSize: "12px",
            zIndex: 1000,
          }}
        >
          <div>오디오 소스: {audioSrc}</div>
          <div>재생 상태: {isPlaying ? "재생 중" : "정지"}</div>
          <div>플레이헤드: {playhead.toFixed(2)}s</div>
          <div>오디오 태그: {audioRef.current ? "존재" : "없음"}</div>
          {audioRef.current && (
            <div>
              오디오 currentTime: {audioRef.current.currentTime.toFixed(2)}s
            </div>
          )}
          <div>모드: {isClipEditMode ? "클립 편집" : "클립 트랙"}</div>
          <div>클립 수: {clips.length}</div>
          <div>레이어 수: {layers.length}</div>
        </div>
      )}

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
