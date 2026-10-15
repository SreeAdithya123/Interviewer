import React, { useState } from 'react';
import Layout from '../components/Layout';
import MaterialCard from '../components/MaterialCard';
import UploadModal from '../components/UploadModal';
import OutputDisplay from '../components/OutputDisplay';
import {
  FileText,
  BookOpen,
  CreditCard,
  HelpCircle,
  Plus,
  Settings
} from 'lucide-react';
import PageHeader from '@/components/app/PageHeader';
import { IconTile } from '@/components/app/primitives';
import Reveal from '@/components/marketing/Reveal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MaterialGenerator = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [recentSessions, setRecentSessions] = useState<Array<{
    id: string;
    fileName: string;
    type: string;
    date: string;
    status: string;
    content?: string;
  }>>([]);
  const [currentOutput, setCurrentOutput] = useState<{
    fileName: string;
    type: string;
    content: string;
  } | null>(null);


  const materialTypes = [
    {
      id: 'pdf-summary',
      title: 'PDF to Summary',
      description: 'Upload a PDF to generate structured summaries',
      icon: FileText,
      buttonText: 'Start Generation'
    },
    {
      id: 'notes-generator',
      title: 'Notes Generator',
      description: 'Create student-friendly bullet notes from Word/Text files',
      icon: BookOpen,
      buttonText: 'Start Notes'
    },
    {
      id: 'flashcards-maker',
      title: 'Flashcards Maker',
      description: 'Convert material into spaced-repetition Q&A flashcards',
      icon: CreditCard,
      buttonText: 'Make Flashcards'
    },
    {
      id: 'qa-extractor',
      title: 'Q&A Extractor',
      description: 'Extract MCQs and Q&A from study material automatically',
      icon: HelpCircle,
      buttonText: 'Generate Q&A'
    }
  ];

  const handleCardClick = (materialType: string) => {
    setSelectedMaterial(materialType);
    setIsModalOpen(true);
  };

  const handleGenerateComplete = (fileName: string, type: string, content: string) => {
    const newSession = {
      id: Date.now().toString(),
      fileName,
      type,
      date: new Date().toLocaleDateString(),
      status: 'Completed',
      content
    };
    setRecentSessions(prev => [newSession, ...prev]);
    setCurrentOutput({ fileName, type, content });
    setIsModalOpen(false);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <PageHeader
          eyebrow="Study material"
          title={<>Material <span className="text-spectrum">generator</span></>}
          actions={
            <>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus strokeWidth={1.5} />
                New material
              </Button>
              <Button variant="ghost" size="icon" aria-label="Settings">
                <Settings strokeWidth={1.5} />
              </Button>
            </>
          }
        />

        {/* Material Type Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {materialTypes.map((material, i) => (
            <Reveal key={material.id} index={i} step={0.06}>
              <MaterialCard
                material={material}
                index={i}
                onClick={() => handleCardClick(material.id)}
              />
            </Reveal>
          ))}
        </div>

        {/* Output Display Section */}
        {currentOutput && (
          <div className="mt-8">
            <OutputDisplay
              fileName={currentOutput.fileName}
              type={currentOutput.type}
              content={currentOutput.content}
              onClose={() => setCurrentOutput(null)}
            />
          </div>
        )}

        {/* Recent Sessions Section */}
        <Card className="mt-8 rounded-2xl shadow-soft overflow-hidden">
          <div className="flex items-center justify-between border-b border-foreground/[0.06] px-6 py-4">
            <h2 className="font-headline text-lg font-semibold tracking-headline text-foreground">
              Recent Sessions
            </h2>
          </div>

          {recentSessions.length > 0 ? (
            <div className="divide-y divide-foreground/[0.06]">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/40"
                >
                  <div>
                    <h3 className="font-body font-medium text-foreground">{session.fileName}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {session.type} · <span className="font-metric">{session.date}</span>
                    </p>
                  </div>
                  <Badge variant="secondary">{session.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <IconTile icon={FileText} size="lg" />
              <h3 className="mt-5 font-headline text-lg font-semibold tracking-headline text-foreground">
                No materials generated yet
              </h3>
              <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
                Upload your first document to start generating study materials.
              </p>
              <Button className="mt-6" onClick={() => setIsModalOpen(true)}>
                Generate your first material
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedMaterial={selectedMaterial}
        onGenerateComplete={handleGenerateComplete}
      />
    </Layout>
  );
};

export default MaterialGenerator;
