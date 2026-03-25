import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import { api } from '@/lib/api/api';
import type { InvestigationPermissions, RolePermissions } from '@/lib/types';

export type ShareItemType = 'node' | 'string' | 'chat' | 'dossier' | 'timeline' | 'presentation';
export type ShareDestination = 'native_share' | 'google_drive' | 'icloud' | 'email';

export interface ShareOptions {
  investigationId: string;
  itemType: ShareItemType;
  itemId?: string;
  title: string;
  text?: string;
  fileUri?: string;
  destination: ShareDestination;
  watermarkId?: string;
  userId?: string;
  userName?: string;
}

export function checkPermission(
  permissions: InvestigationPermissions | undefined,
  role: 'collaborator' | 'viewer' | 'guest',
  action: keyof RolePermissions,
  userId?: string
): boolean {
  if (!permissions) return true;
  if (userId && permissions.userOverrides?.[userId]) {
    const override = permissions.userOverrides[userId];
    if (override[action] !== undefined) return override[action] as boolean;
  }
  return permissions[role][action];
}

async function logShareEvent(opts: ShareOptions): Promise<string | null> {
  try {
    const result = await api.post<{ id: string; watermarkId: string | null }>('/api/share-log', {
      investigationId: opts.investigationId,
      itemType: opts.itemType,
      itemId: opts.itemId ?? null,
      destination: opts.destination,
      watermarkId: opts.watermarkId ?? null,
    });
    return result?.watermarkId ?? null;
  } catch (e) {
    console.warn('[ShareLog] Failed to log share event:', e);
    return null;
  }
}

export async function shareWithLogging(opts: ShareOptions): Promise<void> {
  await logShareEvent(opts);

  if (opts.destination === 'email') {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      await MailComposer.composeAsync({
        subject: opts.title,
        body: opts.text ?? '',
        attachments: opts.fileUri ? [opts.fileUri] : [],
      });
      return;
    }
  }

  if (opts.destination === 'icloud' && opts.fileUri) {
    const fileName = opts.fileUri.split('/').pop() ?? 'export.pdf';
    const destUri = `${FileSystem.documentDirectory ?? ''}${fileName}`;
    await FileSystem.copyAsync({ from: opts.fileUri, to: destUri });
    return;
  }

  if (opts.destination === 'google_drive' && opts.fileUri) {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(opts.fileUri, {
        dialogTitle: opts.title,
      });
    }
    return;
  }

  // native_share - covers AirDrop, iMessage, socials
  if (opts.fileUri) {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(opts.fileUri, {
        mimeType: opts.itemType === 'dossier' ? 'application/pdf' : 'text/plain',
        dialogTitle: opts.title,
      });
    }
  } else {
    await Share.share({
      title: opts.title,
      message: opts.text ?? opts.title,
    });
  }
}
