import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { focusService } from '../services/focus';
import { useAuth } from './AuthContext';
import { FocusSession } from '../types';

interface FocusContextType {
  activeSession: FocusSession | null;
  timeRemaining: number;
  isRunning: boolean;
  appSwitches: number;
  screenOffs: number;
  startSession: (durationMinutes: number) => Promise<{ error: string | null }>;
  cancelSession: () => Promise<void>;
  completedPoints: number | null;
  dismissResult: () => void;
  sessionFailed: boolean;
}

const FocusContext = createContext<FocusContextType>({
  activeSession: null,
  timeRemaining: 0,
  isRunning: false,
  appSwitches: 0,
  screenOffs: 0,
  startSession: async () => ({ error: null }),
  cancelSession: async () => {},
  completedPoints: null,
  dismissResult: () => {},
  sessionFailed: false,
});

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [appSwitches, setAppSwitches] = useState(0);
  const [screenOffs, setScreenOffs] = useState(0);
  const [completedPoints, setCompletedPoints] = useState<number | null>(null);
  const [sessionFailed, setSessionFailed] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Monitor app state for cheat detection
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (isRunning) {
        if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
          setAppSwitches((prev) => prev + 1);
        }
        if (nextAppState === 'background') {
          setScreenOffs((prev) => prev + 1);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isRunning]);

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning]);

  const handleComplete = useCallback(async () => {
    if (!activeSession || !user) return;

    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const { points, error } = await focusService.completeSession(
      activeSession.id,
      user.id,
      appSwitches,
      screenOffs
    );

    if (error) {
      setSessionFailed(true);
    } else if (points > 0) {
      setCompletedPoints(points);
    } else {
      setSessionFailed(true);
    }

    setActiveSession(null);
    await refreshUser();
  }, [activeSession, user, appSwitches, screenOffs, refreshUser]);

  const startSession = useCallback(async (durationMinutes: number): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not logged in' };

    const { session, error } = await focusService.startSession(user.id, durationMinutes);
    if (error || !session) return { error: error || 'Failed to start session' };

    setActiveSession(session);
    setTimeRemaining(durationMinutes * 60);
    setAppSwitches(0);
    setScreenOffs(0);
    setIsRunning(true);
    setCompletedPoints(null);
    setSessionFailed(false);

    return { error: null };
  }, [user]);

  const cancelSession = useCallback(async () => {
    if (!activeSession) return;

    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await focusService.cancelSession(activeSession.id);
    setActiveSession(null);
    setTimeRemaining(0);
  }, [activeSession]);

  const dismissResult = useCallback(() => {
    setCompletedPoints(null);
    setSessionFailed(false);
  }, []);

  return (
    <FocusContext.Provider
      value={{
        activeSession,
        timeRemaining,
        isRunning,
        appSwitches,
        screenOffs,
        startSession,
        cancelSession,
        completedPoints,
        dismissResult,
        sessionFailed,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export const useFocus = () => useContext(FocusContext);
