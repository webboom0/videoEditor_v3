// Easing 함수 모음
// t는 0~1 사이의 값

export const EASING_FUNCTIONS = {
  // 선형 (기본)
  linear: (t) => t,

  // Ease In (천천히 시작)
  easeInQuad: (t) => t * t,
  easeInCubic: (t) => t * t * t,
  easeInQuart: (t) => t * t * t * t,
  easeInQuint: (t) => t * t * t * t * t,
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeInBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },

  // Ease Out (천천히 끝)
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  // Ease In-Out (양쪽 모두)
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInOutExpo: (t) =>
    t === 0
      ? 0
      : t === 1
      ? 1
      : t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2,
  easeInOutCirc: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  easeInOutBack: (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic (탄성)
  easeInElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInOutElastic: (t) => {
    const c5 = (2 * Math.PI) / 4.5;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },

  // Bounce (튕김)
  easeInBounce: (t) => 1 - EASING_FUNCTIONS.easeOutBounce(1 - t),
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  easeInOutBounce: (t) =>
    t < 0.5
      ? (1 - EASING_FUNCTIONS.easeOutBounce(1 - 2 * t)) / 2
      : (1 + EASING_FUNCTIONS.easeOutBounce(2 * t - 1)) / 2,
};

/**
 * Easing 함수 적용
 * @param {number} t - 진행률 (0~1)
 * @param {string} easingName - easing 함수 이름
 * @returns {number} - easing이 적용된 값 (0~1)
 */
export function applyEasing(t, easingName = 'linear') {
  const easingFunc = EASING_FUNCTIONS[easingName];
  if (!easingFunc) {
    console.warn(`알 수 없는 easing 함수: ${easingName}, linear 사용`);
    return t;
  }
  return easingFunc(t);
}

/**
 * 두 값 사이를 easing으로 보간
 * @param {number} start - 시작 값
 * @param {number} end - 끝 값
 * @param {number} t - 진행률 (0~1)
 * @param {string} easing - easing 함수 이름
 * @returns {number} - 보간된 값
 */
export function interpolateWithEasing(start, end, t, easing = 'linear') {
  const easedT = applyEasing(t, easing);
  return start + (end - start) * easedT;
}

// Easing 이름 목록 (UI에서 선택할 수 있도록)
export const EASING_NAMES = Object.keys(EASING_FUNCTIONS);

// Easing 카테고리별 분류
export const EASING_CATEGORIES = {
  '기본': ['linear'],
  '부드러운 시작': ['easeInQuad', 'easeInCubic', 'easeInQuart', 'easeInSine'],
  '부드러운 끝': ['easeOutQuad', 'easeOutCubic', 'easeOutQuart', 'easeOutSine'],
  '양쪽 부드럽게': ['easeInOutQuad', 'easeInOutCubic', 'easeInOutSine'],
  '탄성': ['easeInElastic', 'easeOutElastic', 'easeInOutElastic'],
  '튕김': ['easeInBounce', 'easeOutBounce', 'easeInOutBounce'],
  '백스윙': ['easeInBack', 'easeOutBack', 'easeInOutBack'],
  '강한 효과': ['easeInExpo', 'easeOutExpo', 'easeInOutExpo'],
};

