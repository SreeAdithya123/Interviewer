import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dropzone } from '@/components/app/primitives';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterial: string;
  onGenerateComplete: (fileName: string, type: string, content: string) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  selectedMaterial,
  onGenerateComplete
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [outputType, setOutputType] = useState('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const outputTypes = [
    { value: 'summary', label: 'Summary' },
    { value: 'notes', label: 'Bullet Notes' },
    { value: 'flashcards', label: 'Flashcards' },
    { value: 'qa', label: 'Q&A Format' }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setIsGenerating(true);
    setGenerationProgress('Reading file...');

    try {
      const fileBase64 = await fileToBase64(selectedFile);

      setGenerationProgress('Generating content with AI...');

      const { data, error } = await supabase.functions.invoke('material-generator', {
        body: {
          fileBase64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          type: outputType
        }
      });

      if (error) throw error;

      const outputLabel = outputTypes.find(t => t.value === outputType)?.label || 'Summary';

      onGenerateComplete(selectedFile.name, outputLabel, data.content);

      toast({
        title: "Generation Complete",
        description: `Successfully generated ${outputLabel.toLowerCase()} from ${selectedFile.name}`,
      });

      setSelectedFile(null);
      setOutputType('summary');
      setGenerationProgress('');
    } catch (error) {
      console.error('Error generating material:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate material. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setOutputType('summary');
    setIsGenerating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg bg-card rounded-2xl border border-foreground/[0.06] p-6 shadow-ambient-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-xl font-semibold tracking-tight text-foreground">Upload Material</h2>
            <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close">
              <X className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            </Button>
          </div>

          {/* File Upload Area */}
          <Dropzone
            dragActive={dragActive}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" strokeWidth={1.5} />
                <div className="text-left">
                  <p className="font-medium text-foreground">{selectedFile.name}</p>
                  <p className="font-metric text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground">Drop your file here</p>
                <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
                <Button onClick={() => fileInputRef.current?.click()} className="mt-4">
                  Choose File
                </Button>
              </>
            )}
          </Dropzone>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
          />

          {/* Output Type Selector */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Output Type
            </label>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex h-11 w-full items-center justify-between rounded-xl border border-foreground/12 bg-card px-4 py-2 text-sm transition-[border-color,box-shadow] duration-300 ease-out-quint focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/15"
              >
                <span>{outputTypes.find(t => t.value === outputType)?.label}</span>
                <ChevronDown className="h-4 w-4 opacity-50" strokeWidth={1.75} />
              </button>

              {showDropdown && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-foreground/[0.08] bg-popover p-1 text-popover-foreground shadow-medium">
                  {outputTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setOutputType(type.value);
                        setShowDropdown(false);
                      }}
                      className={`flex w-full items-center rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                        type.value === outputType ? 'bg-muted font-medium text-foreground' : 'text-foreground'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <div>
                  <p className="text-sm font-medium text-foreground">Generating Material</p>
                  <p className="text-xs text-muted-foreground">{generationProgress}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isGenerating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!selectedFile || isGenerating}
              className="flex-1"
            >
              {isGenerating ? 'Generating...' : 'Generate Material'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UploadModal;
