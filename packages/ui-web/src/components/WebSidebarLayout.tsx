import React from 'react';
import DashboardSidebar from './DashboardSidebar';

export default function WebSidebarLayout({ shouldHideSidebar = false }: { shouldHideSidebar?: boolean }) {
  if (shouldHideSidebar) return null;
  return <DashboardSidebar />;
}

export { DashboardSidebar };
