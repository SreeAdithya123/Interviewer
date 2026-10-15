import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useResumeBuilder } from '@/hooks/useResumeBuilder';
import { ResumeBuilderLanding } from '@/components/resume-builder/ResumeBuilderLanding';
import { ResumeQuestionnaire } from '@/components/resume-builder/ResumeQuestionnaire';
import { ResumeGeneration } from '@/components/resume-builder/ResumeGeneration';
import { TemplateGallery } from '@/components/resume-builder/TemplateGallery';
import { TemplatePreview } from '@/components/resume-builder/TemplatePreview';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const ResumeBuilder = () => {
  const navigate = useNavigate();
  const {
    currentStep,
    formData,
    generatedResume,
    selectedTemplate,
    templateSettings,
    isGenerating,
    isSaving,
    error,
    updateFormData,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    setSelectedTemplate,
    setTemplateSettings,
    generateResume,
    saveResume,
  } = useResumeBuilder();

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    }
  }, [error]);

  const showHeader = currentStep !== 'landing' && currentStep !== 'generating' && currentStep !== 'preview';

  const renderContent = () => {
    switch (currentStep) {
      case 'landing':
        return <ResumeBuilderLanding onStart={() => goToStep('personal-info')} />;
      
      case 'personal-info':
      case 'career-summary':
      case 'education':
      case 'skills':
      case 'projects':
      case 'experience':
      case 'certifications':
      case 'achievements':
        return (
          <ResumeQuestionnaire
            currentStep={currentStep}
            formData={formData}
            onUpdateFormData={updateFormData}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            onGenerate={generateResume}
            isGenerating={isGenerating}
          />
        );
      
      case 'generating':
        return <ResumeGeneration />;
      
      case 'template-gallery':
        return (
          <TemplateGallery
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            onProceed={() => goToStep('preview')}
          />
        );
      
      case 'preview':
        if (!generatedResume) {
          goToStep('template-gallery');
          return null;
        }
        return (
          <TemplatePreview
            data={generatedResume}
            selectedTemplate={selectedTemplate}
            settings={templateSettings}
            onChangeTemplate={setSelectedTemplate}
            onChangeSettings={setTemplateSettings}
            onBack={() => goToStep('template-gallery')}
            onSave={saveResume}
            isSaving={isSaving}
          />
        );
      
      default:
        return <ResumeBuilderLanding onStart={() => goToStep('personal-info')} />;
    }
  };

  return (
    <ProtectedRoute>
      <Layout fullSize>
        {/* Header - show only during questionnaire and template gallery */}
        {showHeader && (
          <div className="bg-card border-b border-foreground/[0.06] px-6">
            <div className="max-w-7xl mx-auto flex h-14 items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                Dashboard
              </Button>

              <h1 className="font-headline text-sm font-semibold text-foreground">Resume builder</h1>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                aria-label="Dashboard"
                className="text-muted-foreground hover:text-foreground"
              >
                <Home className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default ResumeBuilder;
