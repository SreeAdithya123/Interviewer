import React from 'react';
import { Mail, Linkedin, Twitter, Target, Lightbulb, Handshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/app/PageHeader';
import { IconTile } from '@/components/app/primitives';
import Reveal from '@/components/marketing/Reveal';
import ceoImage from '@/assets/team-ceo.png';
import cmoImage from '@/assets/team-cmo.png';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
  imageClassName?: string;
  social?: {
    email?: string;
    linkedin?: string;
    twitter?: string;
  };
}

const teamMembers: TeamMember[] = [
  {
    name: "K. Sree Adithya",
    role: "CEO & Founder",
    bio: "Passionate about democratizing interview preparation through AI technology.",
    image: ceoImage,
    social: {
      email: "adithya@aiinterviewer.com",
      linkedin: "#",
      twitter: "#"
    }
  },
  {
    name: "G. Yohan Raju",
    role: "CMO",
    bio: "Strategic marketing leader driving brand growth and user engagement.",
    image: cmoImage,
    imageClassName: "scale-[1.8] translate-y-[20%]",
    social: {
      email: "yohan@aiinterviewer.com",
      linkedin: "#",
      twitter: "#"
    }
  },
  {
    name: "Michael Park",
    role: "Head of Product",
    bio: "Former recruiter turned product leader, focused on user-centric design.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
    social: {
      email: "michael@aiinterviewer.com",
      linkedin: "#"
    }
  },
  {
    name: "Emily Rodriguez",
    role: "Lead AI Engineer",
    bio: "Specializes in NLP and conversational AI for realistic interview simulations.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
    social: {
      email: "emily@aiinterviewer.com",
      linkedin: "#"
    }
  }
];

const Teams = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <PageHeader
          eyebrow="The team"
          title="Our team"
          subtitle="Meet the people behind Vyoman"
          back={{ onClick: () => navigate(-1) }}
        />

        {/* Intro */}
        <Reveal className="mt-12 max-w-2xl">
          <h2 className="font-headline text-h2 font-semibold tracking-headline text-foreground">
            Building the Future of Interview Preparation
          </h2>
          <p className="mt-4 font-body text-body-lg leading-body text-muted-foreground">
            We're a passionate team of engineers, designers, and industry experts committed to
            helping candidates succeed in their career journeys through cutting-edge AI technology.
          </p>
        </Reveal>

        {/* Team Grid */}
        <Reveal className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teamMembers.map((member) => (
            <Card
              key={member.name}
              className="group h-full p-6 hover:-translate-y-1 transition-transform duration-500 ease-out-quint"
            >
              <div className="relative mb-4 h-28 w-28 overflow-hidden rounded-full ring-1 ring-foreground/10 transition-shadow duration-300 group-hover:ring-primary/30">
                <img
                  src={member.image}
                  alt={member.name}
                  className={`h-full w-full object-cover object-top ${member.imageClassName || ''}`}
                />
              </div>
              <h3 className="font-headline text-base font-semibold text-foreground">{member.name}</h3>
              <p className="mt-1 font-metric text-[11px] uppercase tracking-label text-primary">{member.role}</p>
              <p className="mt-3 font-body text-sm leading-body text-muted-foreground">{member.bio}</p>

              {member.social && (
                <div className="mt-4 flex items-center gap-2">
                  {member.social.email && (
                    <a
                      href={`mailto:${member.social.email}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-foreground/10 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Mail className="h-4 w-4" strokeWidth={1.5} />
                    </a>
                  )}
                  {member.social.linkedin && (
                    <a
                      href={member.social.linkedin}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-foreground/10 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Linkedin className="h-4 w-4" strokeWidth={1.5} />
                    </a>
                  )}
                  {member.social.twitter && (
                    <a
                      href={member.social.twitter}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-foreground/10 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Twitter className="h-4 w-4" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              )}
            </Card>
          ))}
        </Reveal>

        {/* Values Section */}
        <Reveal className="mt-20">
          <p className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">What we value</p>
          <h3 className="mt-2 font-headline text-h3 font-semibold text-foreground">Our Values</h3>
          <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-foreground/[0.06] bg-foreground/[0.06] sm:grid-cols-3">
            <div className="bg-card p-6">
              <IconTile icon={Target} />
              <h4 className="mt-4 font-headline text-base font-semibold text-foreground">User-Centric</h4>
              <p className="mt-2 font-body text-sm leading-body text-muted-foreground">Every feature we build starts with understanding our users' needs</p>
            </div>
            <div className="bg-card p-6">
              <IconTile icon={Lightbulb} />
              <h4 className="mt-4 font-headline text-base font-semibold text-foreground">Innovation</h4>
              <p className="mt-2 font-body text-sm leading-body text-muted-foreground">We push the boundaries of AI to create better interview experiences</p>
            </div>
            <div className="bg-card p-6">
              <IconTile icon={Handshake} />
              <h4 className="mt-4 font-headline text-base font-semibold text-foreground">Accessibility</h4>
              <p className="mt-2 font-body text-sm leading-body text-muted-foreground">Making professional interview prep available to everyone</p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default Teams;
