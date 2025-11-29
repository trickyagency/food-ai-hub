import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-full justify-start gap-3 px-3 py-2.5 h-auto hover:bg-sidebar-accent transition-all duration-200"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-[18px] h-[18px]" />
          <span className="text-sm">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-[18px] h-[18px]" />
          <span className="text-sm">Dark Mode</span>
        </>
      )}
    </Button>
  );
};
