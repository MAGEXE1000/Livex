export const HUB_SETTINGS_CSS = `
  @keyframes hub-slide-in {
    from { transform: translateX(32px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes hub-slide-back {
    from { transform: translateX(-24px); opacity: 0; }
    to   { transform: translateX(0);     opacity: 1; }
  }
  @keyframes hub-row-fade {
    from { transform: translateY(7px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
  @keyframes hub-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes profile-sheet-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes profile-dd-in {
    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }
  @keyframes profile-dd-item-in {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes profile-burst-out {
    from { opacity: 0; transform: scale(0.12); transform-origin: top left; }
    to   { opacity: 1; transform: scale(1);   transform-origin: top left; }
  }
  input[type=range].hue-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 10px;
    border-radius: 5px;
    outline: none;
    cursor: pointer;
    display: block;
    width: 100%;
    margin: 14px 0;
  }
  input[type=range].hue-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: hsl(var(--slider-hue, 0), 85%, 60%);
    border: 3px solid #ffffff;
    box-shadow:
      0 2px 8px rgba(0,0,0,0.35),
      0 0 10px hsla(var(--slider-hue, 0), 85%, 60%, 0.4);
    cursor: pointer;
    transition: transform 120ms ease, box-shadow 120ms ease;
  }
  input[type=range].hue-slider:active::-webkit-slider-thumb {
    transform: scale(1.18);
    box-shadow:
      0 3px 12px rgba(0,0,0,0.45),
      0 0 16px hsla(var(--slider-hue, 0), 85%, 60%, 0.6);
  }
  input[type=range].hue-slider::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: hsl(var(--slider-hue, 0), 85%, 60%);
    border: 3px solid #ffffff;
    box-shadow:
      0 2px 8px rgba(0,0,0,0.35),
      0 0 10px hsla(var(--slider-hue, 0), 85%, 60%, 0.4);
    cursor: pointer;
    transition: transform 120ms ease, box-shadow 120ms ease;
    border: none;
  }
  input[type=range].hue-slider:active::-moz-range-thumb {
    transform: scale(1.18);
    box-shadow:
      0 3px 12px rgba(0,0,0,0.45),
      0 0 16px hsla(var(--slider-hue, 0), 85%, 60%, 0.6);
  }
  @keyframes sync-spin-kf {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .sync-spin {
    animation: sync-spin-kf 1.1s linear infinite;
    display: inline-block;
  }
  @media (max-width: 480px) {
    .about-row {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 4px !important;
      padding: 10px 0 !important;
    }
    .about-row span:last-child {
      text-align: left !important;
      margin-right: 0 !important;
      word-break: break-all !important;
    }
  }
  @media (max-width: 360px) {
    .settings-panel-sheet {
      padding-left: 12px !important;
      padding-right: 12px !important;
    }
  }
`;
