// 레이어 데이터 저장소
let layers = [];
let selectedLayerIndex = null;

// duration 계산 함수
function getLayerDuration(layer) {
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
        return 0;
    }
    
    // duration이 지정되지 않은 경우 기본값
    return layer.duration || 0;
}

// 레이어 기본값
const defaultValues = {
    common: {
        x: 0,
        y: 0,
        align: 'center',
        verticalAlign: 'middle',
        start: 0,
        duration: 5,
        scale: 1,
        rotation: 0,
        opacity: 1
    },
    image: {
        src: '',
        scaleMode: 'cover'
    },
    shape: {
        shapeType: 'rect',
        width: 100,
        height: 100,
        fillColor: '#3498db',
        strokeColor: '',
        strokeWidth: 0,
        imageSrc: '',
        imageScaleMode: 'cover',
        imageAlign: 'center',
        imageVerticalAlign: 'middle'
    },
    text: {
        text: 'Sample Text',
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#ffffff',
        textAlign: 'left'
    },
    group: {
        children: []
    },
    effect: {
        effectType: 'flash',
        width: 640,
        height: 360,
        intensity: 0.5,
        color: '#ffffff',
        count: 12,
        amount: 0.15,
        loop: 'once',
        scaleMode: 'fit',
        maxFrameCount: 0,
        fps: 30
    }
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    renderLayersList();
});

// 모달 표시
function showAddLayerModal() {
    document.getElementById('addLayerModal').classList.add('active');
}

