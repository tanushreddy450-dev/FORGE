import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Play, Pause, RotateCcw, Square, Loader2, AlertCircle } from "lucide-react";
import { requestTTS } from "@/lib/api";
import { Button } from "@/components/shadcn/ui/button";

interface AlgoMentorVoicePlayerProps {
  text: string;
  className?: string;
  compact?: boolean;
}

// Global client-side audio cache by text content
const audioCache = new Map<string, string>();

export default function AlgoMentorVoicePlayer({
  text,
  className = "",
  compact = false,
}: AlgoMentorVoicePlayerProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused" | "completed" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount or when text changes
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    stopAudio();
    setErrorMsg(null);
  }, [text, stopAudio]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayVoice = async () => {
    if (!text || !text.trim()) return;

    // If currently paused, just resume
    if (status === "paused" && audioRef.current) {
      try {
        await audioRef.current.play();
        setStatus("playing");
        return;
      } catch {
        // Fall through to re-generate if resume fails
      }
    }

    setStatus("loading");
    setErrorMsg(null);

    try {
      let base64Audio = audioCache.get(text);
      if (!base64Audio) {
        const res = await requestTTS(text, "autumn");
        base64Audio = res.audio_base64;
        audioCache.set(text, base64Audio);
      }

      // Convert base64 to Blob for robust cross-browser audio playback
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setStatus("playing");
      audio.onpause = () => {
        if (audioRef.current && !audioRef.current.ended && audioRef.current.currentTime > 0) {
          setStatus("paused");
        }
      };
      audio.onended = () => {
        setStatus("completed");
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = (e) => {
        console.error("Audio element playback error:", e);
        setStatus("error");
        setErrorMsg("Voice playback encountered an error.");
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setStatus("playing");
    } catch (err) {
      console.error("Audio play error:", err);
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Voice explanation is temporarily unavailable.";
      setErrorMsg(msg);
    }
  };

  const handlePause = () => {
    if (audioRef.current && status === "playing") {
      audioRef.current.pause();
      setStatus("paused");
    }
  };

  const handleReplay = async () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
        setStatus("playing");
        return;
      } catch {
        // fallback
      }
    }
    handlePlayVoice();
  };

  const handleStop = () => {
    stopAudio();
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Voice Controls Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {status === "idle" && (
          <Button
            onClick={handlePlayVoice}
            variant="outline"
            size="sm"
            className="rounded-xl border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_2px_12px_rgba(139,92,246,0.2)]"
          >
            <Volume2 className="w-3.5 h-3.5 text-violet-400" />
            <span>Explain with Voice</span>
          </Button>
        )}

        {status === "loading" && (
          <Button
            disabled
            variant="outline"
            size="sm"
            className="rounded-xl border-violet-500/30 bg-violet-500/10 text-violet-300 font-mono text-xs font-semibold flex items-center gap-2 cursor-wait"
          >
            <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
            <span>Generating voice...</span>
          </Button>
        )}

        {(status === "playing" || status === "paused") && (
          <div className="flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-950/40 px-3 py-1.5 backdrop-blur-md">
            {/* Audio Wave Indicator */}
            <div className="flex items-center gap-0.5 mr-1" aria-hidden>
              <span className={`w-0.5 h-3 rounded-full bg-violet-400 ${status === "playing" ? "animate-pulse" : "opacity-40"}`} />
              <span className={`w-0.5 h-4.5 rounded-full bg-cyan-400 ${status === "playing" ? "animate-pulse delay-75" : "opacity-40"}`} />
              <span className={`w-0.5 h-2.5 rounded-full bg-fuchsia-400 ${status === "playing" ? "animate-pulse delay-150" : "opacity-40"}`} />
            </div>

            {status === "playing" ? (
              <button
                onClick={handlePause}
                title="Pause"
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-white/10 text-violet-300 transition-colors text-xs font-mono font-medium"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={handlePlayVoice}
                title="Resume"
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-white/10 text-cyan-300 transition-colors text-xs font-mono font-medium"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            )}

            <span className="w-px h-3.5 bg-white/10" aria-hidden />

            <button
              onClick={handleStop}
              title="Stop"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors text-xs font-mono"
            >
              <Square className="w-3 h-3" />
              <span>Stop</span>
            </button>
          </div>
        )}

        {status === "completed" && (
          <Button
            onClick={handleReplay}
            variant="outline"
            size="sm"
            className="rounded-xl border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_2px_12px_rgba(139,92,246,0.2)]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-violet-400" />
            <span>Replay</span>
          </Button>
        )}

        {status === "error" && (
          <Button
            onClick={handlePlayVoice}
            variant="outline"
            size="sm"
            className="rounded-xl border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>Retry Voice</span>
          </Button>
        )}
      </div>

      {/* Non-blocking Error State */}
      {status === "error" && errorMsg && !compact && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-sans text-amber-200/90" role="alert">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
