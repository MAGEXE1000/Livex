import { NavigationDispatcher } from '@workspace/livex-core';
import { useChordStore } from '@workspace/livex-core';

export const runInteractionTest = async (
  testActive: boolean,
  setTestActive: (a: boolean) => void,
  setTestCycle: (c: number) => void,
  setTestStep: (s: string) => void,
  logDiagnostic: (msg: string) => void,
  curView: string,
  handleNavTap: (view: string) => void,
  stageBtnRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
  iframeRef: React.RefObject<HTMLIFrameElement>,
  callIframe: (fn: string, arg?: string | number) => void,
  toggleStageExpanded: () => void,
  fabOpen: boolean,
  liveMode: boolean
) => {
  if (testActive) return;
  setTestActive(true);
  setTestCycle(0);
  setTestStep('Starting test...');
  logDiagnostic('[TEST START] Running 25 cycles of interaction test...');

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const checkHitTarget = (el: HTMLElement, name: string): boolean => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit) {
      logDiagnostic(`[TEST ERROR] Hit target for ${name} at (${cx}, ${cy}) is null`);
      return false;
    }
    if (hit !== el && !el.contains(hit) && !hit.contains(el)) {
      logDiagnostic(
        `[TEST ERROR] Hit target for ${name} is intercepted by: ${hit.tagName.toLowerCase()}${hit.id ? '#' + hit.id : ''}${hit.className ? '.' + hit.className.split(' ').join('.') : ''}`
      );
      return false;
    }
    return true;
  };

  try {
    for (let cycle = 1; cycle <= 25; cycle++) {
      setTestCycle(cycle);
      logDiagnostic(`[CYCLE ${cycle}/25] Beginning...`);

      // 1. Ensure we are in Editor view
      setTestStep('Ensuring Editor view...');
      if (curView !== 'Editor') {
        handleNavTap('Editor');
        await delay(300);
      }

      // 2. Tap Setup tab
      setTestStep('Tapping Setup tab...');
      const setupBtn = stageBtnRefs.current[1];
      if (!setupBtn) throw new Error('Setup button ref missing');
      if (!checkHitTarget(setupBtn, 'Setup tab')) throw new Error('Setup tab click intercepted');
      setupBtn.click();
      await delay(400);

      // 3. Tap Preferences tab
      setTestStep('Tapping Preferences tab...');
      const prefBtn = stageBtnRefs.current[2];
      if (!prefBtn) throw new Error('Preferences button ref missing');
      if (!checkHitTarget(prefBtn, 'Preferences tab'))
        throw new Error('Preferences tab click intercepted');
      prefBtn.click();
      await delay(400);

      // 4. Return to Editor
      setTestStep('Returning to Editor...');
      const editorBtn = stageBtnRefs.current[0];
      if (!editorBtn) throw new Error('Editor button ref missing');
      if (!checkHitTarget(editorBtn, 'Editor tab'))
        throw new Error('Editor tab click intercepted');
      editorBtn.click();
      await delay(400);

      // 5. Tap Plus button
      setTestStep('Tapping Plus button...');
      const plusBtn = document.getElementById('stagex-plus-button');
      if (!plusBtn) throw new Error('Plus button missing');
      if (!checkHitTarget(plusBtn, 'Plus button'))
        throw new Error('Plus button click intercepted');
      plusBtn.click();
      await delay(400);

      // 6. Select element inside iframe
      setTestStep('Selecting element in picker...');
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentDocument) throw new Error('Iframe not loaded');
      const win = iframe.contentWindow as any;
      const doc = iframe.contentDocument;
      const chip = doc.querySelector('.sc-dial-chip') as HTMLElement | null;
      if (!chip) throw new Error('No element chips found in picker');
      chip.click();
      await delay(600);
      if (win.state.elements.length === 0) throw new Error('Element was not added to stage');
      const newEl = win.state.elements[win.state.elements.length - 1];
      const newElId = newEl.id;

      // 7. Tap Eye button (first time)
      setTestStep('Tapping Eye button (enable live)...');
      const eyeBtn = document.getElementById('stagex-eye-button');
      if (!eyeBtn) throw new Error('Eye button missing');
      if (!checkHitTarget(eyeBtn, 'Eye button')) throw new Error('Eye button click intercepted');
      eyeBtn.click();
      await delay(400);

      // 8. Tap Eye button (second time)
      setTestStep('Tapping Eye button (disable live)...');
      if (!checkHitTarget(eyeBtn, 'Eye button')) throw new Error('Eye button click intercepted');
      eyeBtn.click();
      await delay(400);

      // 9. Select element and run toolbar actions
      setTestStep('Selecting element on canvas...');
      win.selectElement(newElId);
      await delay(300);

      setTestStep('Rotating element...');
      const initialRotation = newEl.rotation || 0;
      callIframe('rotateSelectedElement');
      await delay(400);

      setTestStep('Scaling element up...');
      const initialScale = newEl.scale || 100;
      callIframe('scaleSelectedElement', 10);
      await delay(400);

      setTestStep('Scaling element down...');
      const currentScale = newEl.scale || 100;
      callIframe('scaleSelectedElement', -10);
      await delay(400);

      setTestStep('Deleting element...');
      callIframe('deleteSelectedElement');
      await delay(500);

      // 10. Rotate orientation (landscape then portrait)
      setTestStep('Rotating to landscape...');
      toggleStageExpanded();
      await delay(800);

      setTestStep('Rotating back to portrait...');
      toggleStageExpanded();
      await delay(800);

      // 11. Return to Hub
      setTestStep('Returning to Hub...');
      if (typeof (window as any).returnToStudioHub === 'function') {
        (window as any).returnToStudioHub();
        await delay(800);
      }

      // 12. Reopen Stagex
      setTestStep('Reopening Stagex...');
      NavigationDispatcher.openApp('stagex');
      await delay(1000);
    }

    setTestActive(false);
    setTestStep('Test Complete');
    logDiagnostic('[TEST PASSED] All 25 cycles completed successfully!');
  } catch (err: any) {
    setTestActive(false);
    setTestStep('Test Failed');
    logDiagnostic(`[TEST FAILED] ${err.message || err}`);
    console.error(err);
  }
};
