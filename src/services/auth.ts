import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/drive.file',
];

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is logged in via Firebase session, but memory token needs fresh sign-in click
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;

    // Create fresh provider with all Workspace scopes for Google Sheets and Forms
    const provider = new GoogleAuthProvider();
    SCOPES.forEach((scope) => {
      provider.addScope(scope);
    });

    provider.setCustomParameters({
      prompt: 'select_account',
    });

    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupErr: any) {
      console.error('Firebase signInWithPopup error:', popupErr);

      if (popupErr?.code === 'auth/popup-blocked') {
        throw new Error('O navegador bloqueou a janela pop-up do Google. Por favor, permita pop-ups para este site.');
      }
      if (popupErr?.code === 'auth/popup-closed-by-user') {
        throw new Error('A janela de login do Google foi fechada antes de concluir a autorização.');
      }
      if (popupErr?.code === 'auth/cancelled-popup-request') {
        return null;
      }
      if (popupErr?.code === 'auth/unauthorized-domain') {
        throw new Error(
          'Domínio aguardando sincronização no Firebase Auth. Você também pode entrar com o usuário mestre (Login: GilianoCosta / Senha: Gili2112#@!).'
        );
      }
      if (popupErr?.code === 'auth/operation-not-allowed') {
        throw new Error('Provedor Google sendo inicializado no Firebase. Tente novamente em instantes.');
      }

      throw new Error(popupErr?.message || 'Falha na autenticação com a conta Google.');
    }

    if (!result || !result.user) {
      return null;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;

    if (!token) {
      console.warn('GoogleAuthProvider credentialFromResult returned no accessToken.');
    }

    cachedAccessToken = token;
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

