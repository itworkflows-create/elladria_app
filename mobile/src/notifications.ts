import type { AppContent } from './catalog';
import type { Application } from './customerTypes';
export type AppNotification = { id: string; title: string; body: string; destination: 'home' | 'profile' };
export function buildNotifications(content: AppContent, applications: Application[]): AppNotification[] {
  const items: AppNotification[] = [];
  if (content.announcementEnabled && content.announcementTitle.trim() && content.announcementBody.trim()) {
    items.push({ id: 'announcement:' + JSON.stringify([content.announcementTitle, content.announcementBody]),
      title: content.announcementTitle, body: content.announcementBody, destination: 'home' });
  }
  for (const item of [...applications].sort((a,b) => b.createdAt.localeCompare(a.createdAt))) {
    items.push({ id: 'application:' + item.id + ':' + item.status,
      title: item.status === 'Submitted' ? 'Application received' : 'Application ' + item.status.toLowerCase(),
      body: item.jobTitle + ' at ' + item.company + ': ' + item.status,
      destination: 'profile' });
  }
  return items;
}
