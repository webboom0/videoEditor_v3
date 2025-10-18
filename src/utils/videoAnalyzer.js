// 비디오 분석 유틸리티
// 간단한 모션 감지 및 키프레임 제안

/**
 * 비디오에서 프레임을 추출하는 함수
 * @param {File} videoFile - 비디오 파일
 * @param {number} frameCount - 추출할 프레임 개수
 * @returns {Promise<Array>} - 프레임 이미지 배열
 */
export async function extractFrames(videoFile, frameCount = 10) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames = [];

    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoFile);

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      const interval = duration / frameCount;

      let currentFrame = 0;

      const captureFrame = () => {
        if (currentFrame >= frameCount) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }

        const time = currentFrame * interval;
        video.currentTime = time;

        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          frames.push({
            time: time,
            dataUrl: dataUrl,
            index: currentFrame,
          });

          currentFrame++;
          captureFrame();
        };
      };

      captureFrame();
    };

    video.onerror = () => {
      reject(new Error('비디오 로드 실패'));
    };
  });
}

/**
 * 간단한 모션 감지 (프레임 간 차이 계산)
 * @param {Array} frames - 프레임 배열
 * @returns {Promise<Array>} - 움직임이 큰 키프레임 시간
 */
export async function detectMotion(frames) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const motionScores = [];

  for (let i = 1; i < frames.length; i++) {
    const prev = await loadImage(frames[i - 1].dataUrl);
    const curr = await loadImage(frames[i].dataUrl);

    canvas.width = prev.width;
    canvas.height = prev.height;

    // 이전 프레임
    ctx.drawImage(prev, 0, 0);
    const prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 현재 프레임
    ctx.drawImage(curr, 0, 0);
    const currData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 픽셀 차이 계산
    let diff = 0;
    for (let j = 0; j < prevData.data.length; j += 4) {
      diff += Math.abs(prevData.data[j] - currData.data[j]);
    }

    motionScores.push({
      time: frames[i].time,
      score: diff / (canvas.width * canvas.height),
    });
  }

  // 움직임이 큰 순서로 정렬
  const sortedMotion = motionScores.sort((a, b) => b.score - a.score);

  // 상위 5개 시간을 키프레임으로 제안
  return sortedMotion.slice(0, 5).map(m => m.time).sort((a, b) => a - b);
}

/**
 * 비디오 분석 후 JSON 데이터 생성 (간단 버전)
 * @param {File} videoFile - 비디오 파일
 * @returns {Promise<Object>} - 생성된 레이어 JSON
 */
export async function analyzeVideoSimple(videoFile) {
  try {
    // 1. 프레임 추출
    console.log('프레임 추출 중...');
    const frames = await extractFrames(videoFile, 10);

    // 2. 모션 감지
    console.log('모션 감지 중...');
    const keyframeTimes = await detectMotion(frames);

    // 3. 비디오 정보 가져오기
    const videoUrl = URL.createObjectURL(videoFile);
    const videoDuration = await getVideoDuration(videoFile);

    // 4. JSON 데이터 생성 (기본 템플릿)
    const videoLayer = {
      type: 'video',
      src: videoUrl,
      x: 0,
      y: 0,
      align: 'center',
      verticalAlign: 'middle',
      start: 0,
      duration: videoDuration,
      scale: 1,
      scaleMode: 'cover',
      opacity: 1,
    };

    // 5. 키프레임 기반 애니메이션 제안 (예시)
    const suggestedAnimation = keyframeTimes.map((time, index) => ({
      time: time,
      x: (index % 2 === 0 ? -50 : 50),
      y: 0,
      scale: 1 + (index * 0.1),
      opacity: 1,
    }));

    return {
      videoLayer,
      keyframeTimes,
      suggestedAnimation,
      message: `${frames.length}개 프레임 분석 완료. ${keyframeTimes.length}개 키프레임 제안됨.`,
    };
  } catch (error) {
    console.error('비디오 분석 오류:', error);
    throw error;
  }
}

// 헬퍼 함수
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getVideoDuration(videoFile) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoFile);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = reject;
  });
}

