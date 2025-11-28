import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SearchResult {
  id: number;
  content: string;
  metadata: any;
  similarity?: number;
}

const VectorSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vector-search", {
        body: {
          query: query.trim(),
          limit: 5,
        },
      });

      if (error) throw error;

      if (data.warning) {
        toast.warning(data.warning);
      }

      setResults(data.results || []);
      
      if (data.results?.length === 0) {
        toast.info("No results found for your query");
      } else {
        toast.success(`Found ${data.results?.length || 0} results`);
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Failed to search database");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Vector Search
        </CardTitle>
        <CardDescription>
          Search through uploaded database files using AI-powered semantic search
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter your search query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3 mt-6">
            <h3 className="text-sm font-medium text-foreground">
              Search Results ({results.length})
            </h3>
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs text-muted-foreground">
                      ID: {result.id}
                    </p>
                    {result.similarity !== undefined && (
                      <span className="text-xs font-medium text-primary">
                        {(result.similarity * 100).toFixed(1)}% match
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {result.content}
                  </p>
                  {result.metadata && Object.keys(result.metadata).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Metadata: {JSON.stringify(result.metadata, null, 2)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VectorSearch;
