'use client'

import React from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Circle } from 'lucide-react';
import { VoiceInputState } from '@/lib/useVoiceInput';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
    state: VoiceInputState;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}

export function VoiceInputButton({
    state,
    onClick,
    disabled = false,
    className,
}: VoiceInputButtonProps) {
    const getButtonStyles = () => {
        switch (state) {
            case 'listening':
                // Solid red for listening/recording state (no blinking)
                return 'bg-red-500 border-red-600 text-white hover:bg-red-600';
            case 'processing':
                // Blue for processing state
                return 'bg-blue-500 border-blue-600 text-white cursor-wait';
            case 'error':
                // Orange/amber for error state
                return 'bg-amber-500 border-amber-600 text-white';
            default:
                // Default state uses the same styling as submit button
                return '';
        }
    };

    const getIcon = () => {
        switch (state) {
            case 'listening':
                // Recording indicator - filled circle (record icon)
                return <Circle className="h-4 w-4 fill-current" />;
            case 'processing':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            case 'error':
                return <MicOff className="h-4 w-4" />;
            default:
                return <Mic className="h-4 w-4" />;
        }
    };

    const getTitle = () => {
        switch (state) {
            case 'listening':
                return 'Recording... (click to stop and process)';
            case 'processing':
                return 'Processing audio...';
            case 'error':
                return 'Error - click to try again';
            default:
                return 'Voice input';
        }
    };

    return (
        <Button
            type="button"
            variant="default"
            size="icon"
            className={cn(
                'flex-shrink-0 transition-all duration-200',
                getButtonStyles(),
                className
            )}
            onClick={onClick}
            disabled={disabled || state === 'processing'}
            title={getTitle()}
            aria-label={getTitle()}
        >
            {getIcon()}
        </Button>
    );
}
