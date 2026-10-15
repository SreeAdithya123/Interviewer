import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { toast } from '@/hooks/use-toast';
import PageHeader from '@/components/app/PageHeader';
import { StatusPill } from '@/components/app/primitives';
import Reveal from '@/components/marketing/Reveal';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
        toast({
          title: "Camera Started",
          description: "Your camera is now active",
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      toast({
        title: "Camera Stopped",
        description: "Your camera has been turned off",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            eyebrow="Account"
            title="Candidate profile"
            subtitle={user?.email}
            back={{ onClick: () => navigate(-1) }}
            actions={
              <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-ink-foreground">
                <User className="h-5 w-5" strokeWidth={1.5} />
              </span>
            }
          />

          {/* Profile Content */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Camera Section */}
            <Reveal index={0}>
              <Card className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Camera className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    <div>
                      <p className="font-metric text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
                        Device
                      </p>
                      <h2 className="font-headline text-lg font-semibold tracking-headline text-foreground">
                        Camera preview
                      </h2>
                    </div>
                  </div>
                  {isCameraActive && <StatusPill tone="live">Live</StatusPill>}
                </div>

                <div className="relative mt-6 rounded-2xl border border-foreground/[0.06] bg-muted overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />

                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                      <div className="text-center">
                        <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                        <p className="mb-4 font-body text-sm text-muted-foreground">Camera not active</p>
                        <Button onClick={startCamera}>Start camera</Button>
                      </div>
                    </div>
                  )}
                </div>

                {isCameraActive && (
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    Stop camera
                  </Button>
                )}
              </Card>
            </Reveal>

            {/* User Information */}
            <Reveal index={1}>
              <Card className="p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  <div>
                    <p className="font-metric text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
                      Identity
                    </p>
                    <h2 className="font-headline text-lg font-semibold tracking-headline text-foreground">
                      User information
                    </h2>
                  </div>
                </div>

                <dl className="mt-6 divide-y divide-foreground/[0.06]">
                  <div className="flex flex-col gap-1 py-4 first:pt-0">
                    <dt className="font-body text-sm text-muted-foreground">Email</dt>
                    <dd className="font-body text-foreground">{user?.email || 'Not available'}</dd>
                  </div>

                  <div className="flex flex-col gap-1 py-4">
                    <dt className="font-body text-sm text-muted-foreground">User ID</dt>
                    <dd className="font-mono text-xs text-foreground break-all">{user?.id || 'Not available'}</dd>
                  </div>

                  <div className="flex flex-col gap-1.5 py-4">
                    <dt className="font-body text-sm text-muted-foreground">Account status</dt>
                    <dd>
                      <StatusPill tone="active">Active</StatusPill>
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 border-t border-foreground/[0.06] pt-6">
                  <Button
                    onClick={() => navigate('/interview-copilot')}
                    className="w-full"
                  >
                    Start interview session
                  </Button>
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
