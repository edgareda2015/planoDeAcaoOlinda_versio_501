import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User } from 'lucide-react';

interface PresenceState {
  [key: string]: {
    user: string;
    email: string;
    online_at: string;
  }[];
}

export const RealTimeUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState>({});

  useEffect(() => {
    const channel = supabase.channel('online-users');

    const handlePresenceUpdate = () => {
      const newState = channel.presenceState();
      setOnlineUsers(newState as PresenceState);
    };

    channel
      .on('presence', { event: 'sync' }, handlePresenceUpdate)
      .on('presence', { event: 'join' }, handlePresenceUpdate)
      .on('presence', { event: 'leave' }, handlePresenceUpdate)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const users = Object.entries(onlineUsers).map(([id, presences]) => ({
    id,
    ...(presences[0] || {}),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários Online</CardTitle>
        <CardDescription>
          Lista de usuários atualmente ativos no sistema. A lista é atualizada em tempo real.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Último Acesso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Nenhum usuário online no momento.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="relative">
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        <Badge className="absolute bottom-0 right-0 h-3 w-3 p-0 border-2 border-background bg-green-500" />
                      </Avatar>
                      <div>
                        <span className="font-medium">{user.user || 'Usuário desconhecido'}</span>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.online_at ? formatDistanceToNow(new Date(user.online_at), { addSuffix: true, locale: ptBR }) : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};