function showImportModal() {
    document.getElementById('importModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// 레이어 추가
function addLayer(type, parentIndex = null) {
    const newLayer = {
        type: type,
        ...defaultValues.common,
        ...defaultValues[type],
        animation: [{}]
    };

    if (parentIndex !== null) {
        // 부모 레이어의 children에 추가
        if (!layers[parentIndex].children) {
            layers[parentIndex].children = [];
        }
        layers[parentIndex].children.push(newLayer);
    } else {
        layers.push(newLayer);
    }

    closeModal('addLayerModal');
    renderLayersList();
    
    // 새로 추가된 레이어 선택
    if (parentIndex === null) {
        selectLayer(layers.length - 1);
    } else {
        selectLayer(parentIndex);
    }
}

// 레이어 삭제
function deleteLayer(index) {
    if (confirm('이 레이어를 삭제하시겠습니까?')) {
        layers.splice(index, 1);
        selectedLayerIndex = null;
        renderLayersList();
        renderEditor();
    }
}

// 자식 레이어 삭제
function deleteChildLayer(parentIndex, childIndex) {
    if (confirm('이 자식 레이어를 삭제하시겠습니까?')) {
        layers[parentIndex].children.splice(childIndex, 1);
        renderLayersList();
        selectLayer(parentIndex);
    }
}

// 레이어 선택
function selectLayer(index) {
    selectedLayerIndex = index;
    renderLayersList();
    renderEditor();
}

// 레이어 리스트 렌더링
function renderLayersList() {
    const listContainer = document.getElementById('layersList');
    
    if (layers.length === 0) {
        listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #858585;">레이어가 없습니다</div>';
        return;
    }

    listContainer.innerHTML = layers.map((layer, index) => `
        <div class="layer-item ${selectedLayerIndex === index ? 'active' : ''}" onclick="selectLayer(${index})">
            <div class="layer-item-header">
                <span class="layer-type">${getLayerTypeIcon(layer.type)} ${layer.type.toUpperCase()}</span>
                <div class="layer-actions">
                    ${layer.type === 'group' ? `<button class="layer-btn" onclick="event.stopPropagation(); addChildLayer(${index})">+ 자식</button>` : ''}
                    <button class="layer-btn delete" onclick="event.stopPropagation(); deleteLayer(${index})">삭제</button>
                </div>
            </div>
            <div class="layer-info">
                시작: ${layer.start}s | 길이: ${layer.duration === 'auto' ? `auto (${getLayerDuration(layer)}s)` : `${layer.duration}s`}
                ${layer.type === 'group' && layer.children ? ` | 자식: ${layer.children.length}개` : ''}
                ${layer.type === 'effect' ? ` | ${layer.effectType || 'effect'}` : ''}
            </div>
        </div>
    `).join('');
}

// 레이어 타입 아이콘
function getLayerTypeIcon(type) {
    const icons = {
        image: '🖼️',
        shape: '⬛',
        group: '📁',
        text: '📝',
        effect: '✨'
    };
    return icons[type] || '📄';
}

// 자식 레이어 추가
function addChildLayer(parentIndex) {
    const type = prompt('자식 레이어 타입을 입력하세요 (image, shape, text, effect):', 'shape');
    if (type && ['image', 'shape', 'text', 'effect'].includes(type)) {
        addLayer(type, parentIndex);
    } else if (type) {
        alert('올바른 타입을 입력하세요: image, shape, text, effect');
    }
}

// 에디터 영역 렌더링
function renderEditor() {
    const editorArea = document.getElementById('editorArea');
    
    if (selectedLayerIndex === null || !layers[selectedLayerIndex]) {
        editorArea.innerHTML = `
            <div class="empty-state">
                <h3>레이어를 선택하거나 추가하세요</h3>
                <p>왼쪽의 "+ 레이어 추가" 버튼을 클릭하여 새 레이어를 만들 수 있습니다</p>
            </div>
        `;
        return;
    }

    const layer = layers[selectedLayerIndex];
    
    editorArea.innerHTML = `
        ${renderCommonProperties(layer, selectedLayerIndex)}
        ${renderTypeSpecificProperties(layer, selectedLayerIndex)}
        ${renderAnimationSection(layer, selectedLayerIndex)}
        ${layer.type === 'group' ? renderChildrenSection(layer, selectedLayerIndex) : ''}
    `;
}

// 공통 속성 폼
function renderCommonProperties(layer, index) {
    return `
        <div class="form-section">
            <h3>기본 속성</h3>
            <div class="form-row-3">
                <div class="form-group">
                    <label>타입</label>
                    <input type="text" value="${layer.type}" readonly style="background: #2d2d30;">
                </div>
                <div class="form-group">
                    <label>시작 시간 (초)</label>
                    <input type="number" step="0.1" value="${layer.start}" onchange="updateLayerProperty(${index}, 'start', parseFloat(this.value))">
                </div>
                <div class="form-group">
                    <label>지속 시간 (초 또는 'auto')</label>
                    <input type="text" value="${layer.duration}" onchange="updateLayerProperty(${index}, 'duration', this.value === 'auto' || this.value === 'AUTO' ? 'auto' : parseFloat(this.value))" placeholder="숫자 또는 'auto'">
                    ${layer.duration === 'auto' ? `<span style="font-size: 12px; color: #888;"> (실제: ${getLayerDuration(layer)}초)</span>` : ''}
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>X 위치</label>
                    <input type="number" value="${layer.x}" onchange="updateLayerProperty(${index}, 'x', parseFloat(this.value))">
                </div>
                <div class="form-group">
                    <label>Y 위치</label>
                    <input type="number" value="${layer.y}" onchange="updateLayerProperty(${index}, 'y', parseFloat(this.value))">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>수평 정렬</label>
                    <select value="${layer.align}" onchange="updateLayerProperty(${index}, 'align', this.value)">
                        <option value="left" ${layer.align === 'left' ? 'selected' : ''}>왼쪽</option>
                        <option value="center" ${layer.align === 'center' ? 'selected' : ''}>가운데</option>
                        <option value="right" ${layer.align === 'right' ? 'selected' : ''}>오른쪽</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>수직 정렬</label>
                    <select value="${layer.verticalAlign}" onchange="updateLayerProperty(${index}, 'verticalAlign', this.value)">
                        <option value="top" ${layer.verticalAlign === 'top' ? 'selected' : ''}>위</option>
                        <option value="middle" ${layer.verticalAlign === 'middle' ? 'selected' : ''}>가운데</option>
                        <option value="bottom" ${layer.verticalAlign === 'bottom' ? 'selected' : ''}>아래</option>
                        <option value="0" ${layer.verticalAlign === '0' ? 'selected' : ''}>0 (커스텀)</option>
                    </select>
                </div>
            </div>
            <div class="form-row-3">
                <div class="form-group">
                    <label>크기 (Scale)</label>
                    <input type="number" step="0.1" value="${layer.scale || 1}" onchange="updateLayerProperty(${index}, 'scale', parseFloat(this.value))">
                </div>
                <div class="form-group">
                    <label>회전 (도)</label>
                    <input type="number" value="${layer.rotation || 0}" onchange="updateLayerProperty(${index}, 'rotation', parseFloat(this.value))">
                </div>
                <div class="form-group">
                    <label>불투명도</label>
                    <input type="number" step="0.1" min="0" max="1" value="${layer.opacity || 1}" onchange="updateLayerProperty(${index}, 'opacity', parseFloat(this.value))">
                </div>
            </div>
        </div>
    `;
}

// 타입별 속성 폼
function renderTypeSpecificProperties(layer, index) {
    switch (layer.type) {
        case 'image':
            return renderImageProperties(layer, index);
        case 'shape':
            return renderShapeProperties(layer, index);
        case 'text':
            return renderTextProperties(layer, index);
        case 'effect':
            return renderEffectProperties(layer, index);
        case 'group':
            return ''; // 그룹은 특별한 속성 없음
        default:
            return '';
    }
}

// 이미지 속성
function renderImageProperties(layer, index) {
    return `
        <div class="form-section">
            <h3>이미지 속성</h3>
            <div class="form-group">
                <label>이미지 경로</label>
                <input type="text" value="${layer.src || ''}" onchange="updateLayerProperty(${index}, 'src', this.value)" placeholder="/files/images/...">
            </div>
            <div class="form-group">
                <label>스케일 모드</label>
                <select onchange="updateLayerProperty(${index}, 'scaleMode', this.value)">
                    <option value="cover" ${layer.scaleMode === 'cover' ? 'selected' : ''}>Cover (채우기)</option>
                    <option value="contain" ${layer.scaleMode === 'contain' ? 'selected' : ''}>Contain (맞추기)</option>
                    <option value="fill" ${layer.scaleMode === 'fill' ? 'selected' : ''}>Fill (늘리기)</option>
                </select>
            </div>
        </div>
        ${renderMaskProperties(layer, index)}
    `;
}

// 마스크 속성
function renderMaskProperties(layer, index) {
    const hasMask = layer.mask && typeof layer.mask === 'object';
    const maskType = hasMask ? (layer.mask.type || 'circle') : 'circle';
    
    return `
        <div class="form-section">
            <h3>마스크 설정</h3>
            <div class="form-group">
                <label>
                    <input type="checkbox" ${hasMask ? 'checked' : ''} onchange="toggleMask(${index}, this.checked)">
                    마스크 사용
                </label>
            </div>
            ${hasMask ? `
                <div class="form-group">
                    <label>마스크 타입</label>
                    <select onchange="updateMaskProperty(${index}, 'type', this.value)">
                        <option value="circle" ${maskType === 'circle' ? 'selected' : ''}>원형</option>
                        <option value="ellipse" ${maskType === 'ellipse' ? 'selected' : ''}>타원형</option>
                        <option value="rect" ${maskType === 'rect' ? 'selected' : ''}>사각형</option>
                        <option value="roundRect" ${maskType === 'roundRect' ? 'selected' : ''}>라운드 사각형</option>
                        <option value="horizontal" ${maskType === 'horizontal' ? 'selected' : ''}>좌우 열림</option>
                        <option value="vertical" ${maskType === 'vertical' ? 'selected' : ''}>상하 열림</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>마스크 애니메이션</label>
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid #3c3c3c; padding: 10px; border-radius: 4px;">
                        ${renderMaskAnimation(layer, index)}
                    </div>
                    <button type="button" onclick="addMaskKeyframe(${index})" style="margin-top: 5px; width: 100%;">+ 키프레임 추가</button>
                </div>
            ` : ''}
        </div>
    `;
}

// 마스크 애니메이션 렌더링
function renderMaskAnimation(layer, index) {
    if (!layer.mask || !Array.isArray(layer.mask.animation)) {
        return '<p style="color: #888;">키프레임이 없습니다.</p>';
    }
    
    const maskType = layer.mask.type || 'circle';
    
    return layer.mask.animation.map((kf, kfIndex) => {
        let fields = `<span>time: <input type="number" step="0.1" value="${kf.time || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'time', parseFloat(this.value))" style="width: 60px;"></span>`;
        
        // 타입별 필드
        if (maskType === 'circle') {
            fields += `
                <span>x: <input type="number" value="${kf.x || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'x', parseFloat(this.value))" style="width: 60px;"></span>
                <span>y: <input type="number" value="${kf.y || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'y', parseFloat(this.value))" style="width: 60px;"></span>
                <span>radius: <input type="number" value="${kf.radius || 100}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'radius', parseFloat(this.value))" style="width: 60px;"></span>
                <span>rotation: <input type="number" step="0.1" value="${kf.rotation || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'rotation', parseFloat(this.value))" style="width: 60px;" title="라디안"></span>
            `;
        } else if (maskType === 'ellipse') {
            fields += `
                <span>x: <input type="number" value="${kf.x || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'x', parseFloat(this.value))" style="width: 60px;"></span>
                <span>y: <input type="number" value="${kf.y || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'y', parseFloat(this.value))" style="width: 60px;"></span>
                <span>radiusX: <input type="number" value="${kf.radiusX || 100}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'radiusX', parseFloat(this.value))" style="width: 60px;"></span>
                <span>radiusY: <input type="number" value="${kf.radiusY || 100}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'radiusY', parseFloat(this.value))" style="width: 60px;"></span>
                <span>rotation: <input type="number" step="0.1" value="${kf.rotation || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'rotation', parseFloat(this.value))" style="width: 60px;" title="라디안"></span>
            `;
        } else if (maskType === 'rect' || maskType === 'roundRect') {
            fields += `
                <span>x: <input type="number" value="${kf.x || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'x', parseFloat(this.value))" style="width: 60px;"></span>
                <span>y: <input type="number" value="${kf.y || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'y', parseFloat(this.value))" style="width: 60px;"></span>
                <span>width: <input type="number" value="${kf.width || 200}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'width', parseFloat(this.value))" style="width: 60px;"></span>
                <span>height: <input type="number" value="${kf.height || 200}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'height', parseFloat(this.value))" style="width: 60px;"></span>
            `;
            if (maskType === 'roundRect') {
                fields += `<span>radius: <input type="number" value="${kf.radius || 20}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'radius', parseFloat(this.value))" style="width: 60px;"></span>`;
            }
            fields += `<span>rotation: <input type="number" step="0.1" value="${kf.rotation || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'rotation', parseFloat(this.value))" style="width: 60px;" title="라디안"></span>`;
        } else if (maskType === 'horizontal' || maskType === 'vertical') {
            fields += `<span>progress: <input type="number" step="0.1" min="0" max="1" value="${kf.progress || 0}" onchange="updateMaskKeyframe(${index}, ${kfIndex}, 'progress', parseFloat(this.value))" style="width: 60px;"></span>`;
        }
        
        return `
            <div style="margin-bottom: 8px; padding: 8px; background: #2d2d30; border-radius: 4px;">
                ${fields}
                <button type="button" onclick="removeMaskKeyframe(${index}, ${kfIndex})" style="margin-left: 5px; padding: 2px 8px;">삭제</button>
            </div>
        `;
    }).join('');
}

// 도형 속성
function renderShapeProperties(layer, index) {
    return `
        <div class="form-section">
            <h3>도형 속성</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>도형 타입</label>
                    <select onchange="updateLayerProperty(${index}, 'shapeType', this.value)">
                        <option value="rect" ${layer.shapeType === 'rect' ? 'selected' : ''}>사각형</option>
                        <option value="circle" ${layer.shapeType === 'circle' ? 'selected' : ''}>원</option>
                        <option value="ellipse" ${layer.shapeType === 'ellipse' ? 'selected' : ''}>타원</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>너비</label>
                    <input type="number" value="${layer.width || 100}" onchange="updateLayerProperty(${index}, 'width', parseFloat(this.value))">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>높이</label>
                    <input type="number" value="${layer.height || 100}" onchange="updateLayerProperty(${index}, 'height', parseFloat(this.value))">
                </div>
                <div class="form-group">
                    <label>채우기 색상</label>
                    <input type="color" value="${layer.fillColor || '#3498db'}" onchange="updateLayerProperty(${index}, 'fillColor', this.value)">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>테두리 색상</label>
                    <input type="color" value="${layer.strokeColor || '#000000'}" onchange="updateLayerProperty(${index}, 'strokeColor', this.value)">
                </div>
                <div class="form-group">
                    <label>테두리 두께</label>
                    <input type="number" value="${layer.strokeWidth || 0}" onchange="updateLayerProperty(${index}, 'strokeWidth', parseFloat(this.value))">
                </div>
            </div>
            <div class="form-group">
                <label>내부 이미지 경로 (선택사항)</label>
                <input type="text" value="${layer.imageSrc || ''}" onchange="updateLayerProperty(${index}, 'imageSrc', this.value)" placeholder="/files/images/...">
            </div>
            ${layer.imageSrc ? `
                <div class="form-row">
                    <div class="form-group">
                        <label>이미지 스케일 모드</label>
                        <select onchange="updateLayerProperty(${index}, 'imageScaleMode', this.value)">
                            <option value="cover" ${layer.imageScaleMode === 'cover' ? 'selected' : ''}>Cover</option>
                            <option value="contain" ${layer.imageScaleMode === 'contain' ? 'selected' : ''}>Contain</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>이미지 수평 정렬</label>
                        <select onchange="updateLayerProperty(${index}, 'imageAlign', this.value)">
                            <option value="left" ${layer.imageAlign === 'left' ? 'selected' : ''}>왼쪽</option>
                            <option value="center" ${layer.imageAlign === 'center' ? 'selected' : ''}>가운데</option>
                            <option value="right" ${layer.imageAlign === 'right' ? 'selected' : ''}>오른쪽</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>이미지 수직 정렬</label>
                    <select onchange="updateLayerProperty(${index}, 'imageVerticalAlign', this.value)">
                        <option value="top" ${layer.imageVerticalAlign === 'top' ? 'selected' : ''}>위</option>
                        <option value="middle" ${layer.imageVerticalAlign === 'middle' ? 'selected' : ''}>가운데</option>
                        <option value="bottom" ${layer.imageVerticalAlign === 'bottom' ? 'selected' : ''}>아래</option>
                    </select>
                </div>
            ` : ''}
        </div>
    `;
}

// 텍스트 속성
function renderTextProperties(layer, index) {
    return `
        <div class="form-section">
            <h3>텍스트 속성</h3>
            <div class="form-group">
                <label>텍스트</label>
                <input type="text" value="${layer.text || ''}" onchange="updateLayerProperty(${index}, 'text', this.value)">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>폰트 크기</label>
                    <input type="number" value="${layer.fontSize || 24}" onchange="updateLayerProperty(${index}, 'fontSize', parseFloat(this.value))">
                </div>
                <div class="form-group">
                    <label>폰트</label>
                    <input type="text" value="${layer.fontFamily || 'Arial'}" onchange="updateLayerProperty(${index}, 'fontFamily', this.value)">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>폰트 굵기</label>
                    <select onchange="updateLayerProperty(${index}, 'fontWeight', this.value)">
                        <option value="normal" ${layer.fontWeight === 'normal' ? 'selected' : ''}>보통</option>
                        <option value="bold" ${layer.fontWeight === 'bold' ? 'selected' : ''}>굵게</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>텍스트 색상</label>
                    <input type="color" value="${layer.color || '#ffffff'}" onchange="updateLayerProperty(${index}, 'color', this.value)">
                </div>
            </div>
            <div class="form-group">
                <label>텍스트 정렬</label>
                <select onchange="updateLayerProperty(${index}, 'textAlign', this.value)">
                    <option value="left" ${layer.textAlign === 'left' ? 'selected' : ''}>왼쪽</option>
                    <option value="center" ${layer.textAlign === 'center' ? 'selected' : ''}>가운데</option>
                    <option value="right" ${layer.textAlign === 'right' ? 'selected' : ''}>오른쪽</option>
                </select>
            </div>
        </div>
    `;
}

// 이펙트 속성
function renderEffectProperties(layer, index) {
    const effectType = layer.effectType || 'flash';
    
    return `
        <div class="form-section">
            <h3>이펙트 속성</h3>
            <div class="form-group">
                <label>이펙트 타입</label>
                <select onchange="updateLayerProperty(${index}, 'effectType', this.value); renderEditor();">
                    <option value="flash" ${effectType === 'flash' ? 'selected' : ''}>번쩍임 (Flash)</option>
                    <option value="hearts" ${effectType === 'hearts' ? 'selected' : ''}>하트 파티클</option>
                    <option value="lovelyHearts" ${effectType === 'lovelyHearts' ? 'selected' : ''}>러블리 하트</option>
                    <option value="loveRain" ${effectType === 'loveRain' ? 'selected' : ''}>하트 비</option>
                    <option value="filmDust" ${effectType === 'filmDust' ? 'selected' : ''}>필름 먼지</option>
                    <option value="filmGrain" ${effectType === 'filmGrain' ? 'selected' : ''}>필름 그레인</option>
                    <option value="filmScratch" ${effectType === 'filmScratch' ? 'selected' : ''}>필름 스크래치</option>
                    <option value="filmBurn" ${effectType === 'filmBurn' ? 'selected' : ''}>필름 번</option>
                    <option value="frameSequence" ${effectType === 'frameSequence' ? 'selected' : ''}>프레임 시퀀스</option>
                    <option value="line" ${effectType === 'line' ? 'selected' : ''}>라인</option>
                </select>
            </div>
            ${renderEffectTypeSpecificProperties(layer, index, effectType)}
        </div>
    `;
}

// 이펙트 타입별 세부 속성
function renderEffectTypeSpecificProperties(layer, index, effectType) {
    switch (effectType) {
        case 'flash':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label>너비</label>
                        <input type="number" value="${layer.width || 640}" onchange="updateLayerProperty(${index}, 'width', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>높이</label>
                        <input type="number" value="${layer.height || 360}" onchange="updateLayerProperty(${index}, 'height', parseFloat(this.value))">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>강도 (0-1)</label>
                        <input type="number" step="0.1" min="0" max="1" value="${layer.intensity || 0.5}" onchange="updateLayerProperty(${index}, 'intensity', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>색상</label>
                        <input type="color" value="${layer.color || '#ffffff'}" onchange="updateLayerProperty(${index}, 'color', this.value)">
                    </div>
                </div>
            `;
        
        case 'hearts':
        case 'lovelyHearts':
        case 'loveRain':
            return `
                <div class="form-group">
                    <label>하트 개수</label>
                    <input type="number" min="1" max="100" value="${layer.count || 12}" onchange="updateLayerProperty(${index}, 'count', parseFloat(this.value))">
                </div>
            `;
        
        case 'filmDust':
        case 'filmScratch':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label>개수</label>
                        <input type="number" min="1" max="200" value="${layer.count || (effectType === 'filmDust' ? 80 : 8)}" onchange="updateLayerProperty(${index}, 'count', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>불투명도</label>
                        <input type="number" step="0.01" min="0" max="1" value="${layer.opacity || 0.25}" onchange="updateLayerProperty(${index}, 'opacity', parseFloat(this.value))">
                    </div>
                </div>
            `;
        
        case 'filmGrain':
            return `
                <div class="form-group">
                    <label>그레인 강도 (0-1)</label>
                    <input type="number" step="0.01" min="0" max="1" value="${layer.amount || 0.15}" onchange="updateLayerProperty(${index}, 'amount', parseFloat(this.value))">
                </div>
            `;
        
        case 'filmBurn':
            return `
                <div class="form-group">
                    <label>불투명도</label>
                    <input type="number" step="0.01" min="0" max="1" value="${layer.opacity || 0.18}" onchange="updateLayerProperty(${index}, 'opacity', parseFloat(this.value))">
                </div>
            `;
        
        case 'frameSequence':
            return `
                <div class="form-group">
                    <label>이름</label>
                    <input type="text" value="${layer.name || '프레임 시퀀스'}" onchange="updateLayerProperty(${index}, 'name', this.value)">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>최대 프레임 수</label>
                        <input type="number" value="${layer.maxFrameCount || 0}" onchange="updateLayerProperty(${index}, 'maxFrameCount', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>FPS</label>
                        <input type="number" value="${layer.fps || 30}" onchange="updateLayerProperty(${index}, 'fps', parseFloat(this.value))">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>반복</label>
                        <select onchange="updateLayerProperty(${index}, 'loop', this.value)">
                            <option value="once" ${layer.loop === 'once' ? 'selected' : ''}>한 번</option>
                            <option value="loop" ${layer.loop === 'loop' ? 'selected' : ''}>반복</option>
                            <option value="pingpong" ${layer.loop === 'pingpong' ? 'selected' : ''}>왕복</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>스케일 모드</label>
                        <select onchange="updateLayerProperty(${index}, 'scaleMode', this.value)">
                            <option value="fit" ${layer.scaleMode === 'fit' ? 'selected' : ''}>맞춤</option>
                            <option value="cover" ${layer.scaleMode === 'cover' ? 'selected' : ''}>덮기</option>
                            <option value="none" ${layer.scaleMode === 'none' ? 'selected' : ''}>원본</option>
                        </select>
                    </div>
                </div>
            `;
        
        case 'line':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label>라인 두께</label>
                        <input type="number" value="${layer.lineWidth || 5}" onchange="updateLayerProperty(${index}, 'lineWidth', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>색상</label>
                        <input type="color" value="${layer.color || '#ff0000'}" onchange="updateLayerProperty(${index}, 'color', this.value)">
                    </div>
                </div>
            `;
        
        default:
            return '';
    }
}

// 애니메이션 섹션
function renderAnimationSection(layer, index) {
    const animations = layer.animation || [];
    
    return `
        <div class="form-section">
            <h3>애니메이션 키프레임 <span class="info-badge">${animations.length}개</span></h3>
            <div class="animation-list">
                ${animations.map((keyframe, kfIndex) => `
                    <div class="animation-keyframe">
                        <div class="keyframe-header">
                            <span class="keyframe-title">키프레임 ${kfIndex + 1}</span>
                            <button class="layer-btn delete" onclick="deleteKeyframe(${index}, ${kfIndex})">삭제</button>
                        </div>
                        ${renderKeyframeProperties(keyframe, index, kfIndex)}
                    </div>
                `).join('')}
                <button class="add-keyframe-btn" onclick="addKeyframe(${index})">+ 키프레임 추가</button>
            </div>
        </div>
    `;
}

// 키프레임 속성
function renderKeyframeProperties(keyframe, layerIndex, kfIndex) {
    return `
        <div class="form-row-3">
            <div class="form-group">
                <label>시간 (초)</label>
                <input type="number" step="0.1" value="${keyframe.time !== undefined ? keyframe.time : ''}" 
                    onchange="updateKeyframeProperty(${layerIndex}, ${kfIndex}, 'time', this.value ? parseFloat(this.value) : undefined)"
                    placeholder="선택사항">
            </div>
            <div class="form-group">
                <label>X</label>
                <input type="number" value="${keyframe.x !== undefined ? keyframe.x : ''}" 
                    onchange="updateKeyframeProperty(${layerIndex}, ${kfIndex}, 'x', this.value ? parseFloat(this.value) : undefined)"
                    placeholder="선택사항">
            </div>
            <div class="form-group">
                <label>Y</label>
                <input type="number" value="${keyframe.y !== undefined ? keyframe.y : ''}" 
                    onchange="updateKeyframeProperty(${layerIndex}, ${kfIndex}, 'y', this.value ? parseFloat(this.value) : undefined)"
                    placeholder="선택사항">
            </div>
        </div>
        <div class="form-row-3">
            <div class="form-group">
                <label>Scale</label>
                <input type="number" step="0.1" value="${keyframe.scale !== undefined ? keyframe.scale : ''}" 
                    onchange="updateKeyframeProperty(${layerIndex}, ${kfIndex}, 'scale', this.value ? parseFloat(this.value) : undefined)"
                    placeholder="선택사항">
            </div>
            <div class="form-group">
                <label>회전 (도)</label>
                <input type="number" value="${keyframe.rotation !== undefined ? keyframe.rotation : ''}" 
                    onchange="updateKeyframeProperty(${layerIndex}, ${kfIndex}, 'rotation', this.value ? parseFloat(this.value) : undefined)"
                    placeholder="선택사항">
            </div>
            <div class="form-group">
                <label>불투명도</label>
                <input type="number" step="0.1" min="0" max="1" value="${keyframe.opacity !== undefined ? keyframe.opacity : ''}" 
                    onchange="updateKeyframeProperty(${layerIndex}, ${kfIndex}, 'opacity', this.value ? parseFloat(this.value) : undefined)"
                    placeholder="선택사항">
            </div>
        </div>
        <div class="form-group">
            <label>이징 (Easing)</label>
            <select onchange="updateKeyframeProperty(${layerIndex}, ${kfIndex}, 'easing', this.value || undefined)">
                <option value="" ${!keyframe.easing ? 'selected' : ''}>없음 (기본)</option>
                <option value="linear" ${keyframe.easing === 'linear' ? 'selected' : ''}>Linear</option>
                <option value="easeInQuad" ${keyframe.easing === 'easeInQuad' ? 'selected' : ''}>Ease In Quad</option>
                <option value="easeOutQuad" ${keyframe.easing === 'easeOutQuad' ? 'selected' : ''}>Ease Out Quad</option>
                <option value="easeInOutQuad" ${keyframe.easing === 'easeInOutQuad' ? 'selected' : ''}>Ease In-Out Quad</option>
                <option value="easeInCubic" ${keyframe.easing === 'easeInCubic' ? 'selected' : ''}>Ease In Cubic</option>
                <option value="easeOutCubic" ${keyframe.easing === 'easeOutCubic' ? 'selected' : ''}>Ease Out Cubic</option>
                <option value="easeInOutCubic" ${keyframe.easing === 'easeInOutCubic' ? 'selected' : ''}>Ease In-Out Cubic</option>
            </select>
        </div>
    `;
}

// 자식 레이어 섹션 (그룹용)
function renderChildrenSection(layer, index) {
    const children = layer.children || [];
    
    return `
        <div class="form-section">
            <h3>자식 레이어 <span class="info-badge">${children.length}개</span></h3>
            <div class="children-list">
                ${children.length === 0 ? '<div style="text-align: center; color: #858585; padding: 20px;">자식 레이어가 없습니다</div>' : ''}
                ${children.map((child, childIndex) => `
                    <div class="child-item">
                        <div class="child-info">
                            <strong>${getLayerTypeIcon(child.type)} ${child.type}</strong>
                            <span style="color: #858585; margin-left: 10px;">
                                ${child.type === 'text' ? `"${child.text || ''}"` : ''}
                                ${child.type === 'image' ? child.src || '(이미지 없음)' : ''}
                                ${child.type === 'shape' ? `${child.width}x${child.height}` : ''}
                                ${child.type === 'effect' ? `${child.effectType || 'effect'}` : ''}
                            </span>
                        </div>
                        <div class="layer-actions">
                            <button class="layer-btn" onclick="editChildLayer(${index}, ${childIndex})">편집</button>
                            <button class="layer-btn delete" onclick="deleteChildLayer(${index}, ${childIndex})">삭제</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="add-keyframe-btn" onclick="addChildLayer(${index})">+ 자식 레이어 추가</button>
        </div>
    `;
}

// 자식 레이어 편집
function editChildLayer(parentIndex, childIndex) {
    // 간단한 구현: 자식 레이어를 임시로 최상위로 올려서 편집
    const child = layers[parentIndex].children[childIndex];
    const childJSON = JSON.stringify(child, null, 2);
    
    const newJSON = prompt('자식 레이어 JSON을 편집하세요:', childJSON);
    if (newJSON) {
        try {
            const parsed = JSON.parse(newJSON);
            layers[parentIndex].children[childIndex] = parsed;
            renderLayersList();
            renderEditor();
        } catch (e) {
            alert('잘못된 JSON 형식입니다: ' + e.message);
        }
    }
}

// 레이어 속성 업데이트
function updateLayerProperty(index, property, value) {
    layers[index][property] = value;
    renderLayersList();
}

// 마스크 토글
function toggleMask(index, enabled) {
    if (enabled) {
        layers[index].mask = {
            type: 'circle',
            animation: [
                { time: 0, x: 0, y: 0, radius: 100 },
                { time: 2, x: 0, y: 0, radius: 500 }
            ]
        };
    } else {
        delete layers[index].mask;
    }
    renderEditor();
    renderLayersList();
}

// 마스크 속성 업데이트
function updateMaskProperty(index, property, value) {
    if (!layers[index].mask) return;
    
    layers[index].mask[property] = value;
    
    // 타입이 변경되면 기본 애니메이션 재생성
    if (property === 'type') {
        const maskType = value;
        if (maskType === 'circle') {
            layers[index].mask.animation = [
                { time: 0, x: 0, y: 0, radius: 100 },
                { time: 2, x: 0, y: 0, radius: 500 }
            ];
        } else if (maskType === 'ellipse') {
            layers[index].mask.animation = [
                { time: 0, x: 0, y: 0, radiusX: 100, radiusY: 100 },
                { time: 2, x: 0, y: 0, radiusX: 500, radiusY: 300 }
            ];
        } else if (maskType === 'rect') {
            layers[index].mask.animation = [
                { time: 0, x: 0, y: 0, width: 200, height: 200 },
                { time: 2, x: 0, y: 0, width: 800, height: 600 }
            ];
        } else if (maskType === 'roundRect') {
            layers[index].mask.animation = [
                { time: 0, x: 0, y: 0, width: 200, height: 200, radius: 20 },
                { time: 2, x: 0, y: 0, width: 800, height: 600, radius: 50 }
            ];
        } else if (maskType === 'horizontal' || maskType === 'vertical') {
            layers[index].mask.animation = [
                { time: 0, progress: 0 },
                { time: 2, progress: 1 }
            ];
        }
    }
    
    renderEditor();
    renderLayersList();
}

// 마스크 키프레임 추가
function addMaskKeyframe(index) {
    if (!layers[index].mask) return;
    
    const mask = layers[index].mask;
    const maskType = mask.type || 'circle';
    
    if (!Array.isArray(mask.animation)) {
        mask.animation = [];
    }
    
    const lastKf = mask.animation[mask.animation.length - 1] || {};
    const lastTime = lastKf.time || 0;
    
    let newKf = { time: lastTime + 1 };
    
    // 타입별 기본값
    if (maskType === 'circle') {
        newKf = { ...newKf, x: lastKf.x || 0, y: lastKf.y || 0, radius: lastKf.radius || 100 };
    } else if (maskType === 'ellipse') {
        newKf = { ...newKf, x: lastKf.x || 0, y: lastKf.y || 0, radiusX: lastKf.radiusX || 100, radiusY: lastKf.radiusY || 100 };
    } else if (maskType === 'rect' || maskType === 'roundRect') {
        newKf = { ...newKf, x: lastKf.x || 0, y: lastKf.y || 0, width: lastKf.width || 200, height: lastKf.height || 200 };
        if (maskType === 'roundRect') {
            newKf.radius = lastKf.radius || 20;
        }
    } else if (maskType === 'horizontal' || maskType === 'vertical') {
        newKf = { ...newKf, progress: lastKf.progress || 0 };
    }
    
    mask.animation.push(newKf);
    renderEditor();
    renderLayersList();
}

// 마스크 키프레임 업데이트
function updateMaskKeyframe(layerIndex, kfIndex, property, value) {
    if (!layers[layerIndex].mask || !layers[layerIndex].mask.animation) return;
    
    layers[layerIndex].mask.animation[kfIndex][property] = value;
    renderLayersList();
}

// 마스크 키프레임 삭제
function removeMaskKeyframe(layerIndex, kfIndex) {
    if (!layers[layerIndex].mask || !layers[layerIndex].mask.animation) return;
    
    layers[layerIndex].mask.animation.splice(kfIndex, 1);
    renderEditor();
    renderLayersList();
}

// 키프레임 속성 업데이트
function updateKeyframeProperty(layerIndex, kfIndex, property, value) {
    if (value === undefined || value === '') {
        delete layers[layerIndex].animation[kfIndex][property];
    } else {
        layers[layerIndex].animation[kfIndex][property] = value;
    }
}

// 키프레임 추가
function addKeyframe(layerIndex) {
    if (!layers[layerIndex].animation) {
        layers[layerIndex].animation = [];
    }
    layers[layerIndex].animation.push({});
    renderEditor();
}

// 키프레임 삭제
function deleteKeyframe(layerIndex, kfIndex) {
    layers[layerIndex].animation.splice(kfIndex, 1);
    renderEditor();
}

// JSON 내보내기
function exportJSON() {
    const json = JSON.stringify(layers, null, 2);
    document.getElementById('exportTextarea').value = json;
    document.getElementById('exportModal').classList.add('active');
}

// JSON 가져오기
function importJSON() {
    const json = document.getElementById('importTextarea').value;
    try {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) {
            layers = parsed;
            selectedLayerIndex = null;
            renderLayersList();
            renderEditor();
            closeModal('importModal');
            alert('JSON을 성공적으로 가져왔습니다!');
        } else {
            alert('JSON은 배열 형식이어야 합니다.');
        }
    } catch (e) {
        alert('잘못된 JSON 형식입니다: ' + e.message);
    }
}

// 클립보드에 복사
function copyToClipboard() {
    const textarea = document.getElementById('exportTextarea');
    textarea.select();
    document.execCommand('copy');
    alert('클립보드에 복사되었습니다!');
}

// 전체 삭제
function clearAll() {
    if (confirm('모든 레이어를 삭제하시겠습니까?')) {
        layers = [];
        selectedLayerIndex = null;
        renderLayersList();
        renderEditor();
    }
}

