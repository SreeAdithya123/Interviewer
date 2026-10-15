 import React from 'react';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import type { PersonalInfo } from '@/types/resume';
 
 interface PersonalInfoStepProps {
   data: PersonalInfo;
   onChange: (data: PersonalInfo) => void;
 }
 
 export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({ data, onChange }) => {
   const handleChange = (field: keyof PersonalInfo, value: string) => {
     onChange({ ...data, [field]: value });
   };
 
   return (
     <div className="space-y-6">
       <div className="text-center mb-8">
         <h2 className="font-headline text-xl font-semibold text-foreground mb-2">Personal Information</h2>
         <p className="text-muted-foreground">Let's start with your basic details</p>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="space-y-2">
           <Label htmlFor="fullName" className="text-foreground">Full Name *</Label>
           <Input
             id="fullName"
             value={data.fullName}
             onChange={(e) => handleChange('fullName', e.target.value)}
             placeholder="John Doe"
           />
         </div>
 
         <div className="space-y-2">
           <Label htmlFor="email" className="text-foreground">Email Address *</Label>
           <Input
             id="email"
             type="email"
             value={data.email}
             onChange={(e) => handleChange('email', e.target.value)}
             placeholder="john@example.com"
           />
         </div>
 
         <div className="space-y-2">
           <Label htmlFor="phone" className="text-foreground">Phone Number *</Label>
           <Input
             id="phone"
             value={data.phone}
             onChange={(e) => handleChange('phone', e.target.value)}
             placeholder="+91 9876543210"
           />
         </div>
 
         <div className="space-y-2">
           <Label htmlFor="location" className="text-foreground">Location</Label>
           <Input
             id="location"
             value={data.location || ''}
             onChange={(e) => handleChange('location', e.target.value)}
             placeholder="Mumbai, India"
           />
         </div>
 
         <div className="space-y-2">
           <Label htmlFor="linkedin" className="text-foreground">LinkedIn Profile</Label>
           <Input
             id="linkedin"
             value={data.linkedin || ''}
             onChange={(e) => handleChange('linkedin', e.target.value)}
             placeholder="linkedin.com/in/johndoe"
           />
         </div>
 
         <div className="space-y-2">
           <Label htmlFor="portfolio" className="text-foreground">Portfolio / GitHub</Label>
           <Input
             id="portfolio"
             value={data.portfolio || ''}
             onChange={(e) => handleChange('portfolio', e.target.value)}
             placeholder="github.com/johndoe"
           />
         </div>
       </div>
     </div>
   );
 };
