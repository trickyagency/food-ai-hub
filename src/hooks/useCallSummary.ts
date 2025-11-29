import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CallSummary {
  id: string;
  call_id: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  outcome: string;
  created_at: string;
  updated_at: string;
}

export const useCallSummary = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<CallSummary | null>(null);

  const fetchSummary = async (callId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('call_summaries')
        .select('*')
        .eq('call_id', callId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No summary found
          setSummary(null);
          return null;
        }
        throw error;
      }

      setSummary(data);
      return data;
    } catch (error) {
      console.error('Error fetching summary:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (callId: string, transcript: string) => {
    try {
      setLoading(true);
      
      if (!transcript || transcript.trim().length === 0) {
        toast.error("No transcript available to generate summary");
        return null;
      }

      console.log('Generating summary for call:', callId);

      const { data, error } = await supabase.functions.invoke('generate-call-summary', {
        body: { callId, transcript }
      });

      if (error) {
        console.error('Function error:', error);
        
        if (error.message?.includes('429')) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (error.message?.includes('402')) {
          toast.error("Please add credits to your Lovable AI workspace.");
        } else {
          toast.error("Failed to generate summary");
        }
        throw error;
      }

      console.log('Summary generated:', data);
      setSummary(data);
      toast.success("Summary generated successfully!");
      return data;
    } catch (error) {
      console.error('Error generating summary:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    summary,
    loading,
    fetchSummary,
    generateSummary,
  };
};