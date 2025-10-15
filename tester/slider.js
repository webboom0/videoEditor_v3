// 1. 캔버스 및 컨텍스트 설정
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// 2. 이미지 로드
const img = new Image();
img.src = 'data:image/webp;base64,UklGRqQLAABXRUJQVlA4WAoAAAAQAAAAswAAswAAQUxQSLwDAAABkEXbtulI9768pNq2bdu2bdu2bdu2bdu2bZQrevd8Fu4++eyOiAkQ//3/3/8+thEtdvxEiRMnihfLIX0gGTNnk9FrTz/6+CfEY1nu4J9v7x5eOqhWumg+i0xQb/Zlf4pY9eXYmLLRfQ8j5/BLborkgP2dU0gfQqYdfM9LUdJ5vHV8H8FeeXcIReHvC3Mb/EVrccuiKO7cX8bgza/JPdLRc7i4wZdR8Srp6tmWmavUW7ykcdC4mByZnX+T5o/L8pPmoCLtXTNi8iJrfyKIV7Nz4hjnJJA/Gkg24u5WBNM1ysZEqpuEVK31YyHrawJ7OBYDeT8S3DPx4eX9RIDPxQeX7T1BPhEbWtoXBHpvNGCxrxNqtUjCMncRbtUHlRxNyJ0VQFV3QqMPqSGlfk/gD/sBsu8h9Ko/oHYWPPLPCSflN2LwlB3NOuJQtQVTws0CvY8PxXaRmJwEpT5xGZgKiOMOGzQfSH3iMzAlDPMCIzQJRimLk6/xQMhNxGoHEMn9eblkw9CDeHXnhmBcYoYmQcgYxs0jE0Fv4taTF4A8xg4NBRDXn5/TUr9Kip+AuPqNJ35VWf2OM0RDtDN+crRTu3QWRy+kbtWIY1cs3fqypPLoNo8lqqPbHp566naFp0maGc95Wq6Z7RtP2zUzA3k6pJndzdNp3Syezunm5emMbk6eTmhm/uVpn2a2Dzxt1Ew+4Gm+ZuI0TyN128BTO90m8VRBt3YsWel0K6Y4CjR1i+fm6JrQXT7jaKl2YiNH7fXrzpAnp365vfx8MPUz3/GzQQBcyU9zBHXYCUyGIN4Pbo5JBGIDN+0ExCqKl9+JMUR/zstaAXIkK1YJFCn9OblsRyGXcdJUwMzu5ONpNBxyPR/tBNBMYVw8tCMRs5mwagmoiT7zcNjAIrooDoLyCLCO0xxMEHBz+eO7ExuP6KvQhRQRgM196AYIyElfY9ttYhLFgpA9SShQt/Xg+pVbwJYTFarQGgK4uUJhcrcX0B2bIHl6CvDRtgLy9JXoRLR1cNw9pMDvWGhhCWktBYe2YW4kP6oKLhv/wfEot+AzzwMUuxIKTuOsshAE97EJXo0mn/W7kV/wm2KzR6+AUTEEx0a1e0of7/4cguuYPT9qom7WsAnG4w/7poG638whmI/T+1kUs87Wswsf0FFjb0jU+bEkvyF8RJmy9/mwqPBnT+M4wqc0Urff9sGKDOeTJXUSSOGDRsvVYemVH85wqZCPJ2Y0SmcKH1b6pSvZfMDUpRt37tm9Y93CCb3qF0xuin/aBlZQOCDCBwAA0CsAnQEqtAC0AD5tNJZHpCMiIShUyViADYlN3C3OHzsz+zdY12T1XnrWn+3fibn30Iernxj/T6WvmCfqx0s/MR+0v6ze7d6Hf716gH9H/3nWM+gB+xnpu+xh+537jfAT+1n//6wDgE/wU/SvwCV5vAfMr4P6Syaf5D/rDgO+g0U8MD/Xnhgf688MD/XnheP95uQmSubGGIPi8GowSmJCyYh2OAEez722cjWY4nbF6II8BtC5crVp4LPLaVo5ZPf8HHxnXs2U/3pyDNzHOCecX+quBjdAuC2iIw4EYzNGPPUEl3wwAUTZuFcspWwjieLy6iKvcsbtytqNSsBF2fsESpos/JGsaf7/8uSKE7kuLE8wtHTU/J1IsWYHBEb+Wj94CdeRUMz9zAP5FpDt/0sUqST4zQJbZClWQRZ7DpKYW47imU5cncfUiIcfTRkX/aOq8IF8A3BXI782j48Im+Pkl7ct3Evbk4AA/v8rRAAAh/I0K57V/QhE8LVnV8dBwgMpQGMYqB+JNS8H6sZ4EjbfeM0QnVrUEP7zeP/4aB34+LQHU/zX3v6itQZBJn9AMXZlnnEnxaH6rACn/SA6X1cuj8fPeKQsbJzVWIk3x2p6dEmt+d9CKcfOlqXfmIVYKaDQcRAVyUNgt8SVGBMGCYuOVc+ncXflWLfv3syBj3Nx7/jC0PYS8Nwucu6kt4RX2kQLqizxlpMAXCQNAH0v5FS99d8rWmDTmWSyzOw6GvJrfuFkJvDfodvZJqSRhhinGWissOm/JUYwKHhATbOkLuzlh8R4k8oIc21GXtO8PTKe2bXSyZvRbLtrWvA+xS9yx0Fqf4xh3mMEZStAzxbXnxLZSXyMvIGVAQ9JL4ACK55W5GEGLzE8Eob5pFKNDnq1PUdJFZwmBnBwsGpzYJtlE8/j1Y/yTuvLl35OtvAdd7sc7iY4Ax/bHAF9r1Ew6zuZtmboHvqfAoQTmpxGUMQu9PWZxOeHwdPCl1ai/aY/W+gVuRy4Jk2ZHuPb4vXqzSP1g1s9XhX5/LOIk9PjFgEhsTNzRqEKKIkDGEYXpcVBVgSvDZATw99jkHmMhurl1KWa+OBdFzYPtOXLxJBg/hieHK5ZiNguoiYNRJGch/5PC+2Yfaj5HZJYzplMG8+f6GNrB2er6B6b7OVakKGUa7csUXYRHBtK8C+W6XtGtDC7bjfubLolplr/yRlqlsYMy8nmRmvT9KmV4GzuwQi9aX2Wbrqe9ljm3xUhyS1clgLZ/gSKnrl8tjp82bRnyde6vXb//4TwKgRRb99V94QASzkMJjEGa4CodBmPikfn81M0my1PLmUk7KR8K4Qg8I3HoM/z2th78ld52niMeIbGvwywNdcZk9D9buKaA0bi/GdBcYf3lftwZpBjki0EtoxTA7h2gXaze4nc4VogUIn3oDkSioo9E4hsydKwVNt+9B+QUZjbJBrpTfz6/SNj7Jo//jPNvwP0TJug713Q3ktZO0Xz//0Ido2zOOUu//+m3k9uIcDm9RfZriytM/FqYgPzL+nimqSoC7pobeTF+f4PxJvMjzWiPKjq5tw5NDx/r4xKC4FvOLNkpjNGtPgcPf3f8pswEZMohhdysjLE8Ci9s5at+d6qd2ZkkkWz6Xx+ilIJiFV5X9jjiofBBzxP0461kzVFM0G7EiLF0WDjc+NV8H0f9JfpSYGmnteolPsTp1/QVfnvx4Y04g1DjgH12qha8Q6QmMw2hvHTnWUq1Re38D+3vdf0B/H9nahAiRDfSDSpnZ/xaoNn7KQc84RSkmKKDwpw4YMNn1itwWyikXL759mZKcf+TNngzaRD0lBeefVTAybQwBzif9hvfw4tYqwAjYySgvUr75nYRsLYqc11VgcLTN8u4DTz3au+UOgdD63bEqd3xS5MZ5kbtaVwxuLgZgprf3y+LRBqR3zJHfSmMG+f9M+del9RRehT6TYhwqfdcRQ+DPRgYlSV/IdyyLP+du98RCt8bczPUAYRf/p4PgNCFuxn1k9liSBIWAi7KvfbpEH+7oUVtz+h8+6CwTG2w53aobTQBDKzq5cfE5JaWXwGQx3MukttOAHS/We+KKJ8gt0n/94R89d+NATcmh1OvyTdwCziygHkZfN/xpJRM4gUfUR4riY3+vd7VEui18Tzt9fEjpm4yHjB3kUx8PdciCBno/GujiWqcK/3dnQAK2QM7CoK15VBLjTk8by/epJMnaaRIN2FiMnHmFZpbAzcyG5ydMELsNPuMiG6a38l8qMG40vedIWR+Q2zly2PG+Pr09Wzv13CDZkAYqL/9SAU+imugPKn1hI4uSxPGgB2qoBHrkc8gzLyNepZclnzfqKsE4qP8ugE3gQk5gfcj989Yh/dzm6sVRsVEyZWKFNf1WFE4AvOzI7aWilBzTku+mD+7cbCR8vxLH7MW7pS2+UslMtD2KxYRAs1Y8NdEok0ogdwdqQ/ku0oc/ztkqzoFqmjPZea+m3QL/37FAWvsjlyRXVLZ7DBg8F4vl7zkm3/NrVvApw0Mi4eRe7mNjQBBsu3meOAAC/qubkJmDnF9tabctXSnM6CQj0xMnDSnmDQPQbOMcuTCbknwkFOlUOfiPnnAHkjINxmX51hehnOzgTayIszcIt7FhMvbLC2Bb5jiRkKAAAAAAAA'; // 여기에 사용할 이미지 경로를 넣어주세요.

