export async function fadeToBlackAndReload(
  reloadCallback: () => void | Promise<void>
): Promise<void> {
  const overlay = document.createElement('div');
  overlay.id = 'update-fade-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.backgroundColor = '#000000';
  overlay.style.zIndex = '999999';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)';
  overlay.style.pointerEvents = 'all';
  document.body.appendChild(overlay);

  overlay.getBoundingClientRect();
  overlay.style.opacity = '1';

  const safetyTimer = setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
    }, 500);
  }, 6000);

  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    await reloadCallback();
  } catch (err) {
    clearTimeout(safetyTimer);
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
    }, 500);
    throw err;
  }
}
