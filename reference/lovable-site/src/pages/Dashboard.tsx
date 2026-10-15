import React from 'react';
import Layout from '../components/Layout';
import ProgressTracking from '../components/ProgressTracking';
import RecentInterviewAnalyses from '../components/RecentInterviewAnalyses';
import InterviewResultsNotification from '../components/InterviewResultsNotification';
import InterviewHistoryTable from '../components/InterviewHistoryTable';
import ProtectedRoute from '../components/ProtectedRoute';
import AnalysisFeedbackButton from '../components/AnalysisFeedbackButton';
import ElevenLabsAnalyticsDashboard from '../components/dashboard/ElevenLabsAnalyticsDashboard';
import AptitudePerformanceCard from '../components/dashboard/AptitudePerformanceCard';
import SubscriptionCard from '../components/SubscriptionCard';
import { Download, Play, BarChart3, History, MessageSquare, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserStats } from '@/hooks/useUserStats';
import { useElevenLabsAnalytics } from '@/hooks/useElevenLabsAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Reveal from '@/components/marketing/Reveal';
import { IconTile } from '@/components/app/primitives';

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const { totalSessions, totalHours, completedInterviews, averageScore, analyses, interviewSessions } = useUserStats();
  const { data: analyticsData, isLoading: analyticsLoading } = useElevenLabsAnalytics();
  const isNewUser = totalSessions === 0;

  const generatePDFReport = () => {
    if (isNewUser) {
      toast.error('Complete your first interview to generate a report');
      return;
    }

    toast.info('Generating comprehensive report...');
    
    const doc = new jsPDF();
    let yPos = 20;
    
    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Vyoman', 20, 20);
    doc.setFontSize(16);
    doc.text('Comprehensive Performance Analysis Report', 20, 32);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPos = 55;
    
    // Report metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, yPos);
    doc.text(`Total Sessions Analyzed: ${totalSessions}`, 20, yPos + 5);
    yPos += 18;
    
    // Executive Summary
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('Executive Summary', 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Interview Sessions', totalSessions.toString()],
      ['Hours Practiced', `${totalHours} hrs`],
      ['Completed Interviews', completedInterviews.toString()],
      ['Average Overall Score', `${averageScore}%`],
      ['Total Analyses', analyses.length.toString()]
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 11, fontStyle: 'bold' },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Skills Performance Breakdown
    if (analyticsData && analyticsData.skillsPerformance.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Skills Performance Analysis', 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;
      
      const skillsData = [
        ['Skill', 'Average Score', 'Latest Score', 'Trend'],
        ...analyticsData.skillsPerformance.map(skill => [
          skill.skill,
          `${Math.round(skill.average)}%`,
          `${Math.round(skill.latest)}%`,
          skill.latest >= skill.average ? '↑ Improving' : '↓ Needs Focus'
        ])
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [skillsData[0]],
        body: skillsData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], fontSize: 11 },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Score Progression
    if (analyticsData && analyticsData.scoreProgression.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Score Progression History', 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;
      
      const progressionData = [
        ['Date', 'Interview Type', 'Score'],
        ...analyticsData.scoreProgression.slice(-10).map(entry => [
          new Date(entry.date).toLocaleDateString(),
          entry.interview,
          `${entry.score}%`
        ])
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [progressionData[0]],
        body: progressionData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], fontSize: 11 },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Strengths Analysis
    if (analyticsData && analyticsData.strengthsWeaknesses.strengths.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('Top Strengths', 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;
      
      const strengthsData = [
        ['Strength', 'Frequency'],
        ...analyticsData.strengthsWeaknesses.strengths.slice(0, 5).map(s => [
          s.text,
          s.count.toString()
        ])
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [strengthsData[0]],
        body: strengthsData.slice(1),
        theme: 'plain',
        headStyles: { fillColor: [34, 197, 94], fontSize: 11, textColor: [255, 255, 255] },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Areas for Improvement
    if (analyticsData && analyticsData.strengthsWeaknesses.weaknesses.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text('Areas for Improvement', 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;
      
      const weaknessesData = [
        ['Area', 'Frequency'],
        ...analyticsData.strengthsWeaknesses.weaknesses.slice(0, 5).map(w => [
          w.text,
          w.count.toString()
        ])
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [weaknessesData[0]],
        body: weaknessesData.slice(1),
        theme: 'plain',
        headStyles: { fillColor: [239, 68, 68], fontSize: 11, textColor: [255, 255, 255] },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Interview Type Distribution
    if (analyticsData && analyticsData.interviewCategories.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Interview Type Distribution', 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;
      
      const categoryData = [
        ['Interview Type', 'Count', 'Percentage'],
        ...analyticsData.interviewCategories.map(cat => [
          cat.category,
          cat.value.toString(),
          `${Math.round((cat.value / totalSessions) * 100)}%`
        ])
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [categoryData[0]],
        body: categoryData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], fontSize: 11 },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Recommendations
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('Personalized Recommendations', 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 12;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const recommendations = [];
    if (averageScore < 70) {
      recommendations.push('• Focus on consistent practice - aim for 3-4 sessions per week');
      recommendations.push('• Review feedback from previous interviews carefully');
    } else if (averageScore < 85) {
      recommendations.push('• You\'re doing well! Focus on refining specific weak areas');
      recommendations.push('• Try more challenging interview types');
    } else {
      recommendations.push('• Excellent performance! Maintain your practice routine');
      recommendations.push('• Consider mentoring others or exploring advanced topics');
    }
    
    if (analyticsData?.skillsPerformance) {
      const lowestSkill = analyticsData.skillsPerformance.reduce((min, skill) => 
        skill.latest < min.latest ? skill : min
      );
      recommendations.push(`• Priority: Improve your ${lowestSkill.skill} skills (currently ${Math.round(lowestSkill.latest)}%)`);
    }
    
    recommendations.forEach(rec => {
      doc.text(rec, 20, yPos);
      yPos += 8;
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${pageCount} | Vyoman Dashboard | Confidential`,
        105,
        285,
        { align: 'center' }
      );
    }
    
    doc.save(`ai-interviewer-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report downloaded successfully!');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-background">
          {/* Interview Results Notification */}
          <InterviewResultsNotification />

          {/* Sticky header */}
          <div className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-foreground/[0.06]">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <IconTile icon={BarChart3} tone="ink" />
                <div>
                  <h1 className="font-headline text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    Dashboard
                  </h1>
                  <p className="hidden font-body text-sm text-muted-foreground sm:block">
                    Track your progress and manage interviews
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={generatePDFReport} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                  <span className="hidden sm:inline">Download</span>&nbsp;Report
                </Button>
                <AnalysisFeedbackButton className="text-xs sm:text-sm" />
                {isAdmin && (
                  <Button onClick={() => navigate('/admin')} variant="ghost" size="sm" className="text-primary">
                    <Shield className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                    Admin
                  </Button>
                )}
                <Button onClick={handleSignOut} variant="destructive" size="sm">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:space-y-14 sm:px-6">
            {/* Welcome */}
            <Reveal as="section" className="overflow-hidden rounded-2xl bg-ink px-6 py-6 text-ink-foreground sm:px-8 sm:py-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="eyebrow bg-white/[0.06] text-ink-foreground/70 ring-1 ring-inset ring-white/10">
                    <span className="h-1 w-1 rounded-full bg-current" />
                    {isNewUser ? 'Getting started' : 'Your progress'}
                  </span>
                  <h2 className="mt-3 font-headline text-xl font-semibold tracking-tight sm:text-2xl">
                    {isNewUser ? 'Welcome to Vyoman' : 'Keep the momentum going'}
                  </h2>
                  <p className="mt-1.5 font-body text-sm leading-body text-ink-muted">
                    {isNewUser
                      ? 'Complete your first interview to start tracking your progress.'
                      : `You've completed ${totalSessions} interview${totalSessions !== 1 ? 's' : ''}. Keep practising.`}
                  </p>
                </div>
                {isNewUser ? (
                  <Button
                    onClick={() => navigate('/interview-copilot')}
                    className="shrink-0 bg-ink-foreground text-ink hover:bg-ink-foreground/90"
                  >
                    <Play className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Start first interview
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate('/interview-history')}
                    className="shrink-0 border border-white/15 bg-white/[0.04] text-ink-foreground hover:bg-white/[0.08]"
                  >
                    <History className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    View history
                  </Button>
                )}
              </div>
            </Reveal>

            {/* Quick action */}
            <Reveal as="section">
              <div className="group rounded-2xl border border-foreground/[0.06] bg-card p-6 shadow-soft transition-transform duration-500 ease-out-quint hover:-translate-y-1 sm:p-7">
                <div className="flex items-start gap-4">
                  <IconTile
                    icon={MessageSquare}
                    tone="muted"
                    size="lg"
                    className="transition-colors duration-500 ease-out-quint group-hover:bg-ink group-hover:text-ink-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-headline text-lg font-semibold tracking-tight text-foreground">
                      Vyoman
                    </h3>
                    <p className="mt-1 font-body text-sm leading-body text-muted-foreground">
                      Practise with personalised questions and real-time feedback.
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate('/interview-copilot')} className="mt-5 w-full">
                  <MessageSquare className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Start AI interview
                </Button>
              </div>
            </Reveal>

            {/* Your plan */}
            <Reveal as="section">
              <p className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
                Your plan
              </p>
              <div className="mt-3 h-px bg-foreground/[0.06]" />
              <div className="mt-6">
                <SubscriptionCard />
              </div>
            </Reveal>

            {/* Progress & activity */}
            <Reveal as="section">
              <p className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
                Progress &amp; activity
              </p>
              <div className="mt-3 h-px bg-foreground/[0.06]" />
              <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                <ProgressTracking />
                <div data-interview-analyses>
                  <RecentInterviewAnalyses />
                </div>
              </div>
            </Reveal>

            {/* Aptitude performance */}
            <Reveal as="section">
              <p className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
                Aptitude performance
              </p>
              <div className="mt-3 h-px bg-foreground/[0.06]" />
              <div className="mt-6">
                <AptitudePerformanceCard />
              </div>
            </Reveal>

            {/* Voice analytics */}
            <Reveal as="section">
              <p className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
                Voice analytics
              </p>
              <div className="mt-3 h-px bg-foreground/[0.06]" />
              <div className="mt-6">
                <ElevenLabsAnalyticsDashboard />
              </div>
            </Reveal>

            {/* Interview history */}
            <Reveal as="section">
              <p className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
                Interview history
              </p>
              <div className="mt-3 h-px bg-foreground/[0.06]" />
              <div className="mt-6">
                <InterviewHistoryTable />
              </div>
            </Reveal>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default Dashboard;
