export interface User {
  id: string;
  email: string;
  password: string;
  role: 'master' | 'admin' | 'guest';
  plan?: 'Free' | 'Pro' | 'Scale';
  planExpiresAt?: string;
  createdAt?: string;
  invitedBy?: string;
  inviteToken?: string;
  activated?: boolean;
  resetToken?: string;
  resetTokenExpiry?: string;
}
