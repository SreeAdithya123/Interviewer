import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Shield, Users, Crown, Star, Zap, Search, RefreshCw, ShieldCheck, UserCog, type LucideIcon } from 'lucide-react';
import { SubscriptionPlan } from '@/hooks/useSubscription';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database } from '@/integrations/supabase/types';
import PageHeader from '@/components/app/PageHeader';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

type AppRole = Database['public']['Enums']['app_role'];

interface UserData {
  user_id: string;
  email: string;
  full_name: string;
  plan: string;
  credits_remaining: number;
  credits_per_month: number;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}


const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading: usersLoading, error: usersError, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      console.log('Fetching admin users, isAdmin:', isAdmin);
      const { data, error } = await supabase.rpc('admin_get_all_users');
      if (error) {
        console.error('Error fetching admin users:', error);
        throw error;
      }
      console.log('Admin users fetched successfully:', data?.length, 'users');
      return data as UserData[];
    },
    enabled: isAdmin === true,
    retry: 1,
  });

  const { data: userRoles, isLoading: rolesLoading, refetch: refetchRoles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching user roles:', error);
        throw error;
      }
      return data as UserRole[];
    },
    enabled: isAdmin === true,
  });


  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('Role added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add role');
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('Role removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove role');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, newPlan }: { userId: string; newPlan: SubscriptionPlan }) => {
      const { data, error } = await supabase.rpc('admin_update_subscription', {
        p_target_user_id: userId,
        p_new_plan: newPlan,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Subscription updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update subscription');
    },
  });


  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        p_target_user_id: userId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suspended-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('User permanently deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });

  const handlePlanChange = (userId: string, newPlan: SubscriptionPlan) => {
    updatePlanMutation.mutate({ userId, newPlan });
  };

  const handleAddRole = (userId: string, role: AppRole) => {
    addRoleMutation.mutate({ userId, role });
  };

  const handleRemoveRole = (userId: string, role: AppRole) => {
    removeRoleMutation.mutate({ userId, role });
  };


  const getUserRoles = (userId: string): AppRole[] => {
    return userRoles?.filter(r => r.user_id === userId).map(r => r.role) || [];
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro':
        return <Crown className="h-4 w-4 text-primary" strokeWidth={1.5} />;
      case 'plus':
        return <Star className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />;
      case 'free':
        return <Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />;
      default:
        return <Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />;
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'default';
      case 'plus':
        return 'secondary';
      case 'free':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const filteredUsers = users?.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const kpis: { label: string; value: number; icon: LucideIcon; tone?: 'ink'; accent?: boolean }[] = [
    { label: 'Total Users', value: users?.length ?? 0, icon: Users, tone: 'ink' },
    {
      label: 'Beginner Users',
      value: users?.filter(u => u.plan === 'beginner' || !u.plan).length ?? 0,
      icon: Zap,
    },
    { label: 'Free Users', value: users?.filter(u => u.plan === 'free').length ?? 0, icon: Zap },
    { label: 'Plus Users', value: users?.filter(u => u.plan === 'plus').length ?? 0, icon: Star },
    { label: 'Pro Users', value: users?.filter(u => u.plan === 'pro').length ?? 0, icon: Crown, accent: true },
  ];

  if (isAdminLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-background">
            <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="mt-8 h-96 w-full rounded-2xl" />
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-background">
            <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
              <Card className="border-foreground/[0.06] bg-destructive/[0.03]">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Shield className="h-12 w-12 text-destructive" strokeWidth={1.5} />
                  <h2 className="mt-4 font-headline text-xl font-semibold text-foreground">Access Denied</h2>
                  <p className="mt-2 font-body text-sm text-muted-foreground">
                    You don't have permission to access the admin dashboard.
                  </p>
                  <Button className="mt-6" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <PageHeader
                eyebrow="Admin"
                title="Admin dashboard"
                subtitle="Manage users, plans and roles"
                divider={false}
                actions={
                  <Button variant="outline" onClick={() => { refetch(); refetchRoles(); }}>
                    <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                    Refresh
                  </Button>
                }
              />
              <div className="mt-8 h-px bg-foreground/[0.07]" />
            </motion.div>

            {/* KPI cards */}
            <motion.div
              initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
              className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              {kpis.map((kpi, index) => {
                const Icon = kpi.icon;
                const isInk = kpi.tone === 'ink';
                return (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: EASE, delay: index * 0.05 }}
                  >
                    <Card
                      className={cn(
                        'h-full p-5',
                        isInk && 'border-transparent bg-ink text-ink-foreground',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            'font-metric text-[11px] uppercase tracking-label',
                            isInk ? 'text-ink-muted' : 'text-muted-foreground',
                          )}
                        >
                          {kpi.label}
                        </span>
                        <span
                          className={cn(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
                            isInk
                              ? 'border-ink-foreground/15 text-ink-muted'
                              : kpi.accent
                                ? 'border-foreground/[0.08] text-primary'
                                : 'border-foreground/[0.08] text-muted-foreground',
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.5} />
                        </span>
                      </div>
                      <div
                        className={cn(
                          'mt-4 font-metric font-semibold',
                          isInk ? 'text-4xl' : 'text-2xl',
                        )}
                      >
                        {kpi.value}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Tabs for Subscriptions and Roles */}
            <Tabs defaultValue="subscriptions" className="mt-10 space-y-4">
              <TabsList>
                <TabsTrigger value="subscriptions">
                  <Crown strokeWidth={1.5} />
                  Subscriptions
                </TabsTrigger>
                <TabsTrigger value="roles">
                  <ShieldCheck strokeWidth={1.5} />
                  User Roles
                </TabsTrigger>
              </TabsList>

              {/* Subscriptions Tab */}
              <TabsContent value="subscriptions">
                <motion.div
                  initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="font-headline text-lg font-semibold">
                          Subscription Management
                        </CardTitle>
                        <div className="relative w-full sm:w-64">
                          <Search
                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            strokeWidth={1.5}
                          />
                          <Input
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {usersLoading ? (
                        <div className="space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Credits</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Change Plan</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredUsers?.map((user) => {
                                const roles = getUserRoles(user.user_id);
                                return (
                                  <TableRow key={user.user_id}>
                                    <TableCell>
                                      <p className="font-body text-sm font-medium text-foreground">
                                        {user.full_name || 'No name'}
                                      </p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        {roles.length > 0 ? roles.map(role => (
                                          <Badge
                                            key={role}
                                            variant={role === 'admin' ? 'default' : role === 'moderator' ? 'secondary' : 'outline'}
                                            className="capitalize"
                                          >
                                            {role === 'admin' && <Shield className="mr-1 h-3 w-3" strokeWidth={1.5} />}
                                            {role === 'moderator' && <ShieldCheck className="mr-1 h-3 w-3" strokeWidth={1.5} />}
                                            {role}
                                          </Badge>
                                        )) : (
                                          <span className="font-body text-sm text-muted-foreground">User</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {getPlanIcon(user.plan || 'beginner')}
                                        <Badge variant={getPlanBadgeVariant(user.plan || 'beginner')} className="capitalize">
                                          {user.plan || 'beginner'}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <span className="font-metric text-sm text-foreground">
                                        {user.credits_remaining ?? 0} / {user.credits_per_month ?? 0}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="font-metric text-sm text-muted-foreground">
                                        {user.created_at
                                          ? new Date(user.created_at).toLocaleDateString()
                                          : 'N/A'}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={user.plan || 'beginner'}
                                        onValueChange={(value) => handlePlanChange(user.user_id, value as SubscriptionPlan)}
                                        disabled={updatePlanMutation.isPending}
                                      >
                                        <SelectTrigger className="w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="beginner">Beginner</SelectItem>
                                          <SelectItem value="free">Free</SelectItem>
                                          <SelectItem value="plus">Plus</SelectItem>
                                          <SelectItem value="pro">Pro</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {usersError && (
                        <div className="py-8 text-center font-body text-sm text-destructive">
                          Error loading users: {(usersError as Error).message}
                        </div>
                      )}
                      {!usersError && filteredUsers?.length === 0 && !usersLoading && (
                        <div className="py-8 text-center font-body text-sm text-muted-foreground">
                          {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Roles Tab */}
              <TabsContent value="roles">
                <motion.div
                  initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="flex items-center gap-2 font-headline text-lg font-semibold">
                          <UserCog className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                          Role Management
                        </CardTitle>
                        <div className="relative w-full sm:w-64">
                          <Search
                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            strokeWidth={1.5}
                          />
                          <Input
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {usersLoading || rolesLoading ? (
                        <div className="space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Current Roles</TableHead>
                                <TableHead>Admin</TableHead>
                                <TableHead>Moderator</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredUsers?.map((user) => {
                                const roles = getUserRoles(user.user_id);
                                const isUserAdmin = roles.includes('admin');
                                const isUserModerator = roles.includes('moderator');

                                return (
                                  <TableRow key={user.user_id}>
                                    <TableCell>
                                      <p className="font-body text-sm font-medium text-foreground">
                                        {user.full_name || 'No name'}
                                      </p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        {roles.length > 0 ? roles.map(role => (
                                          <Badge
                                            key={role}
                                            variant={role === 'admin' ? 'default' : role === 'moderator' ? 'secondary' : 'outline'}
                                            className="capitalize"
                                          >
                                            {role === 'admin' && <Shield className="mr-1 h-3 w-3" strokeWidth={1.5} />}
                                            {role === 'moderator' && <ShieldCheck className="mr-1 h-3 w-3" strokeWidth={1.5} />}
                                            {role}
                                          </Badge>
                                        )) : (
                                          <Badge variant="outline">User</Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {isUserAdmin ? (
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleRemoveRole(user.user_id, 'admin')}
                                          disabled={removeRoleMutation.isPending}
                                        >
                                          Remove Admin
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddRole(user.user_id, 'admin')}
                                          disabled={addRoleMutation.isPending}
                                        >
                                          <Shield className="mr-1 h-3 w-3" strokeWidth={1.5} />
                                          Make Admin
                                        </Button>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {isUserModerator ? (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => handleRemoveRole(user.user_id, 'moderator')}
                                          disabled={removeRoleMutation.isPending}
                                        >
                                          Remove Mod
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddRole(user.user_id, 'moderator')}
                                          disabled={addRoleMutation.isPending}
                                        >
                                          <ShieldCheck className="mr-1 h-3 w-3" strokeWidth={1.5} />
                                          Make Mod
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {filteredUsers?.length === 0 && !usersLoading && (
                        <div className="py-8 text-center font-body text-sm text-muted-foreground">
                          No users found matching your search.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
