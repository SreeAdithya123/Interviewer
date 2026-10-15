import React, { useState, useEffect } from 'react';
import { Save, User, Mail, Calendar, Shield } from 'lucide-react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/app/PageHeader';
import Reveal from '@/components/marketing/Reveal';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || '');

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .eq('id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setCreatedAt(data.created_at);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Your profile has been updated.' });
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
          <PageHeader
            eyebrow="Account"
            title="Settings"
            subtitle="Manage your personal details"
            back={{ to: '/dashboard' }}
          />

          {loading ? (
            <>
              <Card className="p-6 sm:p-8 space-y-5">
                <Skeleton className="h-3 w-32" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <Skeleton className="h-10 w-full rounded-xl" />
              </Card>
              <Card className="p-6 sm:p-8 space-y-5">
                <Skeleton className="h-3 w-24" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              </Card>
            </>
          ) : (
            <>
              <Reveal index={0}>
                <Card className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    <h2 className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
                      Personal Information
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" strokeWidth={1.5} /> Email
                    </Label>
                    <Input id="email" value={email} disabled />
                    <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
                  </div>

                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Card>
              </Reveal>

              <Reveal index={1}>
                <Card className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    <h2 className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
                      Account Info
                    </h2>
                  </div>
                  <dl className="divide-y divide-foreground/[0.06]">
                    <div className="flex justify-between py-3">
                      <dt className="text-sm text-muted-foreground">User ID</dt>
                      <dd className="font-mono text-xs truncate max-w-[200px]">{user?.id}</dd>
                    </div>
                    <div className="flex justify-between py-3">
                      <dt className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} /> Member Since
                      </dt>
                      <dd className="font-metric text-sm">
                        {createdAt ? new Date(createdAt).toLocaleDateString() : '—'}
                      </dd>
                    </div>
                  </dl>
                </Card>
              </Reveal>
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default Settings;
