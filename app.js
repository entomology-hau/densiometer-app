(() => {
  'use strict';

  const DOT_VALUE = 100 / 96;
  const COARSE_POINTER = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const DEVICE_MEMORY_GB = Number(navigator.deviceMemory || 4);
  const MAX_ANALYSIS_SIDE = (COARSE_POINTER || DEVICE_MEMORY_GB <= 4) ? 1600 : 1800;
  const MAX_VIEWPORT_SIDE = COARSE_POINTER ? 840 : 960;
  const MIN_PAN_ZOOM = 1.15;
  const MIN_VIEWPORT_SIDE = 420;
  const STORAGE_KEY = 'mobile-overstory-density-readings-v1';

  const els = {
    offlineStatus: document.getElementById('offlineStatus'),
    uploadInput: document.getElementById('uploadInput'),
    cameraInput: document.getElementById('cameraInput'),
    addPhotoButton: document.getElementById('addPhotoButton'),
    addPhotoButtonCanvas: document.getElementById('addPhotoButtonCanvas'),
    photoSheet: document.getElementById('photoSheet'),
    chooseCamera: document.getElementById('chooseCamera'),
    chooseLibrary: document.getElementById('chooseLibrary'),
    cancelPhotoSheet: document.getElementById('cancelPhotoSheet'),
    imageMeta: document.getElementById('imageMeta'),
    imageZoom: document.getElementById('imageZoom'),
    imageZoomValue: document.getElementById('imageZoomValue'),
    imageZoomQuick: document.getElementById('imageZoomQuick'),
    imageZoomQuickValue: document.getElementById('imageZoomQuickValue'),
    imageOffsetX: document.getElementById('imageOffsetX'),
    imageOffsetXValue: document.getElementById('imageOffsetXValue'),
    imageOffsetXQuick: document.getElementById('imageOffsetXQuick'),
    imageOffsetXQuickValue: document.getElementById('imageOffsetXQuickValue'),
    imageOffsetY: document.getElementById('imageOffsetY'),
    imageOffsetYValue: document.getElementById('imageOffsetYValue'),
    imageOffsetYQuick: document.getElementById('imageOffsetYQuick'),
    imageOffsetYQuickValue: document.getElementById('imageOffsetYQuickValue'),
    positionStatus: document.getElementById('positionStatus'),
    resetImagePosition: document.getElementById('resetImagePosition'),
    resetImagePositionQuick: document.getElementById('resetImagePositionQuick'),
    resetOverlay: document.getElementById('resetOverlay'),
    resetOverlayQuick: document.getElementById('resetOverlayQuick'),
    overlayStatus: document.getElementById('overlayStatus'),
    gridMode: document.getElementById('gridMode'),
    classifierMode: document.getElementById('classifierMode'),
    negativeImage: document.getElementById('negativeImage'),
    pixelSensitivity: document.getElementById('pixelSensitivity'),
    pixelSensitivityValue: document.getElementById('pixelSensitivityValue'),
    autoThreshold: document.getElementById('autoThreshold'),
    recalcThreshold: document.getElementById('recalcThreshold'),
    threshold: document.getElementById('threshold'),
    thresholdValue: document.getElementById('thresholdValue'),
    patchSize: document.getElementById('patchSize'),
    patchValue: document.getElementById('patchValue'),
    roiX: document.getElementById('roiX'),
    roiY: document.getElementById('roiY'),
    roiR: document.getElementById('roiR'),
    roiXValue: document.getElementById('roiXValue'),
    roiYValue: document.getElementById('roiYValue'),
    roiRValue: document.getElementById('roiRValue'),
    analyseButton: document.getElementById('analyseButton'),
    analyseQuick: document.getElementById('analyseQuick'),
    resetOverrides: document.getElementById('resetOverrides'),
    canvas: document.getElementById('imageCanvas'),
    imagePanel: document.getElementById('imagePanel'),
    canvasPlaceholder: document.getElementById('canvasPlaceholder'),
    analysisAreaReadout: document.getElementById('analysisAreaReadout'),
    dotDensity: document.getElementById('dotDensity'),
    pixelDensity: document.getElementById('pixelDensity'),
    skyDots: document.getElementById('skyDots'),
    canopyDots: document.getElementById('canopyDots'),
    thresholdReadout: document.getElementById('thresholdReadout'),
    sensitivityReadout: document.getElementById('sensitivityReadout'),
    negativeReadout: document.getElementById('negativeReadout'),
    pixelCount: document.getElementById('pixelCount'),
    direction: document.getElementById('direction'),
    notes: document.getElementById('notes'),
    saveReading: document.getElementById('saveReading'),
    saveReadingQuick: document.getElementById('saveReadingQuick'),
    copySummary: document.getElementById('copySummary'),
    dotDensityMobile: document.getElementById('dotDensityMobile'),
    pixelDensityMobile: document.getElementById('pixelDensityMobile'),
    readingsSummary: document.getElementById('readingsSummary'),
    readingsTable: document.getElementById('readingsTable'),
    exportCsv: document.getElementById('exportCsv'),
    clearReadings: document.getElementById('clearReadings'),
    quickAddPhoto: document.getElementById('quickAddPhoto'),
    quickAnalyse: document.getElementById('quickAnalyse'),
    quickSave: document.getElementById('quickSave')
  };

  const state = {
    sourceCanvas: document.createElement('canvas'),
    sourceCtx: null,
    analysisCanvas: document.createElement('canvas'),
    analysisCtx: null,
    negativeCanvas: document.createElement('canvas'),
    negativeCtx: null,
    imageData: null,
    imageName: '',
    imageSource: '',
    imageScale: 1,
    originalWidth: 0,
    originalHeight: 0,
    view: {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      sourceTransform: null
    },
    threshold: 0.5,
    overrideClassByDotId: new Map(),
    dotResults: [],
    current: null,
    readings: loadReadings(),
    display: {
      width: 0,
      height: 0,
      scaleX: 1,
      scaleY: 1,
      dpr: 1
    },
    gesture: {
      activePointers: new Map(),
      startX: 0,
      startY: 0,
      startZoom: 1,
      startOffsetX: 0,
      startOffsetY: 0,
      startDistance: 0,
      didManipulate: false
    },
    suppressNextCanvasClick: false,
    analysisTimer: null,
    photoSheetOpener: null
  };

  state.sourceCtx = state.sourceCanvas.getContext('2d');
  state.analysisCtx = state.analysisCanvas.getContext('2d', { willReadFrequently: true });
  state.negativeCtx = state.negativeCanvas.getContext('2d');
  const drawCtx = els.canvas.getContext('2d');

  init();

  function init() {
    updateNetworkStatus();
    updateViewportCssVars();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    registerServiceWorker();

    updateControlOutputs();
    setAnalysisControlsEnabled(false);
    updateReadingsUI();
    updateMobileMetric();

    els.uploadInput.addEventListener('change', (event) => handleImageInput(event, 'Photo library/files'));
    if (els.cameraInput) {
      els.cameraInput.addEventListener('change', (event) => handleImageInput(event, 'Camera capture'));
    }
    [els.addPhotoButton, els.addPhotoButtonCanvas].forEach((button) => {
      if (button) button.addEventListener('click', openPhotoSheet);
    });
    if (els.chooseCamera) {
      els.chooseCamera.addEventListener('click', () => triggerFileInput(els.cameraInput));
    }
    if (els.chooseLibrary) {
      els.chooseLibrary.addEventListener('click', () => triggerFileInput(els.uploadInput));
    }
    if (els.cancelPhotoSheet) {
      els.cancelPhotoSheet.addEventListener('click', closePhotoSheet);
    }
    if (els.photoSheet) {
      els.photoSheet.addEventListener('click', (event) => {
        if (event.target === els.photoSheet) closePhotoSheet();
      });
    }

    els.analyseButton.addEventListener('click', () => runAnalysis({ forceAutoThreshold: els.autoThreshold.checked }));
    if (els.analyseQuick) {
      els.analyseQuick.addEventListener('click', () => runAnalysis({ forceAutoThreshold: els.autoThreshold.checked }));
    }
    if (els.quickAddPhoto) {
      els.quickAddPhoto.addEventListener('click', openPhotoSheet);
    }
    if (els.quickAnalyse) {
      els.quickAnalyse.addEventListener('click', () => runAnalysis({ forceAutoThreshold: els.autoThreshold.checked }));
    }
    if (els.quickSave) {
      els.quickSave.addEventListener('click', saveCurrentReading);
    }
    els.resetOverrides.addEventListener('click', () => {
      state.overrideClassByDotId.clear();
      runAnalysis({ forceAutoThreshold: false });
    });

    els.recalcThreshold.addEventListener('click', () => {
      els.autoThreshold.checked = true;
      runAnalysis({ forceAutoThreshold: true });
    });

    els.autoThreshold.addEventListener('change', () => {
      runAnalysis({ forceAutoThreshold: els.autoThreshold.checked });
    });

    els.threshold.addEventListener('input', () => {
      els.autoThreshold.checked = false;
      state.threshold = Number(els.threshold.value) / 100;
      updateControlOutputs();
      scheduleAnalysis({ forceAutoThreshold: false });
    });

    [els.imageZoom, els.imageOffsetX, els.imageOffsetY, els.imageZoomQuick, els.imageOffsetXQuick, els.imageOffsetYQuick].filter(Boolean).forEach((control) => {
      ['input', 'change'].forEach((eventName) => {
        control.addEventListener(eventName, () => handleImageViewControlInput(control));
      });
    });

    els.resetImagePosition.addEventListener('click', resetImagePositionAndAnalyse);
    if (els.resetImagePositionQuick) {
      els.resetImagePositionQuick.addEventListener('click', resetImagePositionAndAnalyse);
    }
    if (els.resetOverlay) {
      els.resetOverlay.addEventListener('click', resetOverlayAndAnalyse);
    }
    if (els.resetOverlayQuick) {
      els.resetOverlayQuick.addEventListener('click', resetOverlayAndAnalyse);
    }

    [els.gridMode, els.classifierMode, els.patchSize, els.roiX, els.roiY, els.roiR].filter(Boolean).forEach((control) => {
      control.addEventListener('input', () => {
        updateControlOutputs();
        if (control === els.gridMode) state.overrideClassByDotId.clear();
        scheduleAnalysis({ forceAutoThreshold: els.autoThreshold.checked });
      });
    });

    els.negativeImage.addEventListener('change', () => {
      updateControlOutputs();
      scheduleAnalysis({ forceAutoThreshold: els.autoThreshold.checked });
    });

    els.pixelSensitivity.addEventListener('input', () => {
      updateControlOutputs();
      scheduleAnalysis({ forceAutoThreshold: false });
    });

    els.canvas.addEventListener('click', handleCanvasTap);
    setupCanvasGestures();
    window.addEventListener('resize', () => {
      updateViewportCssVars();
      drawImageAndOverlay();
    });
    window.addEventListener('orientationchange', () => window.setTimeout(() => {
      updateViewportCssVars();
      drawImageAndOverlay();
    }, 150));
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        updateViewportCssVars();
        drawImageAndOverlay();
      });
      window.visualViewport.addEventListener('scroll', updateViewportCssVars);
    }

    els.saveReading.addEventListener('click', saveCurrentReading);
    if (els.saveReadingQuick) {
      els.saveReadingQuick.addEventListener('click', saveCurrentReading);
    }
    els.copySummary.addEventListener('click', copyCurrentSummary);
    els.exportCsv.addEventListener('click', exportReadingsCsv);
    els.clearReadings.addEventListener('click', clearReadings);
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      els.offlineStatus.textContent = 'Offline cache unavailable in this browser';
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      if (registration.active) {
        els.offlineStatus.textContent = navigator.onLine ? 'Ready for offline use' : 'Offline mode';
      }
    } catch (error) {
      els.offlineStatus.textContent = 'Offline cache not registered';
      console.warn('Service worker registration failed:', error);
    }
  }

  function updateNetworkStatus() {
    if (!navigator.onLine) {
      els.offlineStatus.textContent = 'Offline mode';
    } else {
      els.offlineStatus.textContent = 'Online; app caches after first load';
    }
  }

  function updateViewportCssVars() {
    const viewport = window.visualViewport;
    const offsetBottom = viewport
      ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
      : 0;
    const width = viewport ? Math.round(viewport.width) : window.innerWidth;
    const offsetLeft = viewport ? Math.max(0, Math.round(viewport.offsetLeft)) : 0;
    document.documentElement.style.setProperty('--vv-bottom-offset', `${offsetBottom}px`);
    document.documentElement.style.setProperty('--vv-width', `${width}px`);
    document.documentElement.style.setProperty('--vv-left', `${offsetLeft}px`);
  }


  function openPhotoSheet() {
    if (!els.photoSheet) {
      triggerFileInput(els.uploadInput);
      return;
    }
    state.photoSheetOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    els.photoSheet.hidden = false;
    document.body.classList.add('photo-sheet-open');
    document.addEventListener('keydown', handlePhotoSheetKeydown);
    if (els.chooseCamera) window.setTimeout(() => els.chooseCamera.focus(), 0);
  }

  function closePhotoSheet({ restoreFocus = true } = {}) {
    if (!els.photoSheet || els.photoSheet.hidden) return;
    els.photoSheet.hidden = true;
    document.body.classList.remove('photo-sheet-open');
    document.removeEventListener('keydown', handlePhotoSheetKeydown);
    if (restoreFocus && state.photoSheetOpener && document.contains(state.photoSheetOpener)) {
      state.photoSheetOpener.focus();
    }
    state.photoSheetOpener = null;
  }

  function handlePhotoSheetKeydown(event) {
    if (!els.photoSheet || els.photoSheet.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePhotoSheet();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [els.chooseCamera, els.chooseLibrary, els.cancelPhotoSheet].filter((el) => el && !el.disabled);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function triggerFileInput(input) {
    closePhotoSheet({ restoreFocus: false });
    if (!input) return;
    input.click();
  }

  function scheduleAnalysis(options = {}) {
    if (!state.imageData) return;
    const delay = Number.isFinite(options.delay) ? options.delay : 90;
    if (state.analysisTimer) window.clearTimeout(state.analysisTimer);
    state.analysisTimer = window.setTimeout(() => {
      state.analysisTimer = null;
      runAnalysis(options);
    }, delay);
  }

  function resetImagePositionAndAnalyse() {
    resetImageViewControls();
    if (!state.sourceCanvas.width) return;
    state.overrideClassByDotId.clear();
    renderTransformedImage();
    drawImageAndOverlay();
    scheduleAnalysis({ forceAutoThreshold: els.autoThreshold.checked, delay: 60 });
  }

  function resetOverlayControls() {
    els.roiR.value = '48';
    updateControlOutputs();
  }

  function resetOverlayAndAnalyse() {
    resetOverlayControls();
    state.overrideClassByDotId.clear();
    drawImageAndOverlay();
    scheduleAnalysis({ forceAutoThreshold: els.autoThreshold.checked, delay: 60 });
  }

  function handleImageViewControlInput(control) {
    syncPairedImageViewControl(control);
    if (control === els.imageOffsetX || control === els.imageOffsetY || control === els.imageOffsetXQuick || control === els.imageOffsetYQuick) {
      ensureZoomForOffsetSliders();
    }
    syncImageViewStateFromControls();
    updateControlOutputs();
    if (!state.sourceCanvas.width) return;
    state.overrideClassByDotId.clear();
    renderTransformedImage();
    drawImageAndOverlay();
    scheduleAnalysis({ forceAutoThreshold: els.autoThreshold.checked, delay: 110 });
  }

  function syncPairedImageViewControl(control) {
    const pairs = [
      [els.imageZoom, els.imageZoomQuick],
      [els.imageOffsetX, els.imageOffsetXQuick],
      [els.imageOffsetY, els.imageOffsetYQuick]
    ];
    pairs.forEach(([main, quick]) => {
      if (!main || !quick) return;
      if (control === main) quick.value = main.value;
      if (control === quick) main.value = quick.value;
    });
  }

  function syncQuickImageViewControls() {
    if (els.imageZoomQuick) els.imageZoomQuick.value = els.imageZoom.value;
    if (els.imageOffsetXQuick) els.imageOffsetXQuick.value = els.imageOffsetX.value;
    if (els.imageOffsetYQuick) els.imageOffsetYQuick.value = els.imageOffsetY.value;
  }

  function ensureZoomForOffsetSliders() {
    if (!state.sourceCanvas.width) return;
    const movedX = Math.abs(Number(els.imageOffsetX.value)) > 0;
    const movedY = Math.abs(Number(els.imageOffsetY.value)) > 0;
    if (!movedX && !movedY) return;

    const currentZoomPercent = Number(els.imageZoom.value);
    if (currentZoomPercent >= Math.round(MIN_PAN_ZOOM * 100)) return;

    // At exactly 100% cover fit, one photo axis often has no spare image outside the square window.
    // Raising zoom slightly makes both horizontal and vertical position sliders visibly move the crop.
    els.imageZoom.value = String(Math.round(MIN_PAN_ZOOM * 100));
  }

  function getCurrentPanCapacity() {
    if (!state.sourceCanvas.width || !state.analysisCanvas.width) {
      return { canPanX: false, canPanY: false, overflowX: 0, overflowY: 0 };
    }
    const sourceW = state.sourceCanvas.width;
    const sourceH = state.sourceCanvas.height;
    const viewportW = state.analysisCanvas.width;
    const viewportH = state.analysisCanvas.height;
    const zoom = Math.max(1, Number(els.imageZoom.value) / 100);
    const baseScale = Math.max(viewportW / sourceW, viewportH / sourceH);
    const overflowX = Math.max(0, ((sourceW * baseScale * zoom) - viewportW) / 2);
    const overflowY = Math.max(0, ((sourceH * baseScale * zoom) - viewportH) / 2);
    return {
      canPanX: overflowX > 0.5,
      canPanY: overflowY > 0.5,
      overflowX,
      overflowY
    };
  }

  function updatePositionStatus() {
    if (!els.positionStatus) return;
    if (!state.sourceCanvas.width) {
      els.positionStatus.textContent = 'Load a photo to adjust position.';
      return;
    }
    const movedX = Number(els.imageOffsetX.value) !== 0;
    const movedY = Number(els.imageOffsetY.value) !== 0;
    const pan = getCurrentPanCapacity();
    const zoomPercent = Number(els.imageZoom.value);
    if ((movedX || movedY) && zoomPercent >= Math.round(MIN_PAN_ZOOM * 100)) {
      els.positionStatus.textContent = `Position active: photo is zoomed to ${zoomPercent}% so the horizontal and vertical sliders can move the crop under the fixed overlay.`;
    } else if (!pan.canPanX || !pan.canPanY) {
      els.positionStatus.textContent = 'At 100% zoom one direction may be locked because the photo exactly fills the square. Move either position slider to auto-zoom slightly, or pinch to zoom first.';
    } else {
      els.positionStatus.textContent = `Position active at ${zoomPercent}% zoom. Drag the image or use the horizontal and vertical sliders.`;
    }
  }

  function setupCanvasGestures() {
    if (!window.PointerEvent) return;
    els.canvas.addEventListener('pointerdown', handleCanvasPointerDown);
    els.canvas.addEventListener('pointermove', handleCanvasPointerMove, { passive: false });
    els.canvas.addEventListener('pointerup', handleCanvasPointerEnd);
    els.canvas.addEventListener('pointercancel', handleCanvasPointerEnd);
    els.canvas.addEventListener('lostpointercapture', handleCanvasPointerEnd);
  }

  function handleCanvasPointerDown(event) {
    if (!state.imageData) return;
    state.gesture.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (els.canvas.setPointerCapture) {
      try {
        els.canvas.setPointerCapture(event.pointerId);
      } catch (_error) {
        // Pointer capture is best-effort on mobile browsers.
      }
    }

    if (state.gesture.activePointers.size === 1) {
      state.gesture.startX = event.clientX;
      state.gesture.startY = event.clientY;
      state.gesture.startZoom = state.view.zoom;
      state.gesture.startOffsetX = state.view.offsetX;
      state.gesture.startOffsetY = state.view.offsetY;
      state.gesture.didManipulate = false;
    } else if (state.gesture.activePointers.size === 2) {
      const points = Array.from(state.gesture.activePointers.values()).slice(0, 2);
      state.gesture.startDistance = pointerDistance(points[0], points[1]);
      state.gesture.startZoom = state.view.zoom;
      state.gesture.startOffsetX = state.view.offsetX;
      state.gesture.startOffsetY = state.view.offsetY;
      state.gesture.didManipulate = true;
    }
  }

  function handleCanvasPointerMove(event) {
    if (!state.imageData || !state.gesture.activePointers.has(event.pointerId)) return;
    state.gesture.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (state.gesture.activePointers.size >= 2) {
      event.preventDefault();
      const points = Array.from(state.gesture.activePointers.values()).slice(0, 2);
      const distance = pointerDistance(points[0], points[1]);
      if (state.gesture.startDistance <= 0) return;
      const nextZoom = state.gesture.startZoom * (distance / state.gesture.startDistance);
      setImageViewControls(nextZoom, state.gesture.startOffsetX, state.gesture.startOffsetY);
      refreshImageAfterGesture();
      state.gesture.didManipulate = true;
      return;
    }

    if (state.gesture.activePointers.size === 1) {
      const dx = event.clientX - state.gesture.startX;
      const dy = event.clientY - state.gesture.startY;
      if (Math.hypot(dx, dy) < 7) return;

      let transform = state.view.sourceTransform || {};
      let canPanX = (transform.overflowX || 0) > 0.5;
      let canPanY = (transform.overflowY || 0) > 0.5;

      if ((!canPanX || !canPanY) && state.view.zoom < MIN_PAN_ZOOM) {
        setImageViewControls(MIN_PAN_ZOOM, state.gesture.startOffsetX, state.gesture.startOffsetY);
        renderTransformedImage();
        transform = state.view.sourceTransform || {};
        canPanX = (transform.overflowX || 0) > 0.5;
        canPanY = (transform.overflowY || 0) > 0.5;
        state.gesture.startZoom = state.view.zoom;
      }

      if (!canPanX && !canPanY) return;
      event.preventDefault();

      const xDenominator = Math.max(1, (transform.overflowX || 0) * state.display.scaleX);
      const yDenominator = Math.max(1, (transform.overflowY || 0) * state.display.scaleY);
      const offsetX = canPanX ? state.gesture.startOffsetX + ((dx * 100) / xDenominator) : state.gesture.startOffsetX;
      const offsetY = canPanY ? state.gesture.startOffsetY + ((dy * 100) / yDenominator) : state.gesture.startOffsetY;
      setImageViewControls(state.gesture.startZoom, offsetX, offsetY);
      refreshImageAfterGesture();
      state.gesture.didManipulate = true;
    }
  }

  function handleCanvasPointerEnd(event) {
    const hadPointer = state.gesture.activePointers.delete(event.pointerId);
    if (!hadPointer) return;

    if (state.gesture.didManipulate) {
      state.suppressNextCanvasClick = true;
      window.setTimeout(() => {
        state.suppressNextCanvasClick = false;
      }, 350);
    }

    if (state.gesture.activePointers.size === 1) {
      const remaining = Array.from(state.gesture.activePointers.values())[0];
      state.gesture.startX = remaining.x;
      state.gesture.startY = remaining.y;
      state.gesture.startZoom = state.view.zoom;
      state.gesture.startOffsetX = state.view.offsetX;
      state.gesture.startOffsetY = state.view.offsetY;
    } else if (state.gesture.activePointers.size === 0) {
      state.gesture.startDistance = 0;
      state.gesture.didManipulate = false;
    }
  }

  function pointerDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function setImageViewControls(zoom, offsetX, offsetY) {
    const zoomPercent = Math.round(clamp(zoom, 1, 4) * 100);
    els.imageZoom.value = String(zoomPercent);
    els.imageOffsetX.value = String(Math.round(clamp(offsetX, -100, 100)));
    els.imageOffsetY.value = String(Math.round(clamp(offsetY, -100, 100)));
    syncImageViewStateFromControls();
    updateControlOutputs();
  }

  function refreshImageAfterGesture() {
    if (!state.sourceCanvas.width) return;
    state.overrideClassByDotId.clear();
    renderTransformedImage();
    drawImageAndOverlay();
    scheduleAnalysis({ forceAutoThreshold: els.autoThreshold.checked, delay: 130 });
  }

  function scrollImagePanelIntoViewOnMobile() {
    if (!els.imagePanel) return;
    const isSmallScreen = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    if (!isSmallScreen) return;
    window.setTimeout(() => {
      els.imagePanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
  }

  async function handleImageInput(event, sourceLabel = 'Image') {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    els.imageMeta.textContent = 'Loading image…';
    state.overrideClassByDotId.clear();
    state.current = null;
    state.dotResults = [];
    state.imageData = null;

    try {
      const bitmap = await readImageBitmap(file);
      drawBitmapToAnalysisCanvas(bitmap);
      state.imageName = file.name || sourceLabel.toLowerCase().replace(/\s+/g, '-');
      state.imageSource = sourceLabel;
      setAnalysisControlsEnabled(true);
      els.canvas.style.display = 'block';
      els.canvasPlaceholder.style.display = 'none';
      document.body.classList.add('has-image');
      els.imageMeta.textContent = `${state.imageName}; source: ${state.imageSource}; analysed at ${state.analysisCanvas.width} × ${state.analysisCanvas.height} px`;
      runAnalysis({ forceAutoThreshold: true });
      scrollImagePanelIntoViewOnMobile();
    } catch (error) {
      console.error(error);
      els.imageMeta.textContent = 'Could not read this image. Try another image file.';
      document.body.classList.remove('has-image');
      setAnalysisControlsEnabled(false);
    } finally {
      event.target.value = '';
    }
  }

  function readImageBitmap(file) {
    if ('createImageBitmap' in window) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => fallbackImageLoad(file));
    }
    return fallbackImageLoad(file);
  }

  function fallbackImageLoad(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image failed to load'));
      };
      img.src = url;
    });
  }

  function drawBitmapToAnalysisCanvas(bitmap) {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_ANALYSIS_SIDE / longest);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const viewportSide = Math.round(clamp(Math.min(width, height), MIN_VIEWPORT_SIDE, MAX_VIEWPORT_SIDE));

    state.originalWidth = bitmap.width;
    state.originalHeight = bitmap.height;
    state.imageScale = scale;

    state.sourceCanvas.width = width;
    state.sourceCanvas.height = height;
    state.analysisCanvas.width = viewportSide;
    state.analysisCanvas.height = viewportSide;

    state.sourceCtx.clearRect(0, 0, width, height);
    state.sourceCtx.imageSmoothingEnabled = true;
    state.sourceCtx.imageSmoothingQuality = 'high';
    state.sourceCtx.drawImage(bitmap, 0, 0, width, height);
    resetImageViewControls();
    resetOverlayControls();
    renderTransformedImage();
  }

  function resetImageViewControls() {
    els.imageZoom.value = '100';
    els.imageOffsetX.value = '0';
    els.imageOffsetY.value = '0';
    syncImageViewStateFromControls();
    updateControlOutputs();
  }

  function syncImageViewStateFromControls() {
    state.view.zoom = Math.max(1, Number(els.imageZoom.value) / 100);
    state.view.offsetX = Number(els.imageOffsetX.value);
    state.view.offsetY = Number(els.imageOffsetY.value);
  }

  function renderTransformedImage() {
    if (!state.sourceCanvas.width || !state.sourceCanvas.height) return;

    syncImageViewStateFromControls();
    const sourceW = state.sourceCanvas.width;
    const sourceH = state.sourceCanvas.height;
    const viewportW = state.analysisCanvas.width;
    const viewportH = state.analysisCanvas.height;
    const zoom = state.view.zoom;
    const baseScale = Math.max(viewportW / sourceW, viewportH / sourceH);
    const scale = baseScale * zoom;
    const scaledW = sourceW * scale;
    const scaledH = sourceH * scale;
    const overflowX = Math.max(0, (scaledW - viewportW) / 2);
    const overflowY = Math.max(0, (scaledH - viewportH) / 2);
    const dx = ((viewportW - scaledW) / 2) + ((state.view.offsetX / 100) * overflowX);
    const dy = ((viewportH - scaledH) / 2) + ((state.view.offsetY / 100) * overflowY);

    state.analysisCtx.clearRect(0, 0, viewportW, viewportH);
    state.analysisCtx.fillStyle = '#e6ebdf';
    state.analysisCtx.fillRect(0, 0, viewportW, viewportH);
    state.analysisCtx.imageSmoothingEnabled = true;
    state.analysisCtx.imageSmoothingQuality = 'high';
    state.analysisCtx.drawImage(state.sourceCanvas, dx, dy, scaledW, scaledH);
    state.imageData = state.analysisCtx.getImageData(0, 0, viewportW, viewportH);
    state.view.sourceTransform = {
      scale,
      baseScale,
      dx,
      dy,
      scaledW,
      scaledH,
      overflowX,
      overflowY,
      viewportW,
      viewportH,
      sourceW,
      sourceH
    };
    prepareNegativeCanvas();
    updateAnalysisAreaReadout();
  }

  function prepareNegativeCanvas() {
    if (!state.imageData) return;
    const width = state.analysisCanvas.width;
    const height = state.analysisCanvas.height;
    const negativeData = new ImageData(new Uint8ClampedArray(state.imageData.data), width, height);
    const data = negativeData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
    state.negativeCanvas.width = width;
    state.negativeCanvas.height = height;
    state.negativeCtx.putImageData(negativeData, 0, 0);
  }

  function setAnalysisControlsEnabled(enabled) {
    [
      els.imageZoom,
      els.imageZoomQuick,
      els.imageOffsetX,
      els.imageOffsetXQuick,
      els.imageOffsetY,
      els.imageOffsetYQuick,
      els.resetImagePosition,
      els.resetImagePositionQuick,
      els.resetOverlay,
      els.resetOverlayQuick,
      els.gridMode,
      els.classifierMode,
      els.negativeImage,
      els.pixelSensitivity,
      els.autoThreshold,
      els.recalcThreshold,
      els.threshold,
      els.patchSize,
      els.roiX,
      els.roiY,
      els.roiR,
      els.analyseButton,
      els.analyseQuick,
      els.quickAnalyse,
      els.resetOverrides,
      els.saveReading,
      els.saveReadingQuick,
      els.quickSave,
      els.copySummary
    ].forEach((el) => { if (el) el.disabled = !enabled; });
  }

  function updateControlOutputs() {
    syncImageViewStateFromControls();
    syncQuickImageViewControls();
    els.imageZoomValue.value = `${els.imageZoom.value}%`;
    if (els.imageZoomQuickValue) els.imageZoomQuickValue.value = `${els.imageZoom.value}%`;
    els.imageOffsetXValue.value = `${els.imageOffsetX.value}%`;
    if (els.imageOffsetXQuickValue) els.imageOffsetXQuickValue.value = `${els.imageOffsetX.value}%`;
    els.imageOffsetYValue.value = `${els.imageOffsetY.value}%`;
    if (els.imageOffsetYQuickValue) els.imageOffsetYQuickValue.value = `${els.imageOffsetY.value}%`;
    els.thresholdValue.value = state.threshold.toFixed(2);
    els.pixelSensitivityValue.value = formatSensitivity(Number(els.pixelSensitivity.value));
    els.patchValue.value = `${(Number(els.patchSize.value) / 10).toFixed(1)}%`;
    if (els.roiXValue) els.roiXValue.value = '50%';
    if (els.roiYValue) els.roiYValue.value = '50%';
    els.roiRValue.value = `${els.roiR.value}%`;
    if (els.overlayStatus) els.overlayStatus.textContent = `Overlay centred; effective radius ${els.roiR.value}%.`;
    updateAnalysisAreaReadout();
    updatePositionStatus();
  }

  function runAnalysis(options = {}) {
    if (!state.imageData) return;

    const forceAutoThreshold = options.forceAutoThreshold === true;
    const roi = getRoiPixels();
    const mode = els.classifierMode.value;
    const negativeImage = els.negativeImage.checked;
    const skySensitivity = Number(els.pixelSensitivity.value);

    if (forceAutoThreshold) {
      state.threshold = computeOtsuThreshold(roi, mode, negativeImage);
      els.threshold.value = Math.round(state.threshold * 100);
    } else {
      state.threshold = Number(els.threshold.value) / 100;
    }
    const effectiveThreshold = getEffectiveThreshold(state.threshold, skySensitivity, negativeImage);
    updateControlOutputs();

    const dots = generateDots(els.gridMode.value);
    state.dotResults = dots.map((dot) => classifyDot(dot, roi, effectiveThreshold, mode, negativeImage));
    const dotCounts = summariseDotResults(state.dotResults);
    const pixelStats = computePixelStats(roi, effectiveThreshold, mode, negativeImage);
    const areaStats = getAnalysedAreaStats(roi);

    state.current = {
      imageName: state.imageName,
      imageSource: state.imageSource || 'Unknown',
      gridMode: els.gridMode.value,
      classifierMode: mode,
      negativeImage,
      skySensitivity,
      threshold: state.threshold,
      effectiveThreshold,
      dotDensity: dotCounts.density,
      skyDots: dotCounts.sky,
      canopyDots: dotCounts.canopy,
      pixelDensity: pixelStats.canopyPercent,
      skyPixelPercent: pixelStats.skyPercent,
      pixelCount: pixelStats.estimatedPixelCount,
      pixelStep: pixelStats.step,
      analysisPixelArea: areaStats.analysisPixelArea,
      sourcePixelArea: areaStats.sourcePixelArea,
      originalPixelArea: areaStats.originalPixelArea,
      imageZoom: state.view.zoom,
      imageZoomPercent: Math.round(state.view.zoom * 100),
      imageOffsetX: state.view.offsetX,
      imageOffsetXPercent: state.view.offsetX,
      imageOffsetY: state.view.offsetY,
      imageOffsetYPercent: state.view.offsetY,
      timestamp: new Date().toISOString()
    };

    updateResultsUI();
    drawImageAndOverlay();
  }

  function getRoiPixels() {
    const width = state.analysisCanvas.width;
    const height = state.analysisCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const requestedRadius = (Number(els.roiR.value) / 100) * Math.min(width, height);
    const maxRadius = Math.max(1, Math.min(width, height) / 2);
    return {
      cx,
      cy,
      r: Math.min(requestedRadius, maxRadius),
      width,
      height
    };
  }

  function pixelIndex(x, y, width) {
    return ((y * width) + x) * 4;
  }

  function getAnalysedAreaStats(roi) {
    const analysisPixelArea = Math.max(0, Math.round(Math.PI * roi.r * roi.r));
    const transform = state.view.sourceTransform || { scale: 1 };
    const transformScale = Math.max(1e-6, transform.scale || 1);
    const sourcePixelArea = Math.max(0, Math.round(analysisPixelArea / (transformScale * transformScale)));
    const originalScale = state.imageScale > 0 ? state.imageScale : 1;
    const originalPixelArea = Math.max(0, Math.round(sourcePixelArea / (originalScale * originalScale)));

    return {
      analysisPixelArea,
      sourcePixelArea,
      originalPixelArea
    };
  }

  function updateAnalysisAreaReadout() {
    if (!els.analysisAreaReadout) return;
    if (!state.imageData) {
      els.analysisAreaReadout.textContent = 'Analysed pixel area: —';
      return;
    }

    const roi = getRoiPixels();
    const area = getAnalysedAreaStats(roi);
    const zoomPercent = Math.round(state.view.zoom * 100);
    els.analysisAreaReadout.textContent = `Analysed area: ${formatInteger(area.analysisPixelArea)} transformed-image px; approximately ${formatInteger(area.originalPixelArea)} original-photo px represented at ${zoomPercent}% zoom.`;
  }

  function formatInteger(value) {
    return Math.max(0, Math.round(value)).toLocaleString();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function skyScore(r, g, b, mode, negativeImage = false) {
    if (negativeImage) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    const luminance = (0.299 * rr) + (0.587 * gg) + (0.114 * bb);
    const brightness = (rr + gg + bb) / 3;
    const saturation = max - min;
    const sum = rr + gg + bb + 1e-6;
    const blueRatio = bb / sum;
    const greenRatio = gg / sum;
    const blueExcess = Math.max(0, bb - Math.max(rr, gg));
    const greenExcess = Math.max(0, gg - Math.max(rr, bb));
    const vegetationExcess = clamp01((2 * gg - rr - bb + 1) / 2);

    let score;
    if (mode === 'brightness') {
      score = luminance;
    } else if (mode === 'blue') {
      score = (0.50 * luminance) + (0.35 * clamp01(blueRatio * 2.7)) + (0.25 * blueExcess) - (0.20 * greenExcess);
    } else if (mode === 'green') {
      score = (0.55 * luminance) + (0.30 * (1 - vegetationExcess)) + (0.10 * (1 - clamp01(greenRatio * 2.2))) - (0.08 * saturation);
    } else {
      score = (0.44 * luminance)
        + (0.18 * brightness)
        + (0.25 * clamp01(blueRatio * 2.8))
        + (0.08 * (1 - saturation))
        - (0.24 * greenExcess)
        - (0.10 * vegetationExcess);
    }
    return clamp01(score);
  }

  function isSkyScore(score, threshold, negativeImage) {
    return negativeImage ? score <= threshold : score >= threshold;
  }

  function getEffectiveThreshold(baseThreshold, skySensitivity, negativeImage) {
    const sensitivityOffset = (Number(skySensitivity) - 50) / 50;
    const thresholdRange = 0.25;
    const direction = negativeImage ? 1 : -1;
    return clamp01(baseThreshold + (direction * sensitivityOffset * thresholdRange));
  }

  function formatSensitivity(value) {
    if (value === 50) return '50 (neutral)';
    return value > 50 ? `${value} (more sky)` : `${value} (stricter)`;
  }

  function computeOtsuThreshold(roi, mode, negativeImage) {
    const hist = new Array(256).fill(0);
    const data = state.imageData.data;
    const step = Math.max(1, Math.ceil(Math.min(roi.width, roi.height) / 900));
    const r2 = roi.r * roi.r;
    const x0 = Math.max(0, Math.floor(roi.cx - roi.r));
    const x1 = Math.min(roi.width - 1, Math.ceil(roi.cx + roi.r));
    const y0 = Math.max(0, Math.floor(roi.cy - roi.r));
    const y1 = Math.min(roi.height - 1, Math.ceil(roi.cy + roi.r));
    let total = 0;

    for (let y = y0; y <= y1; y += step) {
      const dy = y - roi.cy;
      for (let x = x0; x <= x1; x += step) {
        const dx = x - roi.cx;
        if ((dx * dx) + (dy * dy) > r2) continue;
        const i = pixelIndex(x, y, roi.width);
        const score = skyScore(data[i], data[i + 1], data[i + 2], mode, negativeImage);
        hist[Math.max(0, Math.min(255, Math.round(score * 255)))] += 1;
        total += 1;
      }
    }

    if (total < 20) return Number(els.threshold.value) / 100;

    let sum = 0;
    for (let i = 0; i < 256; i += 1) sum += i * hist[i];

    let sumBackground = 0;
    let weightBackground = 0;
    let maxVariance = -1;
    let threshold = 128;

    for (let i = 0; i < 256; i += 1) {
      weightBackground += hist[i];
      if (weightBackground === 0) continue;
      const weightForeground = total - weightBackground;
      if (weightForeground === 0) break;

      sumBackground += i * hist[i];
      const meanBackground = sumBackground / weightBackground;
      const meanForeground = (sum - sumBackground) / weightForeground;
      const varianceBetween = weightBackground * weightForeground * Math.pow(meanBackground - meanForeground, 2);

      if (varianceBetween > maxVariance) {
        maxVariance = varianceBetween;
        threshold = i;
      }
    }

    return clamp01(threshold / 255);
  }

  function computePixelStats(roi, threshold, mode, negativeImage) {
    const data = state.imageData.data;
    const step = Math.max(1, Math.ceil(Math.min(roi.width, roi.height) / 900));
    const r2 = roi.r * roi.r;
    const x0 = Math.max(0, Math.floor(roi.cx - roi.r));
    const x1 = Math.min(roi.width - 1, Math.ceil(roi.cx + roi.r));
    const y0 = Math.max(0, Math.floor(roi.cy - roi.r));
    const y1 = Math.min(roi.height - 1, Math.ceil(roi.cy + roi.r));
    let sky = 0;
    let total = 0;

    for (let y = y0; y <= y1; y += step) {
      const dy = y - roi.cy;
      for (let x = x0; x <= x1; x += step) {
        const dx = x - roi.cx;
        if ((dx * dx) + (dy * dy) > r2) continue;
        const i = pixelIndex(x, y, roi.width);
        const score = skyScore(data[i], data[i + 1], data[i + 2], mode, negativeImage);
        if (isSkyScore(score, threshold, negativeImage)) sky += 1;
        total += 1;
      }
    }

    const skyPercent = total > 0 ? (sky / total) * 100 : 0;
    return {
      skyPercent,
      canopyPercent: 100 - skyPercent,
      sampledPixelCount: total,
      estimatedPixelCount: total * step * step,
      step
    };
  }

  function generateDots(mode) {
    if (mode === 'cross96') return generateCrossDots();
    return generateCircularDots();
  }

  function generateCircularDots() {
    const dots = [];
    let id = 0;
    for (let row = 0; row < 12; row += 1) {
      for (let col = 0; col < 12; col += 1) {
        const gx = col - 5.5;
        const gy = row - 5.5;
        if ((gx * gx) + (gy * gy) <= 30.5) {
          dots.push({ id: `c-${id}`, nx: gx / 5.5, ny: gy / 5.5 });
          id += 1;
        }
      }
    }
    return dots;
  }

  function generateCrossDots() {
    const dots = [];
    const rows = [
      { start: 2, count: 2 },
      { start: 1, count: 4 },
      { start: 0, count: 6 },
      { start: 0, count: 6 },
      { start: 1, count: 4 },
      { start: 2, count: 2 }
    ];
    let id = 0;

    rows.forEach((rowSpec, bigRow) => {
      for (let bigCol = rowSpec.start; bigCol < rowSpec.start + rowSpec.count; bigCol += 1) {
        for (let subY = 0; subY < 2; subY += 1) {
          for (let subX = 0; subX < 2; subX += 1) {
            const smallCol = (bigCol * 2) + subX;
            const smallRow = (bigRow * 2) + subY;
            const nx = (((smallCol + 0.5) / 12) * 2) - 1;
            const ny = (((smallRow + 0.5) / 12) * 2) - 1;
            dots.push({ id: `x-${id}`, nx, ny });
            id += 1;
          }
        }
      }
    });
    return dots;
  }

  function classifyDot(dot, roi, threshold, mode, negativeImage) {
    const data = state.imageData.data;
    const x = roi.cx + (dot.nx * roi.r);
    const y = roi.cy + (dot.ny * roi.r);
    const patchFraction = Number(els.patchSize.value) / 1000;
    const patchRadius = Math.max(1, Math.round(roi.r * patchFraction));
    const x0 = Math.max(0, Math.floor(x - patchRadius));
    const x1 = Math.min(roi.width - 1, Math.ceil(x + patchRadius));
    const y0 = Math.max(0, Math.floor(y - patchRadius));
    const y1 = Math.min(roi.height - 1, Math.ceil(y + patchRadius));
    const pr2 = patchRadius * patchRadius;
    let sky = 0;
    let total = 0;
    let scoreSum = 0;

    for (let yy = y0; yy <= y1; yy += 1) {
      const dy = yy - y;
      for (let xx = x0; xx <= x1; xx += 1) {
        const dx = xx - x;
        if ((dx * dx) + (dy * dy) > pr2) continue;
        const i = pixelIndex(xx, yy, roi.width);
        const score = skyScore(data[i], data[i + 1], data[i + 2], mode, negativeImage);
        if (isSkyScore(score, threshold, negativeImage)) sky += 1;
        total += 1;
        scoreSum += score;
      }
    }

    const skyFraction = total > 0 ? sky / total : 0;
    const autoClass = skyFraction >= 0.5 ? 'sky' : 'canopy';
    const overrideClass = state.overrideClassByDotId.get(dot.id) || null;
    const finalClass = overrideClass || autoClass;

    return {
      ...dot,
      x,
      y,
      patchRadius,
      skyFraction,
      meanScore: total > 0 ? scoreSum / total : 0,
      autoClass,
      overrideClass,
      finalClass
    };
  }

  function summariseDotResults(results) {
    let sky = 0;
    let canopy = 0;
    results.forEach((result) => {
      if (result.finalClass === 'sky') sky += 1;
      else canopy += 1;
    });
    return {
      sky,
      canopy,
      density: Math.max(0, Math.min(100, 100 - (sky * DOT_VALUE)))
    };
  }

  function updateResultsUI() {
    if (!state.current) {
      els.dotDensity.textContent = '—';
      els.pixelDensity.textContent = '—';
      els.skyDots.textContent = '—';
      els.canopyDots.textContent = '—';
      els.thresholdReadout.textContent = '—';
      els.sensitivityReadout.textContent = '—';
      els.negativeReadout.textContent = '—';
      els.pixelCount.textContent = '—';
      updateMobileMetric();
      return;
    }

    els.dotDensity.textContent = `${state.current.dotDensity.toFixed(1)}%`;
    els.pixelDensity.textContent = `${state.current.pixelDensity.toFixed(1)}%`;
    els.skyDots.textContent = `${state.current.skyDots} / 96`;
    els.canopyDots.textContent = `${state.current.canopyDots} / 96`;
    els.thresholdReadout.textContent = `${state.current.threshold.toFixed(3)} / ${state.current.effectiveThreshold.toFixed(3)}`;
    els.sensitivityReadout.textContent = formatSensitivity(state.current.skySensitivity);
    els.negativeReadout.textContent = state.current.negativeImage ? 'On' : 'Off';
    const prefix = state.current.pixelStep > 1 ? '≈' : '';
    els.pixelCount.textContent = `${prefix}${state.current.pixelCount.toLocaleString()}`;
    updateMobileMetric();
  }

  function updateMobileMetric() {
    if (els.dotDensityMobile) {
      els.dotDensityMobile.textContent = state.current ? `${state.current.dotDensity.toFixed(1)}%` : '—';
    }
    if (els.pixelDensityMobile) {
      els.pixelDensityMobile.textContent = state.current ? `${state.current.pixelDensity.toFixed(1)}%` : '—';
    }
  }

  function getVisibleViewportHeight() {
    return window.visualViewport ? window.visualViewport.height : window.innerHeight;
  }

  function getMobileActionBarHeight() {
    const isSmallScreen = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    if (!isSmallScreen || !document.body.classList.contains('has-image') || !els.quickAddPhoto) return 0;
    const actionBar = els.quickAddPhoto.closest('.mobile-action-bar');
    if (!actionBar) return 0;
    return actionBar.getBoundingClientRect().height || 0;
  }

  function getCanvasMaxByHeight() {
    const viewportHeight = getVisibleViewportHeight();
    const actionBarHeight = getMobileActionBarHeight();
    const isSmallScreen = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    if (!isSmallScreen) return Math.max(280, Math.min(viewportHeight * 0.72, 760));

    const reservedChrome = actionBarHeight + 170;
    const availableForCanvas = Math.max(280, viewportHeight - reservedChrome);
    return Math.max(280, Math.min(availableForCanvas, viewportHeight * 0.68, 760));
  }

  function drawImageAndOverlay() {
    if (!state.imageData) return;

    const canvas = els.canvas;
    const wrap = canvas.parentElement;
    const imgW = state.analysisCanvas.width;
    const imgH = state.analysisCanvas.height;
    const wrapWidth = wrap.clientWidth || Math.min(window.innerWidth - 32, 420);
    const maxByHeight = getCanvasMaxByHeight();
    const displaySide = Math.max(280, Math.min(wrapWidth, maxByHeight, 760));
    const displayW = displaySide;
    const displayH = displaySide;

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);
    drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCtx.clearRect(0, 0, displayW, displayH);
    const displaySource = els.negativeImage.checked ? state.negativeCanvas : state.analysisCanvas;
    drawCtx.drawImage(displaySource, 0, 0, displayW, displayH);

    state.display = {
      width: displayW,
      height: displayH,
      scaleX: displayW / imgW,
      scaleY: displayH / imgH,
      dpr
    };

    const roi = getRoiPixels();
    drawRoiAndGrid(roi);
    drawDots();
  }

  function analysisToCanvas(x, y) {
    return {
      x: x * state.display.scaleX,
      y: y * state.display.scaleY
    };
  }

  function drawRoiAndGrid(roi) {
    const c = analysisToCanvas(roi.cx, roi.cy);
    const r = roi.r * Math.min(state.display.scaleX, state.display.scaleY);

    drawCtx.save();
    drawCtx.lineWidth = 2;
    drawCtx.strokeStyle = 'rgba(255, 255, 255, 0.96)';
    drawCtx.beginPath();
    drawCtx.arc(c.x, c.y, r, 0, Math.PI * 2);
    drawCtx.stroke();
    drawCtx.lineWidth = 1;
    drawCtx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    drawCtx.beginPath();
    drawCtx.arc(c.x, c.y, r, 0, Math.PI * 2);
    drawCtx.stroke();

    if (els.gridMode.value === 'cross96') drawCrossGrid(c, r);
    else drawCircularGrid(c, r);
    drawCtx.restore();
  }

  function drawCircularGrid(c, r) {
    drawCtx.save();
    drawCtx.beginPath();
    drawCtx.arc(c.x, c.y, r, 0, Math.PI * 2);
    drawCtx.clip();
    drawCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    drawCtx.lineWidth = 1;
    for (let i = 0; i <= 12; i += 1) {
      const p = -r + ((2 * r * i) / 12);
      drawCtx.beginPath();
      drawCtx.moveTo(c.x + p, c.y - r);
      drawCtx.lineTo(c.x + p, c.y + r);
      drawCtx.stroke();
      drawCtx.beginPath();
      drawCtx.moveTo(c.x - r, c.y + p);
      drawCtx.lineTo(c.x + r, c.y + p);
      drawCtx.stroke();
    }
    drawCtx.restore();
  }

  function drawCrossGrid(c, r) {
    const rows = [
      { start: 2, count: 2 },
      { start: 1, count: 4 },
      { start: 0, count: 6 },
      { start: 0, count: 6 },
      { start: 1, count: 4 },
      { start: 2, count: 2 }
    ];
    const cell = (2 * r) / 6;
    drawCtx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    drawCtx.lineWidth = 1;
    rows.forEach((rowSpec, row) => {
      for (let col = rowSpec.start; col < rowSpec.start + rowSpec.count; col += 1) {
        drawCtx.strokeRect(c.x - r + (col * cell), c.y - r + (row * cell), cell, cell);
      }
    });
  }

  function drawDots() {
    const dotRadius = Math.max(3.5, Math.min(7, state.display.width / 110));
    state.dotResults.forEach((dot) => {
      const p = analysisToCanvas(dot.x, dot.y);
      const isSky = dot.finalClass === 'sky';
      drawCtx.save();
      drawCtx.beginPath();
      drawCtx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
      drawCtx.fillStyle = isSky ? 'rgba(29, 116, 199, 0.92)' : 'rgba(31, 122, 57, 0.92)';
      drawCtx.fill();
      drawCtx.lineWidth = dot.overrideClass ? 3 : 1.5;
      drawCtx.strokeStyle = dot.overrideClass ? 'rgba(255, 255, 255, 0.98)' : 'rgba(0, 0, 0, 0.55)';
      drawCtx.stroke();
      drawCtx.restore();
    });
  }

  function handleCanvasTap(event) {
    if (state.suppressNextCanvasClick) return;
    if (!state.current || state.dotResults.length === 0) return;
    const rect = els.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = findNearestDot(x, y);
    if (!hit) return;

    const existing = state.overrideClassByDotId.get(hit.id) || null;
    if (!existing) {
      state.overrideClassByDotId.set(hit.id, hit.autoClass === 'sky' ? 'canopy' : 'sky');
    } else if (existing === 'sky') {
      state.overrideClassByDotId.set(hit.id, 'canopy');
    } else {
      state.overrideClassByDotId.delete(hit.id);
    }
    runAnalysis({ forceAutoThreshold: false });
  }

  function findNearestDot(x, y) {
    let best = null;
    let bestDist2 = Infinity;
    const maxHit = Math.max(12, state.display.width / 32);
    state.dotResults.forEach((dot) => {
      const p = analysisToCanvas(dot.x, dot.y);
      const dx = p.x - x;
      const dy = p.y - y;
      const dist2 = (dx * dx) + (dy * dy);
      if (dist2 < bestDist2) {
        best = dot;
        bestDist2 = dist2;
      }
    });
    return bestDist2 <= (maxHit * maxHit) ? best : null;
  }

  function saveCurrentReading() {
    if (!state.current) return;
    const reading = {
      ...state.current,
      id: cryptoRandomId(),
      label: els.direction.value,
      notes: els.notes.value.trim()
    };
    state.readings.push(reading);
    persistReadings();
    updateReadingsUI();
    updateMobileMetric();
  }

  function copyCurrentSummary() {
    if (!state.current) return;
    const text = makeSummaryText(state.current, els.direction.value, els.notes.value.trim());
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  function makeSummaryText(reading, label, notes) {
    const lines = [
      `Reading: ${label}`,
      `Image: ${reading.imageName}`,
      `Source: ${reading.imageSource || 'Unknown'}`,
      `96-dot overstory density: ${reading.dotDensity.toFixed(1)}%`,
      `Pixel-area canopy closure: ${reading.pixelDensity.toFixed(1)}%`,
      `Sky-opening dots: ${reading.skyDots}/96`,
      `Canopy dots: ${reading.canopyDots}/96`,
      `Classifier: ${reading.classifierMode}`,
      `Negative mode: ${reading.negativeImage ? 'on' : 'off'}`,
      `Photo zoom: ${Math.round((reading.imageZoom || 1) * 100)}%`,
      `Photo position: X ${reading.imageOffsetX || 0}%, Y ${reading.imageOffsetY || 0}%`,
      `Analysed area: ${formatInteger(reading.analysisPixelArea || reading.pixelCount || 0)} transformed-image px; approximately ${formatInteger(reading.originalPixelArea || reading.pixelCount || 0)} original-photo px represented`,
      `Sky-opening sensitivity: ${formatSensitivity(reading.skySensitivity)}`,
      `Threshold base/effective: ${reading.threshold.toFixed(3)} / ${reading.effectiveThreshold.toFixed(3)}`,
      `Timestamp: ${reading.timestamp}`
    ];
    if (notes) lines.push(`Notes: ${notes}`);
    return lines.join('\n');
  }

  function updateReadingsUI() {
    els.readingsTable.innerHTML = '';
    if (state.readings.length === 0) {
      els.readingsSummary.textContent = 'No readings saved.';
      return;
    }

    const dotValues = state.readings.map((r) => r.dotDensity);
    const pixelValues = state.readings.map((r) => r.pixelDensity);
    const dotMean = mean(dotValues);
    const pixelMean = mean(pixelValues);
    const dotSd = sampleSd(dotValues);
    const pixelSd = sampleSd(pixelValues);
    els.readingsSummary.textContent = `${state.readings.length} reading${state.readings.length === 1 ? '' : 's'} saved. Mean 96-dot overstory density ${dotMean.toFixed(1)}%${Number.isFinite(dotSd) ? ` (SD ${dotSd.toFixed(1)})` : ''}; mean pixel-area canopy closure ${pixelMean.toFixed(1)}%${Number.isFinite(pixelSd) ? ` (SD ${pixelSd.toFixed(1)})` : ''}.`;

    state.readings.forEach((reading) => {
      const tr = document.createElement('tr');
      const cells = [
        ['Label', reading.label],
        ['96-dot %', `${reading.dotDensity.toFixed(1)}%`],
        ['Pixel %', `${reading.pixelDensity.toFixed(1)}%`],
        ['Sky dots', `${reading.skyDots}/96`],
        ['Time', new Date(reading.timestamp).toLocaleString()]
      ];
      cells.forEach(([label, value]) => {
        const td = document.createElement('td');
        td.dataset.label = label;
        td.textContent = value;
        tr.appendChild(td);
      });
      els.readingsTable.appendChild(tr);
    });
  }

  function loadReadings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function persistReadings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.readings));
    } catch (error) {
      console.warn('Could not save readings locally:', error);
    }
  }

  function clearReadings() {
    if (state.readings.length === 0) return;
    state.readings = [];
    persistReadings();
    updateReadingsUI();
  }

  function exportReadingsCsv() {
    if (state.readings.length === 0) return;
    const columns = [
      'id',
      'timestamp',
      'label',
      'imageName',
      'imageSource',
      'gridMode',
      'classifierMode',
      'negativeMode',
      'imageZoomPercent',
      'imageOffsetXPercent',
      'imageOffsetYPercent',
      'analysisPixelArea',
      'sourcePixelArea',
      'originalPhotoPixelAreaApprox',
      'skySensitivity',
      'threshold',
      'effectiveThreshold',
      'dotDensityPercent',
      'pixelCanopyPercent',
      'skyDots',
      'canopyDots',
      'skyPixelPercent',
      'pixelCountApprox',
      'notes'
    ];
    const rows = [columns.join(',')];
    state.readings.forEach((reading) => {
      rows.push(columns.map((column) => csvCell(reading[columnMap(column)])).join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `mobile-overstory-density-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function columnMap(column) {
    const map = {
      negativeMode: 'negativeImage',
      dotDensityPercent: 'dotDensity',
      pixelCanopyPercent: 'pixelDensity',
      pixelCountApprox: 'pixelCount',
      originalPhotoPixelAreaApprox: 'originalPixelArea'
    };
    return map[column] || column;
  }

  function csvCell(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function sampleSd(values) {
    if (values.length < 2) return NaN;
    const m = mean(values);
    const variance = values.reduce((sum, value) => sum + Math.pow(value - m, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  function cryptoRandomId() {
    if (window.crypto && crypto.getRandomValues) {
      const bytes = new Uint32Array(2);
      crypto.getRandomValues(bytes);
      return `${bytes[0].toString(16)}${bytes[1].toString(16)}`;
    }
    return `${Date.now().toString(16)}-${Math.round(Math.random() * 1e9).toString(16)}`;
  }
})();
