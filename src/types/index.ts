import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoUrl?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  bio?: string;
  pushToken?: string;
  createdAt: Timestamp;
}

export type ChatMode = 'EVERYONE' | 'ADMIN_ONLY';

export interface Group {
  id: string;
  name: string;
  photoUrl?: string;
  adminId: string;
  adminIds?: string[];
  chatMode: ChatMode;
  allowedUsers: string[]; 
  members?: string[];
  createdAt: Timestamp;
}

export type MessageVisibility = 'ALL' | 'ADMIN_ONLY' | 'SELECTED';
export type MessageType = 'text' | 'image' | 'audio';

export interface Message {
  id: string;
  mediaUrl?: string;
  mediaType?: MessageType;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  text: string;
  mentions?: string[]; // List of user IDs or usernames mentioned
  visibleTo: MessageVisibility;
  createdAt: Date;
  isDeleted?: boolean;
}

export type DirectChatStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface DirectChat {
  id: string;
  participants: string[];
  participantNames: { [uid: string]: string }; 
  participantPhotos?: { [uid: string]: string };
  lastMessage: string;
  lastMessageTime: any;
  createdAt: any;
  status?: DirectChatStatus;
  initiatedBy?: string;
}

export interface JoinRequest {
  id: string;
  groupId: string;
  groupName: string;
  adminId: string; 
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export type NotificationType = 'message' | 'mention' | 'join_request' | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  senderId?: string;
  senderName?: string;
  senderPhotoUrl?: string;
  groupId?: string;
  chatId?: string;
  isRead: boolean;
  createdAt: any;
}