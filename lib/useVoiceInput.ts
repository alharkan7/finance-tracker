'use client'

import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error';

export interface StructuredFormData {
    subject?: string;
    category?: string;
    amount?: number;
    description?: string;
    date?: string;
    reimbursed?: string;
}

interface UseVoiceInputOptions {
    formType?: 'expense' | 'income';
    onResult?: (data: { transcript: string; structured: StructuredFormData }) => void;
    onError?: (error: string) => void;
    silenceTimeout?: number; // ms to wait after silence before processing
}

interface UseVoiceInputReturn {
    state: VoiceInputState;
    errorMessage: string | null;
    startListening: () => void;
    stopListening: () => void;
    reset: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
    const {
        formType = 'expense',
        onResult,
        onError,
        silenceTimeout = 2000, // 2 seconds of silence before processing
    } = options;

    const [state, setState] = useState<VoiceInputState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Use refs to avoid stale closures
    const stateRef = useRef<VoiceInputState>('idle');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const shouldProcessRef = useRef<boolean>(false);

    // Keep stateRef in sync
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Cleanup resources (but don't trigger processing)
    const cleanupResources = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        analyserRef.current = null;
    }, []);

    // Process audio and send to transcription API
    const processAudio = useCallback(async () => {
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];

        if (chunks.length === 0) {
            setErrorMessage('No audio recorded');
            setState('error');
            stateRef.current = 'error';
            onError?.('No audio recorded');
            return;
        }

        setState('processing');
        stateRef.current = 'processing';

        try {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });

            if (audioBlob.size === 0) {
                throw new Error('No audio recorded');
            }

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch(`/api/transcribe?type=${formType}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Transcription failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.transcript && data.structured) {
                onResult?.({ transcript: data.transcript, structured: data.structured });
                setState('idle');
                stateRef.current = 'idle';
            } else if (data.transcript) {
                onResult?.({ transcript: data.transcript, structured: {} });
                setState('idle');
                stateRef.current = 'idle';
            } else {
                throw new Error('No transcript received');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to process audio';
            setErrorMessage(message);
            setState('error');
            stateRef.current = 'error';
            onError?.(message);
        }
    }, [formType, onResult, onError]);

    // Stop recording and process audio
    const stopAndProcess = useCallback(() => {
        if (stateRef.current !== 'listening') return;

        shouldProcessRef.current = true;

        // Clear timers
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Stop the media recorder - this will trigger onstop
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        } else {
            // If recorder isn't recording, process directly
            cleanupResources();
            processAudio();
        }
    }, [cleanupResources, processAudio]);

    // Monitor audio levels for silence detection
    const monitorAudioLevel = useCallback(() => {
        if (!analyserRef.current || stateRef.current !== 'listening') return;

        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const threshold = 10; // Silence threshold

        if (average < threshold) {
            // Silence detected - start/reset timer
            if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                    silenceTimerRef.current = null;
                    stopAndProcess();
                }, silenceTimeout);
            }
        } else {
            // Sound detected - reset timer
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        }

        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }, [silenceTimeout, stopAndProcess]);

    const startListening = useCallback(async () => {
        try {
            cleanupResources();
            setErrorMessage(null);
            setState('listening');
            stateRef.current = 'listening';
            audioChunksRef.current = [];
            shouldProcessRef.current = false;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Set up audio context for silence detection
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Set up media recorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm',
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                cleanupResources();
                if (shouldProcessRef.current && audioChunksRef.current.length > 0) {
                    processAudio();
                }
                mediaRecorderRef.current = null;
            };

            mediaRecorder.start(100); // Collect data every 100ms

            // Start monitoring audio levels after a short delay
            setTimeout(() => {
                if (stateRef.current === 'listening') {
                    monitorAudioLevel();
                }
            }, 500);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to start recording';
            setErrorMessage(message);
            setState('error');
            stateRef.current = 'error';
            onError?.(message);
            cleanupResources();
        }
    }, [cleanupResources, processAudio, monitorAudioLevel, onError]);

    const stopListening = useCallback(() => {
        stopAndProcess();
    }, [stopAndProcess]);

    const reset = useCallback(() => {
        shouldProcessRef.current = false;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        cleanupResources();
        audioChunksRef.current = [];
        setState('idle');
        stateRef.current = 'idle';
        setErrorMessage(null);
    }, [cleanupResources]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            shouldProcessRef.current = false;
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            cleanupResources();
        };
    }, [cleanupResources]);

    return {
        state,
        errorMessage,
        startListening,
        stopListening,
        reset,
    };
}
