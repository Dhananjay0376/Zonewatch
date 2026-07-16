import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Mock Firebase SDKs
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => {
  const mockUser = {
    email: 'test-volunteer@stadium.fifa.com',
    displayName: 'Test Volunteer',
    photoURL: 'https://example.com/avatar.jpg',
  };
  return {
    getAuth: vi.fn(() => ({
      currentUser: mockUser,
    })),
    onAuthStateChanged: vi.fn((auth, callback) => {
      // Immediately call callback with logged in mockUser
      callback(mockUser);
      return () => {};
    }),
    signOut: vi.fn(() => Promise.resolve()),
    signInWithEmailAndPassword: vi.fn(() => Promise.resolve()),
    createUserWithEmailAndPassword: vi.fn(() => Promise.resolve()),
    signInWithPopup: vi.fn(() => Promise.resolve()),
    GoogleAuthProvider: vi.fn(),
  };
});

vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(() => Promise.resolve()),
    updateDoc: vi.fn(() => Promise.resolve()),
    query: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: vi.fn((q, callback) => {
      // Return empty snapshots by default
      callback({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        forEach: (_cb: unknown) => {}
      });
      return () => {};
    }),
  };
});
