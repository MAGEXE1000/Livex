import React from 'react';
import { SharedFloatingHeader, type SharedFloatingHeaderProps } from './StudioLayoutSystem';

export interface ScrollMorphHeaderProps extends SharedFloatingHeaderProps {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  style?: React.CSSProperties;
}

export function ScrollMorphHeader({
  title,
  subtitle,
  onBack,
  hideBack = false,
  toolbarActions,
  scrollContainerRef,
  morphDistance = 74,
  startOffset = 6,
  titleTestId,
  backBtnTestId,
  isLight,
  isAmoled,
  className = '',
  style = {},
}: ScrollMorphHeaderProps) {
  return (
    <SharedFloatingHeader
      title={title}
      subtitle={subtitle}
      onBack={onBack}
      hideBack={hideBack}
      toolbarActions={toolbarActions}
      scrollContainerRef={scrollContainerRef}
      morphDistance={morphDistance}
      startOffset={startOffset}
      titleTestId={titleTestId}
      backBtnTestId={backBtnTestId}
      isLight={isLight}
      isAmoled={isAmoled}
    />
  );
}