// 3. 키프레임 기반 애니메이션 시스템
let animations = []; // 애니메이션 배열
let lastTime = 0; // 마지막 프레임 시간

// 랜덤 애니메이션 생성 함수
function createRandomAnimation(id) {
  const startTime = Math.random() * 2000; // 0~2000ms 랜덤 시작 시간
  const duration = 3000 + Math.random() * 4000; // 3000~7000ms 랜덤 지속 시간
  const keyframeCount = 2 + Math.floor(Math.random() * 3); // 2~4개 키프레임
  
  // 랜덤 Y 위치 (캔버스 경계 고려)
  const minY = 50;
  const maxY = canvas.height - 50;
  
  const keyframes = [];
  
  // 첫 번째 키프레임 (시작)
  keyframes.push({
    time: 0,
    x: -150,
    y: minY + Math.random() * (maxY - minY),
    rotation: 0
  });
  
  // 중간 키프레임들 (랜덤 개수)
  for (let i = 1; i < keyframeCount - 1; i++) {
    keyframes.push({
      time: (duration / (keyframeCount - 1)) * i,
      x: Math.random() * canvas.width,
      y: minY + Math.random() * (maxY - minY),
      rotation: Math.random() * Math.PI / 2 // 0~90도 랜덤
    });
  }
  
  // 마지막 키프레임 (끝)
  keyframes.push({
    time: duration,
    x: canvas.width + 150,
    y: minY + Math.random() * (maxY - minY),
    rotation: Math.random() * Math.PI / 2 // 0~90도 랜덤
  });
  
  return {
    id: id,
    startTime: startTime,
    currentTime: 0,
    duration: duration,
    loop: true,
    keyframes: keyframes
  };
}

