/**
 * 레이어의 실제 duration 계산
 * duration이 "auto"인 경우 animation 배열의 마지막 time 값을 반환
 * @param {Object} layer - 레이어 객체
 * @returns {number} - 계산된 duration (초 단위)
 */
export function getLayerDuration(layer) {
  // duration이 명시적으로 숫자로 지정된 경우
  if (typeof layer.duration === 'number') {
    return layer.duration;
  }

  // duration이 "auto"인 경우
  if (layer.duration === 'auto' || layer.duration === 'AUTO') {
    // animation 배열이 있고 비어있지 않은 경우
    if (Array.isArray(layer.animation) && layer.animation.length > 0) {
      // 마지막 키프레임의 time 값을 찾음
      const lastKeyframe = layer.animation[layer.animation.length - 1];
      if (lastKeyframe && typeof lastKeyframe.time === 'number') {
        return lastKeyframe.time;
      }
    }
    
    // animation이 없거나 유효하지 않은 경우 기본값 0
    console.warn(`레이어의 duration이 "auto"이지만 유효한 animation을 찾을 수 없습니다:`, layer);
    return 0;
  }

  // duration이 지정되지 않은 경우 기본값
  return layer.duration || 0;
}

/**
 * 레이어의 종료 시간 계산
 * @param {Object} layer - 레이어 객체
 * @returns {number} - 레이어 종료 시간 (초 단위)
 */
export function getLayerEndTime(layer) {
  const start = layer.start || 0;
  const duration = getLayerDuration(layer);
  return start + duration;
}

/**
 * 레이어가 특정 시간에 활성화되어 있는지 확인
 * @param {Object} layer - 레이어 객체
 * @param {number} currentTime - 현재 시간 (초 단위)
 * @returns {boolean} - 레이어가 활성화되어 있으면 true
 */
export function isLayerActive(layer, currentTime) {
  const start = layer.start || 0;
  const endTime = getLayerEndTime(layer);
  return currentTime >= start && currentTime < endTime;
}

