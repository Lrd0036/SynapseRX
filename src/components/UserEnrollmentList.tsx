// src/components/UserEnrollmentList.tsx

// Import necessary UI components and types
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { User } from "lucide-react";

// Define the specific types for props based on your Supabase schema
type Profile = Database['public']['Tables']['profiles']['Row'];
type UserMetric = Database['public']['Tables']['user_metrics']['Row'];

// Define the props the component will accept
interface UserEnrollmentListProps {
  users: Profile[];
  metrics: UserMetric[];
}

/**
 * A helper function to combine user profile data with their corresponding metrics.
 * This makes it easier to display all relevant information in a single row.
 */
const mergeUserData = (users: Profile[], metrics: UserMetric[]) => {
  const metricsMap = new Map(metrics.map(metric => [metric.user_id, metric]));
  return users.map(user => ({
    ...user,
    // Safely merge metrics, providing default values if none are found.
    ...(metricsMap.get(user.id) || { progress_percent: 0, accuracy_rate: 0 }),
  }));
};

// The main component for displaying the list of enrolled users.
export const UserEnrollmentList = ({ users, metrics }: UserEnrollmentListProps) => {
  // Combine the user and metric data before rendering.
  const enrolledUsers = mergeUserData(users, metrics);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Currently Enrolled Technicians
        </CardTitle>
      </CardHeader>
      <CardContent>
        {enrolledUsers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[200px]">Progress</TableHead>
                <TableHead className="text-right">Average Accuracy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolledUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={user.progress_percent || 0} className="w-[60%]" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {user.progress_percent || 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={user.accuracy_rate >= 80 ? 'default' : 'secondary'}>
                      {user.accuracy_rate || 0}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No technicians are currently enrolled.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
