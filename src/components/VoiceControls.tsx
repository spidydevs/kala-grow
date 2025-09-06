import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, Play, Pause } from 'lucide-react';

interface VoiceControlsProps {
  onTranscript?: (text: string) => void;
  onVoiceCommand?: (command: string) => void;
  autoSpeak?: boolean;
  className?: string;
}

export function VoiceControls({ 
  onTranscript, 
  onVoiceCommand, 
  autoSpeak = false, 
  className = '' 
}: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [confidence, setConfidence] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setConfidence(confidence);
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          onTranscript?.(finalTranscript);
          onVoiceCommand?.(finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      setVoiceEnabled(true);
    }
    
    // Check speech synthesis support
    if ('speechSynthesis' in window) {
      // Speech synthesis is available
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!voiceEnabled) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const speak = (text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
  }) => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate || 0.9;
    utterance.pitch = options?.pitch || 1;
    utterance.volume = options?.volume || 0.8;
    
    if (options?.voice) {
      utterance.voice = options.voice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Remove the problematic useImperativeHandle since it's not being used correctly
  // The parent can use the component directly through props

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Voice Input Button */}
      {voiceEnabled && (
        <div className="relative">
          <button
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isListening
                ? 'bg-red-500 text-white shadow-lg scale-105'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          {/* Listening indicator */}
          {isListening && (
            <div className="absolute -top-1 -right-1">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          )}
          
          {/* Confidence indicator */}
          {confidence > 0 && (
            <div className="absolute -bottom-6 left-0 right-0 text-xs text-center text-gray-500">
              {Math.round(confidence * 100)}%
            </div>
          )}
        </div>
      )}

      {/* Audio Output Button */}
      <div className="relative">
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`p-2 rounded-lg transition-colors ${
            audioEnabled
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
          title={audioEnabled ? 'Disable audio responses' : 'Enable audio responses'}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        
        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Stop Speaking Button (when speaking) */}
      {isSpeaking && (
        <button
          onClick={stopSpeaking}
          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          title="Stop speaking"
        >
          <Pause className="w-5 h-5" />
        </button>
      )}

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        title="Voice settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <h3 className="font-semibold text-gray-900 mb-3">Voice Settings</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Voice Input</label>
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={() => setVoiceEnabled(!voiceEnabled)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Audio Responses</label>
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={() => setAudioEnabled(!audioEnabled)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Voice recognition requires microphone access
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the component with a ref for external control
export const VoiceControlsWithRef = React.forwardRef<
  {
    speak: (text: string, options?: any) => void;
    stopSpeaking: () => void;
    isListening: boolean;
    isSpeaking: boolean;
  },
  VoiceControlsProps
>((props, ref) => {
  return <VoiceControls {...props} />;
});