// 키프레임 보간 함수
function interpolateKeyframes(animation, currentTime) {
  const keyframes = animation.keyframes;
  
  // 현재 시간이 첫 번째 키프레임보다 작으면 첫 번째 키프레임 반환
  if (currentTime <= keyframes[0].time) {
    return keyframes[0];
  }
  
  // 현재 시간이 마지막 키프레임보다 크면 마지막 키프레임 반환
  if (currentTime >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1];
  }
  
  // 현재 시간에 해당하는 키프레임 구간 찾기
  for (let i = 0; i < keyframes.length - 1; i++) {
    const kf1 = keyframes[i];
    const kf2 = keyframes[i + 1];
    
    if (currentTime >= kf1.time && currentTime <= kf2.time) {
      // 구간 내에서 진행률 계산
      const progress = (currentTime - kf1.time) / (kf2.time - kf1.time);
      
      // 각 속성 보간
      return {
        x: kf1.x + (kf2.x - kf1.x) * progress,
        y: kf1.y + (kf2.y - kf1.y) * progress,
        rotation: kf1.rotation + (kf2.rotation - kf1.rotation) * progress
      };
    }
  }
  
  // 기본값 반환 (이론적으로 도달하지 않음)
  return keyframes[0];
}

// 10개 애니메이션 생성
for (let i = 0; i < 10; i++) {
  animations.push(createRandomAnimation(i));
}

// 4. 애니메이션 루프 생성
function animate(currentTime) {
  // 매 프레임마다 캔버스를 깨끗하게 지웁니다.
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 첫 번째 프레임에서 시간 초기화
  if (lastTime === 0) {
    lastTime = currentTime;
  }

  // 각 애니메이션 처리
  animations.forEach(animation => {
    // 시작 시간이 되었는지 확인
    if (currentTime >= animation.startTime) {
      // 현재 애니메이션 시간 업데이트
      animation.currentTime = currentTime - animation.startTime;
      
      // 루프 처리
      if (animation.loop && animation.currentTime > animation.duration) {
        animation.currentTime = animation.currentTime % animation.duration;
      }
      
      // 키프레임 보간으로 현재 위치 계산
      const currentState = interpolateKeyframes(animation, animation.currentTime);
      
      // 이미지 그리기 (회전 적용)
      ctx.save(); // 현재 상태 저장
      
      // 이미지 중심점으로 이동
      const centerX = currentState.x + img.width / 2;
      const centerY = currentState.y;
      
      // 회전 중심점으로 이동하고 회전 적용
      ctx.translate(centerX, centerY);
      ctx.rotate(currentState.rotation);
      
      // 회전된 상태에서 이미지 그리기 (중심점 기준으로 그리기)
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      ctx.restore(); // 이전 상태 복원
    }
  });

  lastTime = currentTime;

  // 다음 프레임을 요청하여 애니메이션을 지속합니다.
  requestAnimationFrame(animate);
}

// 이미지가 모두 로드된 후에 애니메이션을 시작합니다.
img.onload = () => {
  animate();
};