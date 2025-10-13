import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle, XCircle } from "lucide-react";

const BulkImport = () => {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResults(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim());
      
      const csvData = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        return obj;
      });

      const { data, error } = await supabase.functions.invoke("bulk-import-users", {
        body: { csvData },
      });

      if (error) throw error;

      setResults(data);
      toast({
        title: "Import completed",
        description: `Successfully imported ${data.success.length} users. ${data.errors.length} errors.`,
      });
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Bulk User Import</CardTitle>
          <CardDescription>
            Upload a CSV file with columns: FirstName, LastName, Email, Password, AccuracyRate, ProgressPercent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => document.getElementById("csv-upload")?.click()}
              disabled={importing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importing..." : "Upload CSV"}
            </Button>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {results && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  {results.success.length} users imported successfully
                </span>
              </div>

              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">{results.errors.length} errors</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {results.errors.map((err: any, idx: number) => (
                      <div key={idx} className="text-sm text-muted-foreground">
                        {err.email}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkImport;
