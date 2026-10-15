import React, { useEffect, useRef, useState } from "react";
import StreamingAvatar, {
    AvatarQuality,
    StreamingEvents,
    TaskType,
} from "@heygen/streaming-avatar";
import { X, Mic, MicOff, Loader2 } from "lucide-react";

const Avatar = ({ isActive, onClose, textToSpeak }) => {
    const [debug, setDebug] = useState("Initializing...");
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const videoRef = useRef(null);
    const avatarRef = useRef(null);
    const isInitRef = useRef(false);

    const HEYGEN_API_KEY = "sk_V2_hgu_k7cktRZPRvm_uwWXbSz8eqNbFKuQCjAX1FEdDfTN9cgk";
    const AVATAR_ID = "Bryan_IT_Sitting_public";

    const fetchAccessToken = async () => {
        try {
            const response = await fetch("https://api.heygen.com/v1/streaming.create_token", {
                method: "POST",
                headers: { "x-api-key": HEYGEN_API_KEY },
            });
            if (!response.ok) throw new Error("Token Request Failed");
            const data = await response.json();
            return data.data.token;
        } catch (error) {
            console.error("Token Error:", error);
            setDebug("Error: Wrong API Key or Server Issue");
            return null;
        }
    };

    const startSession = async () => {
        if (isInitRef.current || isSessionActive) return;
        isInitRef.current = true;
        setIsLoading(true);
        setDebug("Connecting...");

        try {
            if (avatarRef.current) {
                await avatarRef.current.stopAvatar();
                avatarRef.current = null;
            }

            const token = await fetchAccessToken();
            if (!token) {
                isInitRef.current = false;
                setIsLoading(false);
                return;
            }

            const newAvatar = new StreamingAvatar({ token });

            newAvatar.on(StreamingEvents.STREAM_READY, (event) => {
                setDebug("Ready");
                if (videoRef.current && event.detail) {
                    videoRef.current.srcObject = event.detail;
                    videoRef.current.play().catch(console.error);
                }
                setIsLoading(false);
            });

            newAvatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
                setDebug("Disconnected");
                setIsSessionActive(false);
                avatarRef.current = null;
                isInitRef.current = false;
                onClose(); // Notify parent
            });

            await newAvatar.createStartAvatar({
                quality: AvatarQuality.Low,
                avatarName: AVATAR_ID,
                language: "en",
            });

            avatarRef.current = newAvatar;
            setIsSessionActive(true);

        } catch (error) {
            console.error("Session Failed:", error);
            setDebug("Connection Failed");
            isInitRef.current = false;
            setIsSessionActive(false);
            setIsLoading(false);
        }
    };

    const speak = async (text) => {
        if (!avatarRef.current || !text) return;
        try {
            await avatarRef.current.speak({
                text: text,
                task_type: TaskType.REPEAT,
                task_mode: "async"
            });
        } catch (e) {
            console.error("Speak Error:", e);
        }
    };

    // Auto-start when active
    useEffect(() => {
        if (isActive && !isSessionActive && !isInitRef.current) {
            startSession();
        }
    }, [isActive]);

    // Speak when text changes
    useEffect(() => {
        if (isActive && isSessionActive && textToSpeak) {
            speak(textToSpeak);
        }
    }, [textToSpeak, isSessionActive]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (avatarRef.current) {
                avatarRef.current.stopAvatar().catch(() => { });
                avatarRef.current = null;
            }
        };
    }, []);

    if (!isActive) return null;

    return (
        <div
            className="fixed z-50 bg-black rounded-xl overflow-hidden shadow-2xl border border-purple-500/30 transition-all duration-300 ease-in-out hover:scale-105"
            style={{
                position: 'fixed',
                bottom: '5rem',
                right: '2rem',
                width: '320px',
                height: '180px',
                zIndex: 9999
            }}
        >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-2 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="text-xs text-white/80 font-mono font-semibold">AI HUMAN</span>
                    <span className="text-xs text-white/60 font-mono">{debug}</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Video Area */}
            <div className="relative w-full h-full bg-gray-900">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Avatar;
