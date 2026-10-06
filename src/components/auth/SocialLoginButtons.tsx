import { useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { getOAuthAuthorizeUrl, fetchOAuthStatus } from "@/lib/api";
import { Loader2, AlertCircle } from "lucide-react";

interface SocialLoginButtonsProps {
  redirectTo?: string;
  disabled?: boolean;
}

export function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

export function LinkedInIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="#0A66C2"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.979 0 1.778-.773 1.778-1.729V1.73C24 .774 23.205 0 22.222 0h.003Z" />
    </svg>
  );
}

export function SocialLoginButtons({ redirectTo, disabled = false }: SocialLoginButtonsProps) {
  const [activeProvider, setActiveProvider] = useState<"google" | "linkedin" | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  const handleSocialClick = async (provider: "google" | "linkedin") => {
    setActiveProvider(provider);

    // Clear provider-specific error on fresh action attempt
    if (provider === "google") {
      setGoogleError(null);
    } else {
      setLinkedinError(null);
    }

    try {
      // Lazy validation: Check backend provider configuration ONLY upon explicit user click
      const status = await fetchOAuthStatus();
      const isConfigured = provider === "google" ? status.google.configured : status.linkedin.configured;

      if (!isConfigured) {
        if (provider === "google") {
          setGoogleError("Google sign-in is not configured yet.");
        } else {
          setLinkedinError("LinkedIn sign-in is not configured yet.");
        }
        setActiveProvider(null);
        return;
      }

      // If configured, navigate to the provider's OAuth flow
      const authUrl = getOAuthAuthorizeUrl(provider, redirectTo);
      window.location.href = authUrl;
    } catch {
      // Fallback if backend call fails or provider is unconfigured
      if (provider === "google") {
        setGoogleError("Google sign-in is not configured yet.");
      } else {
        setLinkedinError("LinkedIn sign-in is not configured yet.");
      }
      setActiveProvider(null);
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="space-y-2.5">
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || activeProvider !== null}
            onClick={() => handleSocialClick("google")}
            className="w-full h-10 rounded-lg text-sm font-medium border-border bg-background hover:bg-muted/60 text-foreground transition-colors flex items-center justify-center gap-2.5 cursor-pointer shadow-none"
          >
            {activeProvider === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <GoogleIcon className="w-4 h-4 shrink-0" />
            )}
            <span>Continue with Google</span>
          </Button>

          {googleError && (
            <div
              role="alert"
              className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 dark:bg-amber-500/15 p-2.5 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="leading-snug">{googleError}</span>
              </div>
              <button
                type="button"
                onClick={() => setGoogleError(null)}
                className="text-muted-foreground hover:text-foreground text-xs shrink-0 px-1 py-0.5 cursor-pointer"
                aria-label="Dismiss Google error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || activeProvider !== null}
            onClick={() => handleSocialClick("linkedin")}
            className="w-full h-10 rounded-lg text-sm font-medium border-border bg-background hover:bg-muted/60 text-foreground transition-colors flex items-center justify-center gap-2.5 cursor-pointer shadow-none"
          >
            {activeProvider === "linkedin" ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <LinkedInIcon className="w-4 h-4 shrink-0" />
            )}
            <span>Continue with LinkedIn</span>
          </Button>

          {linkedinError && (
            <div
              role="alert"
              className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 dark:bg-amber-500/15 p-2.5 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="leading-snug">{linkedinError}</span>
              </div>
              <button
                type="button"
                onClick={() => setLinkedinError(null)}
                className="text-muted-foreground hover:text-foreground text-xs shrink-0 px-1 py-0.5 cursor-pointer"
                aria-label="Dismiss LinkedIn error"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subtle divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2.5 text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>
    </div>
  );
}
