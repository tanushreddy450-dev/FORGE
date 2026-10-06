import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof NextThemesProvider>;

/**
 * App theme provider.
 * Light-first by default for a warm, clean, student-focused educational product;
 * dark mode is an optional neutral charcoal theme.
 */
export function ThemeProvider({ children, ...props }: Props) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="forge-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
