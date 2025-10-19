import React, { useState, useRef, useEffect } from "react";

import Timeline from "./Timeline/Timeline";

import MediaLibrary from "./MediaLibrary";

import EffectsPanel from "./EffectsPanel";

import PreviewWindow from "./PreviewWindow";

import CanvasPreview from "./CanvasPreview";

import PropertyBox from "./PropertyBox";

import VideoAnalyzer from "./VideoAnalyzer";

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

  // 음악 라이브러리 관련 상태
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [musicFiles, setMusicFiles] = useState([]);

  const mediaLibraryRef = useRef(null);

  // 클립 관련 상태 추가
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [isClipEditMode, setIsClipEditMode] = useState(false);
  const [originalLayers, setOriginalLayers] = useState([]);
  const [editModeName, setEditModeName] = useState(""); // 편집 모드에서 표시할 이름
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 재생 속도 (1 = 정상 속도)
  const [savedClipTimelinePlayhead, setSavedClipTimelinePlayhead] = useState(0); // 클립 타임라인 playhead 저장

  // 오디오 트랙 관련 상태
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudioTrackId, setSelectedAudioTrackId] = useState(null);
  const audioFileInputRef = useRef(null);

  // 템플릿 추가 방식 선택 모달
  const [showTemplateChoice, setShowTemplateChoice] = useState(false);
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);

  // 프로젝트 저장/불러오기
  const fileInputRef = useRef(null);

  // 비디오 분석기
  const [showVideoAnalyzer, setShowVideoAnalyzer] = useState(false);

  // 오디오 파일 추가 함수 (ObjectURL 사용으로 성능 개선)
  const handleAddAudioTrack = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ObjectURL 사용으로 메모리 효율 개선
    const audioUrl = URL.createObjectURL(file);
    
    const audioTrack = {
      id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      src: audioUrl,
      start: 0,
      duration: 600, // 기본 10분
      volume: 1,
      file: file, // 저장을 위해 파일 참조 유지
    };
    setAudioTracks((prev) => [...prev, audioTrack]);
    alert(`오디오 트랙이 추가되었습니다: ${file.name}`);
    
    event.target.value = "";
  };

  // 오디오 트랙 삭제
  const handleRemoveAudioTrack = (trackId) => {
    setAudioTracks((prev) => prev.filter((track) => track.id !== trackId));
    if (selectedAudioTrackId === trackId) {
      setSelectedAudioTrackId(null);
    }
  };

  // 오디오 트랙 위치/길이 변경
  const handleAudioTrackMove = (trackId, newStart) => {
    setAudioTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, start: Math.max(0, newStart) } : track
      )
    );
  };

  const handleAudioTrackResize = (trackId, newDuration) => {
    setAudioTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, duration: Math.max(1, newDuration) } : track
      )
    );
  };

  // 프로젝트 저장 함수 (오디오 파일을 Base64로 변환)
  const handleSaveProject = async () => {
    // 오디오 트랙의 파일을 Base64로 변환
    const audioTracksForSave = await Promise.all(
      audioTracks.map(async (track) => {
        if (track.file) {
          // 파일이 있으면 Base64로 변환
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                ...track,
                src: e.target.result,
                file: undefined, // 파일 객체 제거
              });
            };
            reader.readAsDataURL(track.file);
          });
        }
        return track;
      })
    );

    const projectData = {
      name: "프로젝트_" + new Date().toISOString().slice(0, 19).replace(/:/g, "-"),
      layers: layers,
      clips: clips,
      audioTracks: audioTracksForSave,
      audioSrc: audioSrc,
      playhead: playhead,
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

    alert("프로젝트가 저장되었습니다!");
  };

  // 프로젝트 불러오기 함수
  const handleLoadProject = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target.result);
        
        // 프로젝트 데이터 복원
        if (projectData.layers) {
          setLayers(projectData.layers);
        }
        if (projectData.clips) {
          setClips(projectData.clips);
        }
        if (projectData.audioTracks) {
          setAudioTracks(projectData.audioTracks);
        }
        if (projectData.audioSrc) {
          setAudioSrc(projectData.audioSrc);
        }
        if (projectData.playhead !== undefined) {
          setPlayhead(projectData.playhead);
        } else {
          setPlayhead(0);
        }

        // 선택 상태 초기화
        setSelectedLayerIndex(null);
        setSelectedClipId(null);
        setSelectedAudioTrackId(null);
        setIsClipEditMode(false);
        setIsPlaying(false);

        alert(`프로젝트가 불러와졌습니다!\n클립: ${projectData.clips?.length || 0}개\n레이어: ${projectData.layers?.length || 0}개\n오디오 트랙: ${projectData.audioTracks?.length || 0}개`);
      } catch (error) {
        console.error("프로젝트 불러오기 오류:", error);
        alert("프로젝트 파일을 읽을 수 없습니다.");
      }
    };
    reader.readAsText(file);

    // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
    event.target.value = "";
  };

  // 비디오 분석 완료 핸들러
  const handleVideoAnalysisComplete = (result) => {
    console.log('비디오 분석 완료:', result);

    // ObjectURL 생성
    const videoUrl = URL.createObjectURL(result.videoFile);

    // 비디오 레이어 생성
    const videoLayer = {
      type: 'video',
      src: videoUrl,
      x: 0,
      y: 0,
      align: 'center',
      verticalAlign: 'middle',
      start: playhead,
      duration: result.videoLayer.duration,
      scale: 1,
      scaleMode: 'cover',
      opacity: 1,
      name: result.videoFile.name,
      _keyframeSuggestions: result.keyframeTimes, // 나중에 사용할 수 있도록 저장
    };

    // 레이어에 추가
    setLayers(prev => [...prev, videoLayer]);

    alert(`비디오가 추가되었습니다!\n길이: ${result.videoLayer.duration.toFixed(2)}초\n제안된 키프레임: ${result.keyframeTimes.length}개\n\n제안 시간: ${result.keyframeTimes.map(t => t.toFixed(1)).join(', ')}초`);
  };

  // showTemplates 상태 변화 추적 (최적화를 위해 로그 제거)

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

    // 클립 편집 모드는 0초부터 시작
    setPlayhead(0);
    setIsPlaying(false);

    // 클립의 오디오 찾기 및 설정
    const audioLayer = clip.layers.find((layer) => layer.type === "audio");
    const newAudioSrc = audioLayer ? audioLayer.src : "";
    console.log("클립 편집 모드 진입 - 오디오:", newAudioSrc);
    setAudioSrc(newAudioSrc);
    
    // 오디오 요소 리셋
    setTimeout(() => {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
      }
    }, 50);
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

      // 클립 타임라인으로 돌아갈 때는 0초로 설정 (간단하고 안정적)
      console.log("클립 타임라인 복귀 - Playhead 0으로 설정");
      setPlayhead(0);
      setSavedClipTimelinePlayhead(0);
      setIsPlaying(false);

      // 0초 위치의 오디오 찾기
      setTimeout(() => {
        const currentAudioSrc = getCurrentAudioSrc();
        console.log("클립 타임라인 복귀 - 오디오 설정:", currentAudioSrc);
        setAudioSrc(currentAudioSrc);
        
        // 오디오 요소 리셋
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
        }
      }, 100);
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
    if (!showTemplates && !showMusicLibrary) return;

    function handleClickOutside(e) {
      if (
        mediaLibraryRef.current &&
        !mediaLibraryRef.current.contains(e.target)
      ) {
        setShowTemplates(false);
        setShowMusicLibrary(false);
        setSelectedEffect(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTemplates, showMusicLibrary]);

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

  // clips 상태 변화 추적 (최적화를 위해 로그 제거)

  // 애니메이션 프레임 (최적화)
  useEffect(() => {

    // 오디오가 있을 때는 애니메이션 프레임을 사용하지 않음
    if (isPlaying && !audioSrc) {
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

  // 오디오 동기화 (최적화)
  useEffect(() => {
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
        // 오디오 재생 시작
        if (isFinite(playhead) && playhead >= 0) {
          audio.currentTime = playhead;
        } else {
          audio.currentTime = 0;
          setPlayhead(0);
        }
        audio
          .play()
          .then(() => {
            // 재생이 시작되면 동기화 시작
            lastUpdateTime = Date.now();
            animationId = requestAnimationFrame(syncPlayhead);
          })
          .catch((error) => {
            console.error("오디오 재생 실패:", error);
            // 오디오 재생 실패 시 애니메이션으로 대체
            setAudioSrc(""); // 오디오 소스를 비워서 애니메이션 모드로 전환
          });
      }
      // 오디오가 없으면 애니메이션 프레임에서 처리됨
    } else {
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

  // 템플릿 버튼 클릭 시 - public/template 폴더에서 자동으로 불러오기
  const handleTemplateButtonClick = async () => {
    console.log("템플릿 버튼 클릭됨!");
    setShowTemplates(true);
    
    try {
      const response = await fetch('/template/index.json');
      if (response.ok) {
        const data = await response.json();
        setTemplateFiles(data.templates || []);
        console.log("템플릿 파일 목록 불러오기 성공:", data.templates);
      } else {
        // index.json이 없으면 기본 목록 사용
        console.warn("템플릿 index.json을 찾을 수 없습니다. 기본 목록을 사용합니다.");
        setTemplateFiles(["EASING_DEMO", "LOVE", "WEDDING_01","SMOOTH_ANIMATION_EXAMPLE","MASK_ANIMATION_EXAMPLE"]);
      }
    } catch (error) {
      console.error("템플릿 목록 불러오기 실패:", error);
      // 에러 발생 시 기본 목록 사용
      setTemplateFiles(["EASING_DEMO", "LOVE", "WEDDING_01","SMOOTH_ANIMATION_EXAMPLE","MASK_ANIMATION_EXAMPLE"]);
    }
    
    console.log("showTemplates 상태 설정됨:", true);
  };

  // 음악 버튼 클릭 시 - public/files/music 폴더에서 자동으로 불러오기
  const handleMusicButtonClick = async () => {
    console.log("음악 버튼 클릭됨!");
    setShowMusicLibrary(true);
    
    try {
      const response = await fetch('/files/music/index.json');
      if (response.ok) {
        const data = await response.json();
        setMusicFiles(data.music || []);
        console.log("음악 파일 목록 불러오기 성공:", data.music);
      } else {
        // index.json이 없으면 기본 목록 사용
        console.warn("음악 index.json을 찾을 수 없습니다. 기본 목록을 사용합니다.");
        setMusicFiles(["DRAMA.mp3", "LOVE.mp3"]);
      }
    } catch (error) {
      console.error("음악 목록 불러오기 실패:", error);
      // 에러 발생 시 기본 목록 사용
      setMusicFiles(["DRAMA.mp3", "LOVE.mp3"]);
    }
    
    console.log("showMusicLibrary 상태 설정됨:", true);
  };

  // 음악 파일 선택 시
  const handleMusicFileSelect = (fileName) => {
    const audioUrl = `/files/music/${fileName}`;
    
    const audioTrack = {
      id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      src: audioUrl,
      start: 0,
      duration: 600, // 기본 10분
      volume: 1,
    };
    setAudioTracks((prev) => [...prev, audioTrack]);
    alert(`오디오 트랙이 추가되었습니다: ${fileName}`);
    
    setShowMusicLibrary(false);
    setSelectedEffect(null);
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
        // 클립의 레이어들을 현재 시간에 맞게 조정
        clip.layers.forEach((layer) => {
          // 레이어의 절대 시작/종료 시간 계산
          const layerAbsoluteStart = clipStart + layer.start;
          const layerAbsoluteEnd = layerAbsoluteStart + layer.duration;

          // 현재 시간이 이 레이어의 범위 내에 있는지 확인
          if (playhead >= layerAbsoluteStart && playhead < layerAbsoluteEnd) {
          const adjustedLayer = {
            ...layer,
              start: layerAbsoluteStart,
              // 레이어 내부 시간으로 정확히 조정 (레이어가 시작된 시점부터의 경과 시간)
              _clipTime: playhead - layerAbsoluteStart,
          };
          activeLayers.push(adjustedLayer);
          }
        });
      }
    });

    return activeLayers;
  };

  // 현재 활성화된 오디오 소스 계산 (오디오 트랙 우선) - 최적화
  const getCurrentAudioSrc = () => {
    // playhead 값이 유효하지 않으면 빈 문자열 반환
    if (!isFinite(playhead) || playhead < 0) {
      return "";
    }

    // 1. 오디오 트랙 확인 (최우선)
    if (!isClipEditMode && audioTracks.length > 0) {
      for (const track of audioTracks) {
        if (playhead >= track.start && playhead < track.start + track.duration) {
          return track.src;
        }
      }
    }

    // 2. 클립 편집 모드에서는 현재 레이어에서 오디오 찾기
    if (isClipEditMode) {
      const audioLayer = layers.find((layer) => layer.type === "audio");
      return audioLayer ? audioLayer.src : "";
    } 
    
    // 3. 클립 트랙 모드에서는 현재 시간에 해당하는 클립의 오디오 찾기
    for (const clip of clips) {
      if (playhead >= clip.start && playhead < clip.start + clip.duration) {
        const audioLayer = clip.layers.find((layer) => layer.type === "audio");
          if (audioLayer) {
            return audioLayer.src;
          }
        }
      }

    // 4. 기존 레이어에서도 오디오 찾기
      const audioLayer = layers.find((layer) => layer.type === "audio");
    return audioLayer ? audioLayer.src : "";
  };

  // 현재 오디오 소스 업데이트 (최적화)
  useEffect(() => {
    const currentAudioSrc = getCurrentAudioSrc();
    if (currentAudioSrc !== audioSrc) {
      setAudioSrc(currentAudioSrc);
    }
  }, [playhead, clips, layers, audioTracks, isClipEditMode]);

  return (
    <div className="video-editor">
      <EffectsPanel
        effects={effects}
        onSelectEffect={handleSelectEffect}
        onTemplateButtonClick={handleTemplateButtonClick}
        onMusicButtonClick={handleMusicButtonClick}
        selectedEffect={selectedEffect}
      />

      <div className="editor-container">
        <div className="editor-media-container">
          <div
            className={`media-library${showTemplates || showMusicLibrary ? " active" : ""}`}
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

            {/* 음악 라이브러리 모달 */}
            {showMusicLibrary && (
              <div className="template-list-modal music-library-modal">
                <h4>음악 파일 선택</h4>

                <ul className="music-file-list">
                  {musicFiles.map((file) => (
                    <li key={file}>
                      <button onClick={() => handleMusicFileSelect(file)}>
                        <i className="fa fa-music" style={{ marginRight: 10, fontSize: 24 }}></i>
                        <span>{file}</span>
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  className="close-btn"
                  onClick={() => {
                    setShowMusicLibrary(false);
                    setSelectedEffect(null);
                  }}
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
                if (!isPlaying && showTemplates) {
                  setShowTemplates(false); // 재생 시작 시 템플릿 모달 닫기
                }

                // 클립 트랙 모드에서 재생 시작 시 현재 시간에 해당하는 클립의 오디오 즉시 설정
                if (!isPlaying && !isClipEditMode && clips.length > 0) {
                  const currentAudioSrc = getCurrentAudioSrc();
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
                // 오디오 트랙이 선택된 경우
                if (selectedAudioTrackId !== null) {
                  handleRemoveAudioTrack(selectedAudioTrackId);
                }
                // 클립이 선택된 경우
                else if (selectedClipId !== null) {
                  handleClipRemove(selectedClipId);
                }
                // 레이어가 선택된 경우
                else if (selectedLayerIndex !== null && layers[selectedLayerIndex]) {
                  setLayers((layers) =>
                    layers.filter((_, i) => i !== selectedLayerIndex)
                  );
                  setSelectedLayerIndex(null);
                }
              }}
              disabled={selectedLayerIndex === null && selectedClipId === null && selectedAudioTrackId === null}
              style={{ marginLeft: 10 }}
              title="선택된 항목 삭제"
            >
              <i className="fa fa-trash"></i>
            </button>


            <button
              onClick={() => setShowVideoAnalyzer(true)}
              style={{ marginLeft: 10, background: "#9b59b6", color: "white", border: "none", padding: "8px 15px", borderRadius: "4px", cursor: "pointer" }}
              title="비디오 분석"
            >
              <i className="fa fa-film" style={{ marginRight: 5 }}></i>
              비디오 분석
            </button>

            <button 
              onClick={handleSaveProject}
              style={{ marginLeft: 10, background: "#27ae60", color: "white", border: "none", padding: "8px 15px", borderRadius: "4px", cursor: "pointer" }}
              title="프로젝트 저장"
            >
              <i className="fa fa-save" style={{ marginRight: 5 }}></i>
              저장
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ marginLeft: 5, background: "#2980b9", color: "white", border: "none", padding: "8px 15px", borderRadius: "4px", cursor: "pointer" }}
              title="프로젝트 불러오기"
            >
              <i className="fa fa-folder-open" style={{ marginRight: 5 }}></i>
              불러오기
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleLoadProject}
              style={{ display: "none" }}
            />

            <button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "녹화 중..." : "Export"}
            </button>
          </div>

          <Timeline
            mediaFiles={layers}
            clips={clips}
            audioTracks={audioTracks}
            onRemove={handleRemove}
            onClipDoubleClick={handleClipDoubleClick}
            onClipRemove={handleClipRemove}
            onClipResize={handleClipResize}
            onClipMove={handleClipMove}
            onSelectClip={setSelectedClipId}
            selectedClipId={selectedClipId}
            onAudioTrackRemove={handleRemoveAudioTrack}
            onAudioTrackResize={handleAudioTrackResize}
            onAudioTrackMove={handleAudioTrackMove}
            onSelectAudioTrack={setSelectedAudioTrackId}
            selectedAudioTrackId={selectedAudioTrackId}
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

      {/* 비디오 분석기 모달 */}
      {showVideoAnalyzer && (
        <VideoAnalyzer
          onAnalysisComplete={handleVideoAnalysisComplete}
          onClose={() => setShowVideoAnalyzer(false)}
        />
      )}
    </div>
  );
}

export default VideoEditor;
