import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyA1-762TjaFPBqpVzWF2zjFVWUTFav48hk',
  authDomain: 'svc-account-management.firebaseapp.com',
  projectId: 'svc-account-management',
  storageBucket: 'svc-account-management.firebasestorage.app',
  messagingSenderId: '878927740298',
  appId: '1:878927740298:web:04e3a7d4eb28d5bb5f1c73',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app, 'ai-studio-807a1f54-cf2e-40ed-a112-ec8cb73a9632');
export const auth = getAuth(app);
