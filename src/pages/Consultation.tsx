import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  message: string;
  is_ai_response: boolean;
  created_at: string;
}

const Consultation = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    
    const channel = supabase
      .channel("consultation_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "consultation_messages",
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("consultation_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from("consultation_messages")
      .insert({
        user_id: user.id,
        message: input,
        is_ai_response: false,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const userMessage = input;
    setInput("");

    // Call AI consultation edge function
    const { data, error: aiError } = await supabase.functions.invoke('Consultation-chat', {
      body: { message: userMessage }
    });

    if (aiError) {
      console.error('AI consultation error:', aiError);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-[calc(100vh-8rem)]">
      <Card className="shadow-elevated h-full flex flex-col">
        <CardHeader>
          <CardTitle>Consultation Chat</CardTitle>
          <CardDescription>
            Ask questions and get expert pharmacy guidance
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.is_ai_response ? "" : "flex-row-reverse"}`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.is_ai_response ? "bg-primary" : "bg-accent"
                    }`}
                  >
                    {msg.is_ai_response ? (
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-accent-foreground" />
                    )}
                  </div>
                  <div
                    className={`flex-1 max-w-[80%] rounded-lg p-3 ${
                      msg.is_ai_response
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type your question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                disabled={loading}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Consultation;
