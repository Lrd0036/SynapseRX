import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface ModuleResponse {
  id: string;
  user_id: string;
  module_id: string;
  question: string;
  response: string;
  submitted_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  training_modules: {
    title: string;
  };
}

export const ResponsesView = () => {
  const [responses, setResponses] = useState<ModuleResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResponses = async () => {
      const { data, error } = await supabase
        .from("module_responses")
        .select(`
          *,
          profiles:user_id (full_name, email),
          training_modules:module_id (title)
        `)
        .order("submitted_at", { ascending: false });

      if (!error && data) {
        setResponses(data as any);
      }
      setLoading(false);
    };

    fetchResponses();
  }, []);

  if (loading) {
    return <div className="p-6">Loading responses...</div>;
  }

  if (responses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Technician Responses</CardTitle>
          <CardDescription>
            No open-ended responses have been submitted yet
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Group responses by module and user
  const groupedResponses = responses.reduce((acc, response) => {
    const key = `${response.module_id}-${response.user_id}`;
    if (!acc[key]) {
      acc[key] = {
        module: response.training_modules.title,
        user: response.profiles.full_name,
        email: response.profiles.email,
        submitted_at: response.submitted_at,
        responses: [],
      };
    }
    acc[key].responses.push({
      question: response.question,
      response: response.response,
    });
    return acc;
  }, {} as Record<string, any>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technician Responses</CardTitle>
        <CardDescription>
          Open-ended responses from training modules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {Object.values(groupedResponses).map((group: any, idx: number) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{group.user}</h3>
                    <p className="text-sm text-muted-foreground">{group.email}</p>
                    <Badge variant="outline" className="mt-1">
                      {group.module}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(group.submitted_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-4 pl-4 border-l-2 border-border">
                  {group.responses.map((item: any, qIdx: number) => (
                    <div key={qIdx} className="space-y-2">
                      <p className="font-medium text-sm">{item.question}</p>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {item.response}
                      </p>
                    </div>
                  ))}
                </div>

                {idx < Object.values(groupedResponses).length - 1 && (
                  <Separator className="my-6" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
