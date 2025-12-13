import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, CheckCircle, XCircle, Clock, MessageSquare, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import SmsConversationDialog from "./SmsConversationDialog";
import type { Json } from "@/integrations/supabase/types";

interface SmsRecord {
  id: string;
  customer_number: string;
  message_content: string;
  status: string;
  twilio_sid: string | null;
  created_at: string;
  error_message: string | null;
  call_id: string | null;
  order_details: Json | null;
  user_id: string | null;
}

interface Conversation {
  customer_number: string;
  messages: SmsRecord[];
  lastMessage: SmsRecord;
  messageCount: number;
}

const SmsConversationList = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    filterConversations();
  }, [conversations, searchQuery]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("sms_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by customer_number
      const grouped = (data || []).reduce((acc: Record<string, SmsRecord[]>, record) => {
        const key = record.customer_number;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(record);
        return acc;
      }, {});

      // Convert to conversation array
      const conversationList: Conversation[] = Object.entries(grouped).map(([phone, messages]) => ({
        customer_number: phone,
        messages: messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        lastMessage: messages[0], // Already sorted desc from query
        messageCount: messages.length,
      }));

      // Sort by most recent message
      conversationList.sort((a, b) => 
        new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      );

      setConversations(conversationList);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterConversations = () => {
    if (!searchQuery) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter(
      (c) =>
        c.customer_number.toLowerCase().includes(query) ||
        c.lastMessage.message_content.toLowerCase().includes(query)
    );
    setFilteredConversations(filtered);
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith("+1") && phone.length === 12) {
      return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  const truncateMessage = (message: string, maxLength = 60) => {
    if (message.length <= maxLength) return message;
    return message.slice(0, maxLength) + "...";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />;
      case "failed":
        return <XCircle className="w-3 h-3 text-destructive" />;
      case "pending":
        return <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "sent":
        return "Delivered";
      case "failed":
        return "Failed";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  const handleOpenConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className="border border-border/50">
        <CardContent className="p-6">
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-border/50">
        <CardContent className="p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone number or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Conversation List */}
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No conversations found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.customer_number}
                  onClick={() => handleOpenConversation(conversation)}
                  className="p-4 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">
                          {formatPhoneNumber(conversation.customer_number)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {conversation.messageCount} {conversation.messageCount === 1 ? "message" : "messages"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {truncateMessage(conversation.lastMessage.message_content)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
                      </span>
                      <div className="flex items-center gap-1 text-xs">
                        {getStatusIcon(conversation.lastMessage.status)}
                        <span className="text-muted-foreground">
                          {getStatusText(conversation.lastMessage.status)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SmsConversationDialog
        conversation={selectedConversation}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};

export default SmsConversationList;
