import { Timestamp } from "firebase/firestore";

export type Activity = {
  id: string;
  title: string;
  description: string;
  place: string;
  date: Timestamp;
  ownerId: string;
  creatorName?: string;
  participants: string[];
  category?: string;
};

export type Comment = {
  id: string;
  text: string;
  userId: string;
  userName?: string;
  createdAt?: Timestamp;
};

export type Notification = {
  id: string;
  type: "participation" | "comment" | "reminder";
  title: string;
  message: string;
  activityId?: string;
  activityTitle?: string;
  fromUserId?: string;
  fromUserName?: string;
  read: boolean;
  createdAt: any;
};

export type UserProfile = {
  email: string;
  displayName?: string;
  program?: string;
  year?: string;
  interests?: string[];
  bio?: string;
  photoURL?: string;
};
