import React from 'react';
import { LiquidSwitch, type LiquidSwitchProps } from './LiquidSwitch';

export type ToggleProps = LiquidSwitchProps;

/**
 * Studio Toggle — Upgraded to Appllama LiquidSwitch.
 * Features GPU-accelerated dual-spring damping, real-time velocity stretch,
 * volumetric compensation, AMOLED support, and optical specular highlights.
 */
export const Toggle: React.FC<ToggleProps> = (props) => {
  return <LiquidSwitch {...props} />;
};

export { LiquidSwitch };
export default Toggle;

