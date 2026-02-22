import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Shield, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ref, onValue, push, serverTimestamp } from "firebase/database";
import { database } from "../firebase-config";
import { getAuth } from "firebase/auth";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: "victim" | "police";
  timestamp: number;
}

interface ChatSystemProps {
  sessionId: string;
  userRole: "victim" | "police";
}

export default function ChatSystem({ sessionId, userRole }: ChatSystemProps) {
  const auth = getAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;

    const chatRef = ref(database, `chats/${sessionId}`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.entries(data)
          .map(([id, message]: [string, any]) => ({
            id,
            ...message
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(messagesList);
        setIsConnected(true);
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser || !sessionId) return;

    const message: Omit<Message, "id"> = {
      text: newMessage.trim(),
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || userRole,
      senderRole: userRole,
      timestamp: Date.now()
    };

    await push(ref(database, `chats/${sessionId}`), message);
    setNewMessage("");
  };

  const formatTime = (timestamp: number | any) => {
    const time = typeof timestamp === 'number' ? timestamp : Date.now();
    return new Date(time).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5" />
          Emergency Chat
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            {isConnected ? "Connected" : "Connecting..."}
          </Badge>
          <span className="text-xs">Real-time communication with emergency services</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start typing to communicate with emergency services</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderRole === userRole ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 ${
                    message.senderRole === userRole
                      ? "bg-blue-500 text-white"
                      : message.senderRole === "police"
                      ? "bg-green-100 text-gray-900 border border-green-200"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.senderRole === "police" ? (
                      <Shield className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    <span className="text-xs font-medium">
                      {message.senderName}
                    </span>
                    <span className="text-xs opacity-70">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm break-words">{message.text}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="border-t p-3">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              maxLength={500}
            />
            <Button type="submit" size="sm" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            {newMessage.length}/500 characters
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
