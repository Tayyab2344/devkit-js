'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useModal } from '@/lib/ModalContext';

declare global {
  interface Window {
    ZoomMtgEmbedded: any;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (err) => reject(err);
    document.body.appendChild(s);
  });
}

function loadCSS(href: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

export default function ClassroomPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { showAlert } = useModal();
  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [classDetails, setClassDetails] = useState<any>(null);
  const [resetting, setResetting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(2400); // 40 mins
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsTimerActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timeRemaining]);
  const zoomStartedRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      setDebugLogs(prev => [...prev, `LOG: ${msg}`].slice(-100));
    };

    console.error = (...args) => {
      originalError(...args);
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      setDebugLogs(prev => [...prev, `ERROR: ${msg}`].slice(-100));
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);
  // Zoom only class screen

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Poll class status every 10 seconds to detect if admin ended it
  useEffect(() => {
    if (authLoading || !user || isAdmin || !id) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/classes/${id}`);
        if (data.status === 'completed') {
          clearInterval(interval);
          await showAlert('Lecture Ended', 'This lecture has been ended by the instructor.');
          window.location.href = '/dashboard';
        }
      } catch (err) {
        console.error('Failed to poll class status:', err);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [id, isAdmin, authLoading, user]);

  const zoomClientRef = useRef<any>(null);

  const handleExit = async (endClass: boolean) => {
    if (zoomClientRef.current) {
      try {
        if (endClass) {
          await zoomClientRef.current.endMeeting();
        } else {
          await zoomClientRef.current.leaveMeeting();
        }
      } catch (err) {
        console.error('Failed to leave/end Zoom meeting programmatically:', err);
      }
    }

    if (endClass) {
      try {
        await api.patch(`/classes/${id}`, { status: 'completed' });
      } catch (err) {
        console.error('Failed to end class:', err);
      }
    }
    window.location.href = isAdmin ? '/admin/classes' : '/dashboard';
  };

  const startRecording = async () => {
    try {
      // 1. Get Screen/Tab Audio+Video
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      screenStreamRef.current = screenStream;

      // 2. Get Microphone Audio (optional, fallback if denied)
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
      } catch (err) {
        console.warn('Microphone access denied or unavailable', err);
      }

      // 3. Audio Mixing using Web Audio API
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();

      let hasAudio = false;

      if (screenStream.getAudioTracks().length > 0) {
        const source1 = audioCtx.createMediaStreamSource(screenStream);
        source1.connect(dest);
        hasAudio = true;
      }
      if (micStream && micStream.getAudioTracks().length > 0) {
        const source2 = audioCtx.createMediaStreamSource(micStream);
        source2.connect(dest);
        hasAudio = true;
      }

      // Combine video tracks and mixed audio tracks
      const mixedTracks = [...screenStream.getVideoTracks()];
      if (hasAudio) {
        mixedTracks.push(...dest.stream.getAudioTracks());
      } else {
        mixedTracks.push(...screenStream.getAudioTracks());
      }

      const mixedStream = new MediaStream(mixedTracks);

      // 4. Initialize MediaRecorder
      let options = { mimeType: 'video/webm;codecs=vp9,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8,opus' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }

      const mediaRecorder = new MediaRecorder(mixedStream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Compile the recording
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        // Trigger auto-download
        const a = document.createElement('a');
        a.href = url;
        a.download = `live-class-${id}-${new Date().toISOString().slice(0, 10)}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success alert
        showAlert(
          'Recording Saved',
          'Your class recording has been successfully compiled and downloaded as a .webm file. You can now upload it (e.g. to YouTube) and link it in the admin recordings section.'
        );

        // Clean up tracks
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
        }
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((track) => track.stop());
          micStreamRef.current = null;
        }
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
        }

        setIsRecording(false);
      };

      // Listen if the user stops sharing via browser bar
      screenStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      };

      mediaRecorder.start(1000); // chunk every second
      setIsRecording(true);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      if (err.name !== 'NotAllowedError') {
        showAlert('Recording Error', 'Failed to start screen recording: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    // If token is provided in URL query parameters (from mobile WebView redirect), set it in cookie/localStorage
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryToken = urlParams.get('token');
      if (queryToken) {
        document.cookie = `accessToken=${queryToken}; path=/; max-age=604800`;
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        window.location.reload();
        return;
      }
    }

    if (authLoading) return;
    if (zoomStartedRef.current) return;
    zoomStartedRef.current = true;

    let cancelled = false;

    async function initZoom(zoomData: any) {
      try {
        setLoading(true);
        // 1. Load CSS
        await loadCSS('https://source.zoom.us/6.2.0/css/bootstrap.css');
        await loadCSS('https://source.zoom.us/6.2.0/css/react-select.css');

        // 2. Load the Component View script
        if (typeof window !== 'undefined') {
          (window as any).React = React;
          (window as any).ReactDOM = ReactDOM;
        }
        await loadScript('https://source.zoom.us/zoom-meeting-embedded-6.2.0.min.js');

        if (cancelled) return;

        const ZoomMtgEmbedded = (window as any).ZoomMtgEmbedded;
        if (!ZoomMtgEmbedded) {
          throw new Error('Zoom SDK failed to load. Please verify your internet connection.');
        }

        // 3. Create Zoom client and save to ref
        console.log('ClassroomPage: Creating Zoom client instance...');
        const client = ZoomMtgEmbedded.createClient();
        zoomClientRef.current = client;

        // 4. Initialize the Component View SDK inside containerRef
        console.log('ClassroomPage: Initializing client with debug: true...');
        const containerEl = containerRef.current;
        const cWidth = containerEl?.clientWidth || window.innerWidth - 280;
        const cHeight = containerEl?.clientHeight || window.innerHeight - 64;
        await client.init({
          zoomAppRoot: containerEl,
          language: 'en-US',
          debug: true,
          customSize: {
            width: cWidth,
            height: cHeight,
          },
        });

        // 5. Add event listener to monitor connection changes (after init)
        try {
          client.on('connection-change', (payload: any) => {
            console.log('Zoom Connection state changed:', payload.state);
            if (payload.state === 'Closed') {
              handleExit(false);
            }
            if (payload.state === 'Connected') {
              setIsTimerActive(true);
            }
          });
        } catch (evtErr) {
          console.warn('Could not register connection-change listener:', evtErr);
        }

        if (cancelled) return;

        // 6. Join the meeting
        console.log('ClassroomPage: Joining meeting with data:', {
          sdkKey: zoomData.sdkKey,
          meetingNumber: zoomData.zoomMeetingId,
          userName: zoomData.userName
        });
        await client.join({
          signature: zoomData.signature,
          meetingNumber: String(zoomData.zoomMeetingId).replace(/\D/g, ''),
          password: zoomData.zoomPasscode,
          userName: zoomData.userName,
          userEmail: zoomData.userEmail || '',
          zak: zoomData.zak || undefined,
        });

        console.log('ClassroomPage: Join success! Hiding loading screen.');
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to init Zoom:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to initialize Zoom meeting.');
          setLoading(false);
        }
      }
    }

    async function initClassroom() {
      try {
        console.log('ClassroomPage: Starting initClassroom...');
        setLoading(true);
        // Load full class details first for the sidebar UI
        try {
          console.log('ClassroomPage: Fetching class details...');
          const classRes = await api.get(`/classes/${id}`);
          console.log('ClassroomPage: Class details fetched successfully:', classRes.data);
          setClassDetails(classRes.data);
        } catch (err) {
          console.error('ClassroomPage: Failed to fetch class metadata:', err);
        }

        // Fetch credentials from backend
        console.log('ClassroomPage: Fetching join credentials...');
        const { data } = await api.get(`/classes/${id}/join`);
        console.log('ClassroomPage: Join credentials fetched successfully:', data);
        if (cancelled) {
          console.log('ClassroomPage: initClassroom was cancelled before Zoom init.');
          return;
        }

        if (data.zoomMeetingId) {
          console.log('ClassroomPage: Calling initZoom...');
          await initZoom(data);
        } else {
          throw new Error('This class does not have a Zoom meeting scheduled.');
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error('ClassroomPage: Error in initClassroom:', err);
        setError(
          err.response?.data?.message ||
          err.message ||
          'Unable to join this classroom. Please verify the class status and try again.',
        );
        setLoading(false);
      }
    }

    initClassroom();

    return () => {
      cancelled = true;
      zoomStartedRef.current = false;
      if (zoomClientRef.current) {
        try {
          const ZoomMtgEmbedded = (window as any).ZoomMtgEmbedded;
          if (ZoomMtgEmbedded) {
            ZoomMtgEmbedded.destroyClient();
          }
        } catch (e) {
          console.error('Failed to destroy Zoom client:', e);
        }
        zoomClientRef.current = null;
      }
      // Stop recording if active on unmount
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [id, router, user, authLoading, isAdmin]);

  // Anti-Screenshot & Screen Hiding for students
  useEffect(() => {
    if (isAdmin || authLoading || !user) return;

    // 1. Context Menu (Right Click) Block
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Keyboard Interceptor
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        try { navigator.clipboard.writeText(''); } catch { }
        alert('Screenshots are disabled for security reasons.');
        e.preventDefault();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        alert('Printing is disabled.');
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
      }
    };

    // 3. Clear clipboard on copy event
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', 'Screenshots/Copying is restricted on Premier LMS.');
      }
    };

    // 4. Focus loss detection (Snipping Tool & Switcher Shield)
    const handleVisibilityChange = () => {
      const overlay = document.getElementById('screenshot-blur-overlay');
      if (document.hidden) {
        if (overlay) overlay.style.display = 'flex';
      } else {
        if (overlay) overlay.style.display = 'none';
      }
    };

    const handleWindowBlur = () => {
      const overlay = document.getElementById('screenshot-blur-overlay');
      if (overlay) overlay.style.display = 'flex';
    };

    const handleWindowFocus = () => {
      const overlay = document.getElementById('screenshot-blur-overlay');
      if (overlay) overlay.style.display = 'none';
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isAdmin, authLoading, user]);

  if (!isMounted) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#060c09] text-white">
        <div className="w-8 h-8 border-3 border-[#c9a84c]/20 border-t-[#c9a84c] rounded-full animate-spin" />
        <p className="text-xs text-gray-300 font-medium mt-3">Loading classroom…</p>
      </div>
    );
  }

  return (
    <>
      <main
        style={{ display: 'flex' }}
        className="fixed inset-0 w-screen h-screen bg-[#060c09] z-50 overflow-hidden flex flex-col font-sans text-white"
      >
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print { body { display: none !important; } }
          
          /* Force Zoom SDK to fill the container */
          #zmmtg-root {
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }
          [class*="meeting-app"] {
            width: 100% !important;
            height: 100% !important;
          }
          
          /* Custom scrollbar for sidebar */
          .custom-scroll::-webkit-scrollbar {
            width: 5px;
          }
          .custom-scroll::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.01);
          }
          .custom-scroll::-webkit-scrollbar-thumb {
            background: rgba(201, 168, 76, 0.15);
            border-radius: 10px;
          }
          .custom-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(201, 168, 76, 0.35);
          }
        ` }} />

        {!isAdmin && (
          <div
            id="screenshot-blur-overlay"
            style={{ display: 'none' }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[99999] flex flex-col items-center justify-center text-center p-6 text-white"
          >
            <div className="w-16 h-16 rounded-full bg-red-950 flex items-center justify-center text-red-500 font-bold text-2xl border border-red-500/30 mb-4">
              🔒
            </div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Screen Protected</h2>
            <p className="text-sm text-gray-300 max-w-sm">
              Screenshots and screen recording are strictly restricted on Premier LMS. Keep this window active to continue the class.
            </p>
          </div>
        )}

        {/* Top Header Navigation */}
        <header className="h-16 border-b border-white/10 bg-[#091410] px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">LIVE</span>
            <div className="h-4 w-[1px] bg-white/15" />
            <h1 className="text-xs md:text-sm font-bold text-white/90 truncate max-w-[240px] md:max-w-md">
              {classDetails ? `${classDetails.courseName} — ${classDetails.title}` : 'Live Classroom Session'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Record Button (Admin Only) */}
            {isAdmin && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-extrabold border rounded-lg transition-all duration-200 cursor-pointer ${isRecording
                    ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <svg className={`w-2.5 h-2.5 ${isRecording ? 'text-red-400' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                </svg>
                {isRecording ? 'Stop Recording' : 'Record Class'}
              </button>
            )}

            {/* Exit Button */}
            <button
              onClick={() => {
                if (isAdmin) {
                  setShowExitDialog(true);
                } else {
                  handleExit(false);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold text-white bg-red-650 hover:bg-red-600 rounded-lg shadow-lg shadow-red-900/10 transition-all duration-200 cursor-pointer border border-red-500/15"
            >
              Leave Class
            </button>
          </div>
        </header>

        {/* Main Grid split */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left Area: Zoom Screen */}
          <div className="flex-1 bg-black relative">
            <div ref={containerRef} className="w-full h-full bg-[#090f0c] overflow-hidden relative" />

            {/* Internal Loading Overlay */}
            {loading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-[#07130e] to-black z-10 gap-3">
                <div className="w-8 h-8 border-3 border-[#c9a84c]/20 border-t-[#c9a84c] rounded-full animate-spin" />
                <p className="text-xs text-gray-400 font-medium animate-pulse">Establishing secure connection…</p>
                <div id="debug-logs" style={{ display: 'none' }}>
                  {debugLogs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Internal Error Overlay */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 gap-4 bg-[#070e0c]/98">
                <div className="w-12 h-12 rounded-full bg-red-950/50 flex items-center justify-center text-red-500 font-bold text-xl border border-red-500/25">
                  !
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="font-bold text-sm text-red-400">Classroom Connection Failed</h3>
                  <p className="text-xs text-gray-400">{error}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleExit(false)}
                    className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer border border-white/5"
                  >
                    Back to Dashboard
                  </button>
                  {isAdmin && (
                    <button
                      disabled={resetting}
                      onClick={async () => {
                        setResetting(true);
                        try {
                          await api.post(`/classes/${id}/end-zoom`);
                          await showAlert("Session Reset Success", "The active Zoom meeting session has been terminated. You can now try to join again.");
                          window.location.reload();
                        } catch (err: any) {
                          await showAlert("Reset Failed", err.response?.data?.message || "Failed to end the Zoom session.");
                        } finally {
                          setResetting(false);
                        }
                      }}
                      className="px-5 py-2 bg-[#c9a84c] hover:bg-[#b0913f] text-black text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {resetting ? 'Resetting Zoom Session...' : 'Force Reset Zoom Session'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Area: Dashboard details */}
          <aside className="w-[280px] shrink-0 border-l border-white/10 bg-[#070f0b] flex flex-col hidden lg:flex">
            {/* Header tab */}
            <div className="p-4 border-b border-white/10 bg-[#091410]/50 shrink-0">
              <h2 className="text-[10px] font-extrabold text-[#c9a84c] uppercase tracking-widest">Room Information</h2>
            </div>

            {/* Content info */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scroll">

              {/* Session Timer Card */}
              <div className="bg-[#0b1712] border border-white/5 rounded-xl p-3.5 space-y-2.5 shadow-inner">
                <h3 className="text-[10px] font-extrabold text-[#c9a84c] uppercase tracking-wider">Session Status</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Zoom Feed</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isTimerActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                    {isTimerActive ? 'CONNECTED' : 'WAITING'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Time Remaining</span>
                  <span className={`text-xs font-bold font-mono tracking-wider ${timeRemaining <= 300 && timeRemaining > 0
                      ? 'text-red-400 animate-pulse bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded'
                      : 'text-white'
                    }`}>
                    {timeRemaining === 0
                      ? '00:00'
                      : `${Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:${(timeRemaining % 60).toString().padStart(2, '0')}`
                    }
                  </span>
                </div>
                {timeRemaining <= 300 && timeRemaining > 0 && (
                  <p className="text-[9px] text-red-400 leading-snug">⚠️ Warning: Meeting will end in less than 5 minutes due to Zoom free tier limit.</p>
                )}
                {timeRemaining === 0 && (
                  <p className="text-[9px] text-red-500 leading-snug font-semibold">❌ Free tier limit reached. Please restart session if needed.</p>
                )}
              </div>

              {/* Meta info box */}
              <div className="bg-[#0b1712] border border-white/5 rounded-xl p-3.5 space-y-3 shadow-inner">
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500">Course Unit</span>
                  <p className="text-xs font-semibold text-white/90 mt-0.5">{classDetails?.courseName || 'Loading course...'}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500">Topic Title</span>
                  <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{classDetails?.title || 'Loading title...'}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500">Assigned Batch</span>
                  <p className="text-xs text-gray-300 mt-0.5">{classDetails?.batchName || 'Default Batch'}</p>
                </div>
              </div>

              {/* Rules card */}
              <div className="bg-[#0b1712] border border-white/5 rounded-xl p-3.5 space-y-3">
                <h3 className="text-[10px] font-extrabold text-white/70 uppercase tracking-wider">Classroom Policies</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Audio Controls</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${classDetails?.allowStudentMic ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {classDetails?.allowStudentMic ? 'MUTE ON ENTRY' : 'MUTED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Video Feed</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${classDetails?.allowStudentCamera ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {classDetails?.allowStudentCamera ? 'ENABLED' : 'MUTED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Screensharing</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${classDetails?.allowStudentScreenshare ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {classDetails?.allowStudentScreenshare ? 'ENABLED' : 'RESTRICTED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-1.5 p-1">
                <h4 className="text-[9px] font-extrabold text-[#c9a84c] uppercase tracking-wider">Guidelines</h4>
                <ul className="text-[11px] text-gray-400 space-y-2 pl-4 list-disc leading-relaxed">
                  <li>Write questions in Zoom chat.</li>
                  <li>Remain muted unless asked to speak.</li>
                  <li>Recording material is prohibited.</li>
                  {isAdmin && (
                    <li className="text-[#c9a84c] font-semibold list-none -ml-4 mt-3 p-3 bg-[#c9a84c]/5 border border-[#c9a84c]/10 rounded-lg leading-snug">
                      💡 Admit Students: Click the layout/participants icon (top-left) or three-dots (bottom-right) inside the Zoom video widget, open the Participants list, and click "Admit" to let students enter.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Secure label */}
            <div className="p-3 border-t border-white/5 bg-[#050b08] text-center shrink-0">
              <span className="text-[9px] text-gray-500 font-medium tracking-wide">Secure LMS Classroom Environment</span>
            </div>
          </aside>
        </div>

        {/* Exit dialog */}
        {showExitDialog && isAdmin && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm">
            <div className="relative bg-[#0b1411] border border-white/10 p-6 rounded-xl w-full max-w-sm mx-4 text-white shadow-2xl space-y-4">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-2 uppercase tracking-wider">
                ⚠️ Close Lecture Session
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Do you want to end this live class for all students (completing the course lecture), or just temporarily leave?
              </p>
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleExit(true)}
                  className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  End Class for All
                </button>
                <button
                  onClick={() => handleExit(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Just Leave Room
                </button>
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="px-4 py-2 bg-transparent border border-white/10 hover:bg-white/5 text-gray-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
