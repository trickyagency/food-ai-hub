import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tag, Star, Save } from "lucide-react";

interface CallTagManagerProps {
  callId: string;
  onTagSaved?: () => void;
}

interface CallTag {
  id: string;
  category: string;
  notes: string | null;
  satisfaction_rating: number | null;
}

const CallTagManager = ({ callId, onTagSaved }: CallTagManagerProps) => {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [existingTag, setExistingTag] = useState<CallTag | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExistingTag();
  }, [callId]);

  const fetchExistingTag = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("call_tags")
      .select("*")
      .eq("call_id", callId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setExistingTag(data);
      setCategory(data.category);
      setNotes(data.notes || "");
      setRating(data.satisfaction_rating || 0);
    }
  };

  const handleSave = async () => {
    if (!user || !category) {
      toast.error("Please select a category");
      return;
    }

    setSaving(true);
    try {
      const tagData = {
        call_id: callId,
        user_id: user.id,
        category,
        notes: notes.trim() || null,
        satisfaction_rating: rating > 0 ? rating : null,
      };

      if (existingTag) {
        const { error } = await supabase
          .from("call_tags")
          .update(tagData)
          .eq("id", existingTag.id);

        if (error) throw error;
        toast.success("Tag updated successfully");
      } else {
        const { error } = await supabase.from("call_tags").insert(tagData);

        if (error) throw error;
        toast.success("Tag added successfully");
      }

      fetchExistingTag();
      onTagSaved?.();
    } catch (error) {
      console.error("Error saving tag:", error);
      toast.error("Failed to save tag");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      sales: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
      support: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
      "follow-up": "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700",
      general: "bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700",
    };
    return colors[cat] || colors.general;
  };

  return (
    <div className="space-y-6 border-t pt-6">
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Tag & Categorize Call</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="follow-up">Follow-up</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          {category && (
            <Badge className={getCategoryColor(category)}>{category}</Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label>Satisfaction Rating</Label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-all hover:scale-110"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <button
                type="button"
                onClick={() => setRating(0)}
                className="ml-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes (Optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this call..."
            rows={3}
            className="resize-none"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !category}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : existingTag ? "Update Tag" : "Save Tag"}
        </Button>
      </div>
    </div>
  );
};

export default CallTagManager;
