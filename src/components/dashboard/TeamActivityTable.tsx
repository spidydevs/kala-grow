import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { TeamMember } from '@/hooks/useProductivityAnalytics';
import { formatDistanceToNow } from 'date-fns';

interface TeamActivityTableProps {
  data: TeamMember[];
  loading?: boolean;
}

export const TeamActivityTable: React.FC<TeamActivityTableProps> = ({
  data,
  loading = false
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastActivity = (lastActivity?: string) => {
    if (!lastActivity) return 'No recent activity';
    try {
      return formatDistanceToNow(new Date(lastActivity), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const getActivityBadgeVariant = (tasksCompleted: number) => {
    if (tasksCompleted >= 10) return 'default';
    if (tasksCompleted >= 5) return 'secondary';
    if (tasksCompleted >= 1) return 'outline';
    return 'destructive';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No team activity data available for the selected date range.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead className="text-right">Tasks Completed</TableHead>
                <TableHead className="text-right">Points Earned</TableHead>
                <TableHead className="text-right">Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        {member.avatar_url && (
                          <AvatarImage 
                            src={member.avatar_url} 
                            alt={member.name}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">
                          {member.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getActivityBadgeVariant(member.tasksCompleted)}>
                      {member.tasksCompleted}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {member.totalPoints}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatLastActivity(member.lastActivity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};