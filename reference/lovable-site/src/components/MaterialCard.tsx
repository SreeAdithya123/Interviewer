import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/app/primitives';

interface MaterialCardProps {
  material: {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    buttonText: string;
  };
  index: number;
  onClick: () => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({ material, onClick }) => {
  const { title, description, icon: Icon, buttonText } = material;

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer p-6 hover:-translate-y-1 hover:shadow-medium transition-[transform,box-shadow] duration-500 ease-out-quint"
    >
      <IconTile icon={Icon} tone="primary" />

      <h3 className="mt-4 font-headline text-lg font-semibold tracking-headline text-foreground">
        {title}
      </h3>

      <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
        {description}
      </p>

      <Button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="w-full mt-4"
      >
        {buttonText}
      </Button>
    </Card>
  );
};

export default MaterialCard;
