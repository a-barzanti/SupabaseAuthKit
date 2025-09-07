/**
 * Shared types used across the application
 */

export interface UserData {
  id: string;
  email: string;
  role: 'user' | 'admin';
  username: string | null;
}
