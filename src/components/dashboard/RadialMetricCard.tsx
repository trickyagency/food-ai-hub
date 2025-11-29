import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { ArrowUp, ArrowDown, Sparkles } from "lucide-react";

interface RadialMetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  percentage: number;
  trend?: "up" | "down";
  color?: string;
}

const RadialMetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  percentage, 
  trend,
  color = "hsl(var(--primary))"
}: RadialMetricCardProps) => {
  // Create gradient ID unique to this card
  const gradientId = `gradient-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const glowId = `glow-${title.replace(/\s+/g, '-').toLowerCase()}`;
  
  const data = [
    {
      name: title,
      value: percentage,
      fill: `url(#${gradientId})`,
    }
  ];

  // Background ring data for layered effect
  const backgroundData = [
    { value: 100, fill: "hsl(var(--muted))" }
  ];

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-xl hover:shadow-2xl transition-all duration-700 hover:scale-[1.03] backdrop-blur-sm">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Radial glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
      
      <CardContent className="relative p-4 sm:p-6">
        {/* Header with floating icon */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 rounded-xl blur-md group-hover:blur-lg transition-all duration-500" />
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-500 border border-primary/20">
              <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary drop-shadow-lg group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-primary/40 group-hover:text-primary/70 transition-colors duration-500 animate-pulse" />
        </div>

        <p className="text-xs sm:text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {title}
        </p>
        
        {/* Enhanced Chart with Gradients */}
        <div className="relative mb-4">
          <svg width="0" height="0">
            <defs>
              {/* Gradient definition */}
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="50%" stopColor={color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={color} stopOpacity="0.7" />
              </linearGradient>
              
              {/* Glow filter */}
              <filter id={glowId}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>
          
          <ResponsiveContainer width="100%" height={140}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="100%"
              barSize={14}
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              {/* Background ring */}
              <RadialBar
                background={false}
                dataKey="value"
                data={backgroundData}
                fill="hsl(var(--muted))"
                opacity={0.2}
                cornerRadius={10}
                isAnimationActive={false}
              />
              
              {/* Main progress ring with gradient */}
              <RadialBar
                background={false}
                dataKey="value"
                cornerRadius={10}
                animationDuration={2000}
                animationBegin={200}
                className="drop-shadow-lg"
                style={{ filter: `url(#${glowId})` }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          
          {/* Center content with enhanced styling */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative">
              <p className="text-3xl sm:text-4xl font-black text-foreground animate-fade-in bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text">
                {value}
              </p>
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <div className="mt-2 px-3 py-1 rounded-full bg-muted/50 backdrop-blur-sm border border-border/30">
              <p className="text-xs font-bold text-muted-foreground">
                {percentage}%
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced change indicator */}
        {change && (
          <div className={`relative flex items-center justify-center gap-2 text-xs sm:text-sm font-bold px-4 py-2 rounded-xl overflow-hidden ${
            trend === "up" 
              ? "bg-gradient-to-r from-success/20 via-success/15 to-success/10 text-success border border-success/30" 
              : "bg-gradient-to-r from-destructive/20 via-destructive/15 to-destructive/10 text-destructive border border-destructive/30"
          } shadow-lg`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-1000" />
            {trend === "up" ? (
              <ArrowUp className="w-4 h-4 animate-bounce" />
            ) : (
              <ArrowDown className="w-4 h-4 animate-bounce" />
            )}
            <span className="relative z-10">{change}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RadialMetricCard;
