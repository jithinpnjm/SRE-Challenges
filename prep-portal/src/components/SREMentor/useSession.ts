import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, addDoc, setDoc, doc,
  query, where, orderBy, limit, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

const REPO_NAME = 'SRE-Challenges';

export function useSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [previousTranscript, setPreviousTranscript] = useState<string>('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        await loadLastSession(user.uid);
        setReady(true);
      } else {
        try {
          await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (e) {
          console.warn('Google sign-in failed:', e);
          setReady(true);
        }
      }
    });
    return unsub;
  }, []);

  const loadLastSession = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'sessions'),
        where('userId', '==', uid),
        where('repoName', '==', REPO_NAME),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setSessionId(snap.docs[0].id);
        setPreviousTranscript(data.transcript || '');
      }
    } catch (e) {
      console.warn('Session load error:', e);
    }
  };

  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

  const saveSession = useCallback(async (transcript: string) => {
    if (!userId || !transcript.trim()) return;
    // Firestore rule: transcript must be < 100,000 chars — keep the most recent content
    const safeTranscript = transcript.length > 99000
      ? transcript.slice(-99000)
      : transcript;
    try {
      const data = {
        userId,
        repoName: REPO_NAME,
        transcript: safeTranscript,
        updatedAt: serverTimestamp(),
      };
      if (sessionIdRef.current) {
        await setDoc(doc(db, 'sessions', sessionIdRef.current), data, { merge: true });
      } else {
        const ref = await addDoc(collection(db, 'sessions'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        setSessionId(ref.id);
        sessionIdRef.current = ref.id;
      }
    } catch (e) {
      console.warn('Session save error:', e);
    }
  }, [userId]);

  const clearSession = useCallback(() => {
    setSessionId(null);
    sessionIdRef.current = null;
    setPreviousTranscript('');
  }, []);

  return { ready, userId, previousTranscript, saveSession, clearSession };
}
