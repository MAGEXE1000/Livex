import { Loader } from '../../components/motion/loader';

export interface AppSpinnerProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  outerSize?: string;
  childSize?: string;
  colorFrom?: string;
  colorTo?: string;
}

/**
 * AppSpinner — Redirected to official BeUI Loader (variant="spinner").
 */
export default function AppSpinner({
  size = 20,
  className,
}: AppSpinnerProps) {
  return <Loader variant="spinner" size={size} className={className} />;
}

