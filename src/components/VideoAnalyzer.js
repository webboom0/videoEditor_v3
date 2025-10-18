import React, { useState, useRef } from 'react';
import { analyzeVideoSimple, extractFrames } from '../utils/videoAnalyzer';

function VideoAnalyzer({ onAnalysisComplete, onClose }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('비디오 파일을 선택해주세요.');
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    event.target.value = '';
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;

    setIsAnalyzing(true);
    setProgress(0);

    try {
      // 프레임 추출 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await analyzeVideoSimple(videoFile);
      
      clearInterval(progressInterval);
      setProgress(100);
      setAnalysisResult(result);

      console.log('비디오 분석 완료:', result);
    } catch (error) {
      console.error('비디오 분석 실패:', error);
      alert('비디오 분석에 실패했습니다: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (analysisResult && onAnalysisComplete) {
      onAnalysisComplete({
        videoFile,
        videoLayer: analysisResult.videoLayer,
        keyframeTimes: analysisResult.keyframeTimes,
        suggestedAnimation: analysisResult.suggestedAnimation,
      });
      onClose && onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <h2 style={{ marginTop: 0 }}>🎬 비디오 분석기</h2>

        {/* 파일 선택 */}
        {!videoFile && (
          <div>
            <p>비디오 파일을 업로드하여 자동으로 키프레임을 분석합니다.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '15px 30px',
                fontSize: '16px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              📁 비디오 선택
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* 비디오 미리보기 */}
        {videoFile && !analysisResult && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <strong>선택된 파일:</strong> {videoFile.name}
            </div>

            {videoPreview && (
              <video
                src={videoPreview}
                controls
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  borderRadius: '5px',
                  marginBottom: '20px',
                }}
              />
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                style={{
                  padding: '15px 30px',
                  fontSize: '16px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  flex: 1,
                }}
              >
                {isAnalyzing ? '분석 중...' : '🔍 비디오 분석'}
              </button>

              <button
                onClick={() => {
                  setVideoFile(null);
                  setVideoPreview(null);
                }}
                style={{
                  padding: '15px 30px',
                  fontSize: '16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                다시 선택
              </button>
            </div>

            {isAnalyzing && (
              <div style={{ marginTop: '20px' }}>
                <div
                  style={{
                    background: '#e9ecef',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    height: '30px',
                  }}
                >
                  <div
                    style={{
                      background: '#28a745',
                      height: '100%',
                      width: `${progress}%`,
                      transition: 'width 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    {progress}%
                  </div>
                </div>
                <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
                  프레임 추출 및 모션 분석 중...
                </p>
              </div>
            )}
          </div>
        )}

        {/* 분석 결과 */}
        {analysisResult && (
          <div>
            <h3>✅ 분석 완료!</h3>
            
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
              <p><strong>파일명:</strong> {videoFile.name}</p>
              <p><strong>길이:</strong> {analysisResult.videoLayer.duration.toFixed(2)}초</p>
              <p><strong>제안된 키프레임:</strong> {analysisResult.keyframeTimes.length}개</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4>🎯 제안된 키프레임 시간</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {analysisResult.keyframeTimes.map((time, index) => (
                  <div
                    key={index}
                    style={{
                      background: '#007bff',
                      color: 'white',
                      padding: '8px 15px',
                      borderRadius: '20px',
                      fontSize: '14px',
                    }}
                  >
                    {time.toFixed(2)}초
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                💡 이 시간들에 큰 움직임이 감지되었습니다. 키프레임을 설정하면 효과적입니다!
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4>📝 생성될 JSON 미리보기</h4>
              <pre
                style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '5px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}
              >
                {JSON.stringify({
                  type: 'video',
                  src: videoFile.name,
                  duration: analysisResult.videoLayer.duration,
                  suggestedKeyframes: analysisResult.keyframeTimes,
                }, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleApply}
                style={{
                  padding: '15px 30px',
                  fontSize: '16px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                ✅ 타임라인에 추가
              </button>

              <button
                onClick={() => {
                  setAnalysisResult(null);
                  setVideoFile(null);
                  setVideoPreview(null);
                }}
                style={{
                  padding: '15px 30px',
                  fontSize: '16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                다시 분석
              </button>
            </div>
          </div>
        )}

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            fontSize: '14px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}

export default VideoAnalyzer;

