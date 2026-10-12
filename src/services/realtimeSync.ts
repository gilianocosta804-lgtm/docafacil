import { CallAlertEvent, DriverEntry, Dock, ChatMessage, PackageTransfer, CollaboratorPermissions } from '../types';

export type SyncMessageType =
  | 'DRIVER_CALLED'
  | 'DOCK_UPDATED'
  | 'QUEUE_UPDATED'
  | 'DRIVERS_RELOAD_REQUEST'
  | 'FORCE_SYNC'
  | 'TRIGGER_SOUND_TEST'
  | 'CHAT_MESSAGE'
  | 'PACKAGE_TRANSFER_SIGNALED'
  | 'PACKAGE_TRANSFER_RECEIVED'
  | 'DOCK_RENAMED'
  | 'COLLABORATOR_ASSIGNED'
  | 'PERMISSIONS_UPDATED';

export interface SyncMessage {
  type: SyncMessageType;
  payload?: any;
  timestamp: number;
  senderId: string;
}

const CHANNEL_NAME = 'docafacil_sync_channel';
const INSTANCE_ID = 'inst_' + Math.random().toString(36).substring(2, 9);

type MessageHandler = (message: SyncMessage) => void;

class RealtimeSyncManager {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<MessageHandler> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncoming(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported or failed to initialize:', e);
      }
    }

    // Fallback: storage event for cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'docafacil_cross_tab_sync' && event.newValue) {
          try {
            const data: SyncMessage = JSON.parse(event.newValue);
            if (data.senderId !== INSTANCE_ID) {
              this.handleIncoming(data);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      });
    }
  }

  private handleIncoming(message: SyncMessage) {
    if (!message || !message.type) return;
    this.listeners.forEach((handler) => {
      try {
        handler(message);
      } catch (err) {
        console.error('Error in sync listener handler:', err);
      }
    });
  }

  public subscribe(handler: MessageHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public broadcast(type: SyncMessageType, payload?: any) {
    const message: SyncMessage = {
      type,
      payload,
      timestamp: Date.now(),
      senderId: INSTANCE_ID,
    };

    // BroadcastChannel (instant)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {
        console.warn('Failed to postMessage on BroadcastChannel:', e);
      }
    }

    // LocalStorage fallback (triggers storage event in other tabs)
    try {
      localStorage.setItem('docafacil_cross_tab_sync', JSON.stringify(message));
    } catch (e) {
      // Storage might fail if full or private browsing
    }
  }

  public broadcastCall(alert: CallAlertEvent) {
    this.broadcast('DRIVER_CALLED', alert);
  }

  public broadcastDockUpdate(docks: Dock[]) {
    this.broadcast('DOCK_UPDATED', docks);
  }

  public broadcastQueueUpdate(drivers: DriverEntry[]) {
    this.broadcast('QUEUE_UPDATED', drivers);
  }

  public broadcastChatMessage(msg: ChatMessage) {
    this.broadcast('CHAT_MESSAGE', msg);
  }

  public broadcastPackageTransfer(transfer: PackageTransfer) {
    this.broadcast('PACKAGE_TRANSFER_SIGNALED', transfer);
  }

  public broadcastPackageReceived(transfer: PackageTransfer) {
    this.broadcast('PACKAGE_TRANSFER_RECEIVED', transfer);
  }

  public broadcastPermissionsUpdate(perms: CollaboratorPermissions) {
    this.broadcast('PERMISSIONS_UPDATED', perms);
  }

  public requestReload() {
    this.broadcast('DRIVERS_RELOAD_REQUEST');
  }
}

export const realtimeSync = new RealtimeSyncManager();

