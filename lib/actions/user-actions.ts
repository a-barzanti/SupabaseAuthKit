import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/client';
import { UserData } from '@/lib/types';

// Types for action responses
export interface ActionResponse<T = unknown> {
  data?: T;
  error?: string;
  success?: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  repeatPassword?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UpdateUserData {
  id: string;
  email?: string;
  username?: string;
  role?: 'user' | 'admin';
  password?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  role?: 'user' | 'admin';
  emailRedirectTo?: string;
  emailConfirm?: boolean;
}

// ====================
// UTILITY FUNCTIONS
// ====================

/**
 * Validates password match for user registration
 */
function validatePasswordMatch(password: string, repeatPassword?: string): string | null {
  if (repeatPassword && password !== repeatPassword) {
    return 'Passwords do not match';
  }
  return null;
}

/**
 * Validates email format (basic validation)
 */
function validateEmail(email: string): string | null {
  if (!email || !email.includes('@')) {
    return 'Invalid email format';
  }
  return null;
}

/**
 * Standardized error handler for user actions
 */
function handleUserActionError<T = unknown>(
  error: unknown,
  defaultMessage: string,
): ActionResponse<T> {
  console.error('User action error:', error);
  return {
    error: error instanceof Error ? error.message : defaultMessage,
  };
}

/**
 * Creates a user via client-side signUp (for self-registration)
 */
async function createUserViaSignUp({
  email,
  password,
  role,
  emailRedirectTo,
}: CreateUserData): Promise<ActionResponse> {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: role ? { user_role: role } : undefined,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Creates a user via admin client (for admin user creation)
 */
async function createUserViaAdmin({
  email,
  password,
  role = 'user',
  emailConfirm = true,
}: CreateUserData): Promise<ActionResponse<UserData>> {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: emailConfirm,
    app_metadata: {
      user_role: role,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'User data not returned after creation.' };
  }

  // Supabase admin.createUser does not return username, so we default to null
  const newUser: UserData = {
    id: data.user.id,
    email: data.user.email || '',
    role: (data.user.app_metadata.user_role as 'user' | 'admin') || 'user',
    username: null, // Admin created users do not have a username by default
  };

  return { data: newUser, success: true };
}

// ====================
// AUTH ACTIONS (Client-side)
// ====================

/**
 * Sign up a new user (self-registration)
 */
export async function signUpUser({
  email,
  password,
  repeatPassword,
}: SignUpData): Promise<ActionResponse> {
  try {
    // Validate email format
    const emailError = validateEmail(email);
    if (emailError) {
      return { error: emailError };
    }

    // Validate passwords match
    const passwordError = validatePasswordMatch(password, repeatPassword);
    if (passwordError) {
      return { error: passwordError };
    }

    // Create user via client signUp
    return await createUserViaSignUp({
      email,
      password,
      emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/protected`,
    });
  } catch (error) {
    return handleUserActionError(error, 'An error occurred during sign up');
  }
}

/**
 * Sign in a user
 */
export async function signInUser({ email, password }: SignInData): Promise<ActionResponse> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    return handleUserActionError(error, 'An error occurred during sign in');
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(): Promise<ActionResponse> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    return handleUserActionError(error, 'An error occurred during sign out');
  }
}

/**
 * Request password reset for email
 */
export async function requestPasswordReset(email: string): Promise<ActionResponse> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/update-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    return handleUserActionError(error, 'An error occurred during password reset request');
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(password: string): Promise<ActionResponse> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    return handleUserActionError(error, 'An error occurred during password update');
  }
}

/**
 * Delete a user (client-side using RPC)
 */
export async function deleteUser(userId: string): Promise<ActionResponse> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('delete_user', { user_id_in: userId });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    return handleUserActionError(error, 'An error occurred during user deletion');
  }
}

/**
 * Update user profile (client-side using RPC)
 */
export async function updateUserProfile({
  id,
  email,
  username,
  role,
}: UpdateUserData): Promise<ActionResponse> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('update_user', {
      user_id_in: id,
      new_email_in: email,
      new_role_in: role,
      new_username_in: username,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    return handleUserActionError(error, 'An error occurred during user update');
  }
}

// ====================
// ADMIN ACTIONS (Client-side with Admin Privileges)
// ====================

/**
 * Create user via admin client (for admin user management)
 */
export async function createUserAdmin({
  email,
  password,
  role = 'user',
}: CreateUserData): Promise<ActionResponse<UserData>> {
  try {
    // Validate email format
    const emailError = validateEmail(email);
    if (emailError) {
      return { error: emailError };
    }

    // Create user via admin client
    const result = await createUserViaAdmin({
      email,
      password,
      role,
      emailConfirm: true,
    });

    return result;
  } catch (error) {
    return handleUserActionError<UserData>(error, 'An error occurred during admin user creation');
  }
}
