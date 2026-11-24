/**
 * QR 코드 생성 및 마우스 반응형 인터랙티브 웹 애플리케이션
 * - qrcode-generator 엔진 기반 안정적인 QR 인코딩 (한글, 긴 URL 완벽 지원)
 * - HTML5 Canvas 직접 렌더링 및 고해상도 JPG 파일 다운로드
 * - 마우스 커서 위치에 반응하는 60fps 부드러운 실시간 오로라 그라데이션 인터랙션
 */
document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 참조
  const body = document.body;
  const urlForm = document.getElementById('url-form');
  const urlInput = document.getElementById('url-input');
  const btnSubmit = document.getElementById('btn-submit');
  const btnClear = document.getElementById('btn-clear');
  const btnReset = document.getElementById('btn-reset');
  const qrCard = document.getElementById('qr-card');
  const qrcodeBox = document.getElementById('qrcode-box');
  const qrTargetUrl = document.getElementById('qr-target-url');
  const toast = document.getElementById('toast');

  let currentQrUrl = '';
  let toastTimer = null;
  let isGenerating = false;

  // 초기 포커스
  setTimeout(() => urlInput && urlInput.focus(), 250);

  /**
   * ==========================================================================
   * 1. 마우스 반응형 인터랙티브 그라데이션 엔진
   * ==========================================================================
   */
  function initInteractiveGradient() {
    const root = document.documentElement;

    // 현재 보간 좌표 (Lerp) 및 목표 좌표
    let currentX = window.innerWidth / 2;
    let currentY = window.innerHeight / 2;
    let targetX = currentX;
    let targetY = currentY;

    let currentHue = 0;
    let targetHue = 0;

    // 마우스 이동 이벤트 핸들러
    function onMouseMove(e) {
      targetX = e.clientX;
      targetY = e.clientY;

      const normX = targetX / window.innerWidth;  // 0.0 ~ 1.0
      const normY = targetY / window.innerHeight; // 0.0 ~ 1.0

      // 커서 위치에 따른 실시간 색상 변조 (-35도 ~ +35도)
      // 좌측/상단: 시안/민트 강조, 우측: 퍼플/마젠타, 하단: 앰버/골드
      targetHue = ((normX - 0.5) * 40) + ((normY - 0.5) * 30);
    }

    // 모바일 터치 이벤트 지원
    function onTouchMove(e) {
      if (e.touches.length > 0) {
        targetX = e.touches[0].clientX;
        targetY = e.touches[0].clientY;
        const normX = targetX / window.innerWidth;
        const normY = targetY / window.innerHeight;
        targetHue = ((normX - 0.5) * 40) + ((normY - 0.5) * 30);
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // 부드러운 감속 애니메이션 루프 (Linear Interpolation)
    function renderLoop() {
      // 0.08 감속 계수로 묵직하고 유기적인 움직임 연출
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      currentHue += (targetHue - currentHue) * 0.06;

      const ratioX = (currentX / window.innerWidth).toFixed(4);
      const ratioY = (currentY / window.innerHeight).toFixed(4);

      // CSS 변수 실시간 동기화
      root.style.setProperty('--mx', `${currentX.toFixed(1)}px`);
      root.style.setProperty('--my', `${currentY.toFixed(1)}px`);
      root.style.setProperty('--mouse-ratio-x', ratioX);
      root.style.setProperty('--mouse-ratio-y', ratioY);
      root.style.setProperty('--hue-shift', `${currentHue.toFixed(2)}deg`);

      requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);
  }

  // 인터랙티브 배경 초기화 실행
  initInteractiveGradient();

  /**
   * ==========================================================================
   * 2. 토스트 및 URL 유틸리티
   * ==========================================================================
   */
  function showToast(message, duration = 2800) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  function normalizeUrl(input) {
    let trimmed = input.trim();
    if (!trimmed) return '';

    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      return trimmed;
    }

    if (trimmed.includes('.') && !trimmed.includes(' ')) {
      return 'https://' + trimmed;
    }

    return trimmed;
  }

  function generateFileName(url) {
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
      return `qrcode_${host || 'download'}.jpg`;
    } catch {
      const sanitized = url.replace(/[^a-zA-Z0-9가-힣._-]/g, '_').substring(0, 24);
      return `qrcode_${sanitized || 'image'}.jpg`;
    }
  }

  /**
   * ==========================================================================
   * 3. QR 코드 Canvas 직접 렌더링
   * ==========================================================================
   */
  function renderQRToCanvas(qr, canvas, size, padding, darkColor = '#0f172a', lightColor = '#ffffff') {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 1. 흰색 배경 (JPG 투명도 에러 방지)
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, size, size);

    // 2. 모듈(점) 그리기
    const moduleCount = qr.getModuleCount();
    const drawSize = size - padding * 2;
    const cellSize = drawSize / moduleCount;

    ctx.fillStyle = darkColor;
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          const x = Math.round(padding + c * cellSize);
          const y = Math.round(padding + r * cellSize);
          const w = Math.round(padding + (c + 1) * cellSize) - x;
          const h = Math.round(padding + (r + 1) * cellSize) - y;
          ctx.fillRect(x, y, w, h);
        }
      }
    }
  }

  /**
   * ==========================================================================
   * 4. QR 코드 생성 및 UI 상태 전환
   * ==========================================================================
   */
  function generateQRCode() {
    if (isGenerating) return;

    const rawValue = urlInput.value.trim();

    if (!rawValue) {
      showToast('⚠️ URL을 입력해주세요.');
      urlInput.focus();
      return;
    }

    if (typeof qrcode !== 'function') {
      showToast('❌ QR 코드 엔진을 불러올 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    isGenerating = true;

    try {
      const targetUrl = normalizeUrl(rawValue);
      currentQrUrl = targetUrl;

      // TypeNumber 0 (길이에 따라 1~40 자동 조절), 오류 복구 'M'
      const qr = qrcode(0, 'M');
      qr.addData(targetUrl);
      qr.make();

      // 화면 표시용 캔버스 (240x240)
      const displayCanvas = document.createElement('canvas');
      displayCanvas.id = 'qr-display-canvas';
      renderQRToCanvas(qr, displayCanvas, 240, 14, '#0f172a', '#ffffff');

      // 기존 캔버스 교체
      qrcodeBox.innerHTML = '';
      qrcodeBox.appendChild(displayCanvas);

      // UI 상태 전환: 입력창 하단 이동 + 정중앙 QR 표시
      body.classList.remove('state-initial');
      body.classList.add('state-generated');

      // URL 메타 정보 표시
      qrTargetUrl.textContent = targetUrl;
      qrTargetUrl.title = targetUrl;

      // 보정된 URL 동기화
      urlInput.value = targetUrl;
      updateClearButton();

    } catch (err) {
      console.error('QR 코드 생성 오류 상세:', err);
      showToast(`❌ QR코드 생성 오류: ${err.message || '알 수 없는 오류'}`);
    } finally {
      isGenerating = false;
    }
  }

  /**
   * ==========================================================================
   * 5. 고해상도 JPG 파일 다운로드 (800x800)
   * ==========================================================================
   */
  function downloadAsJpg(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!currentQrUrl) return;

    try {
      const qr = qrcode(0, 'M');
      qr.addData(currentQrUrl);
      qr.make();

      const exportCanvas = document.createElement('canvas');
      const exportSize = 800;
      const exportPadding = 60; // 넉넉한 Quiet Zone

      renderQRToCanvas(qr, exportCanvas, exportSize, exportPadding, '#000000', '#ffffff');

      // JPG 포맷 변환 (선명한 흰색 배경)
      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.98);
      const fileName = generateFileName(currentQrUrl);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('📥 JPG 파일로 저장되었습니다!');
    } catch (err) {
      console.error('다운로드 오류 상세:', err);
      showToast(`❌ 다운로드 실패: ${err.message || '오류가 발생했습니다'}`);
    }
  }

  function updateClearButton() {
    if (urlInput.value.length > 0) {
      btnClear.style.display = 'flex';
    } else {
      btnClear.style.display = 'none';
    }
  }

  function resetToInitial() {
    body.classList.remove('state-generated');
    body.classList.add('state-initial');
    urlInput.focus();
    urlInput.select();
  }

  // ==========================================================================
  // 이벤트 등록
  // ==========================================================================
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateQRCode();
  });

  qrCard.addEventListener('click', downloadAsJpg);
  urlInput.addEventListener('input', updateClearButton);

  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    updateClearButton();
    urlInput.focus();
  });

  btnReset.addEventListener('click', resetToInitial);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.classList.contains('state-generated')) {
      resetToInitial();
    }
  });
});
