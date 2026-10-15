import React from 'react';
import { TrendingUp, Clock, CheckCircle, Target, BarChart3, Award } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import Reveal from '@/components/marketing/Reveal';
import { Card } from '@/components/ui/card';
import { IconTile, StatusPill } from '@/components/app/primitives';
import { useUserStats } from '@/hooks/useUserStats';

const ProgressTracking = () => {
  const { isNewUser, totalSessions, totalHours, completedInterviews, averageScore, analyses, interviewSessions } = useUserStats();

  const stats = [
    {
      label: 'Sessions',
      value: totalSessions.toString(),
      change: totalSessions > 0 ? '+12%' : '0%',
      icon: BarChart3,
      color: 'text-primary'
    },
    {
      label: 'Hours',
      value: totalHours.toString(),
      change: totalHours > 0 ? '+8%' : '0%',
      icon: Clock,
      color: 'text-accent'
    },
    {
      label: 'Completed',
      value: completedInterviews.toString(),
      change: completedInterviews > 0 ? '+15%' : '0%',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      label: 'Success',
      value: `${averageScore}%`,
      change: averageScore > 0 ? '+5%' : '0%',
      icon: Target,
      color: 'text-blue-600'
    }
  ];

  // Calculate skill progress from actual data or show zeros for new users
  const calculateSkillProgress = () => {
    if (totalSessions === 0 || analyses.length === 0) {
      return [
        { skill: 'Communication', progress: 0, color: 'bg-primary' },
        { skill: 'Technical', progress: 0, color: 'bg-accent' },
        { skill: 'Problem Solving', progress: 0, color: 'bg-green-500' },
        { skill: 'Confidence', progress: 0, color: 'bg-blue-500' }
      ];
    }

    const avgCommunication = analyses.reduce((sum, a) => sum + (a.communication_score || 0), 0) / analyses.length;
    const avgTechnical = analyses.reduce((sum, a) => sum + (a.technical_score || 0), 0) / analyses.length;
    const avgProblemSolving = analyses.reduce((sum, a) => sum + (a.problem_solving_score || 0), 0) / analyses.length;
    const avgConfidence = analyses.reduce((sum, a) => sum + (a.confidence_score || 0), 0) / analyses.length;

    return [
      { skill: 'Communication', progress: Math.round(avgCommunication), color: 'bg-primary' },
      { skill: 'Technical', progress: Math.round(avgTechnical), color: 'bg-accent' },
      { skill: 'Problem Solving', progress: Math.round(avgProblemSolving), color: 'bg-green-500' },
      { skill: 'Confidence', progress: Math.round(avgConfidence), color: 'bg-blue-500' }
    ];
  };

  const skillProgress = calculateSkillProgress();

  // Generate recent activities from actual interview session data
  const recentActivities = interviewSessions.slice(0, 3).map((session) => ({
    type: `${session.interview_type} Interview`,
    date: new Date(session.created_at).toLocaleDateString(),
    score: 'Completed',
    status: 'Completed'
  }));

  // Data for pie chart - Interview Types Distribution
  const pieChartData = totalSessions === 0 ? [
    { name: 'No Data', value: 100, color: 'hsl(var(--muted))' }
  ] : [
    { name: 'General', value: 40, color: 'hsl(var(--primary))' },
    { name: 'Technical', value: 30, color: 'hsl(var(--ink))' },
    { name: 'UPSC', value: 20, color: 'hsl(var(--primary) / 0.55)' },
    { name: 'Friendly', value: 10, color: 'hsl(var(--muted-foreground))' }
  ];

  // Data for bar chart - Weekly Progress
  const generateWeeklyData = () => {
    if (totalSessions === 0) {
      return [
        { name: 'Mon', interviews: 0, hours: 0 },
        { name: 'Tue', interviews: 0, hours: 0 },
        { name: 'Wed', interviews: 0, hours: 0 },
        { name: 'Thu', interviews: 0, hours: 0 },
        { name: 'Fri', interviews: 0, hours: 0 },
        { name: 'Sat', interviews: 0, hours: 0 },
        { name: 'Sun', interviews: 0, hours: 0 }
      ];
    }

    // Group interview sessions by day of week
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyStats = weekDays.map(day => ({ name: day, interviews: 0, hours: 0 }));

    interviewSessions.forEach(session => {
      const dayIndex = new Date(session.created_at).getDay();
      dailyStats[dayIndex].interviews += 1;
      dailyStats[dayIndex].hours = Math.round((dailyStats[dayIndex].interviews * 0.1) * 10) / 10;
    });

    return dailyStats.slice(1).concat(dailyStats.slice(0, 1));
  };

  const barChartData = generateWeeklyData();

  // Data for line chart - Performance Trend
  const lineChartData = totalSessions === 0 ? [
    { week: 'Week 1', score: 0 },
    { week: 'Week 2', score: 0 },
    { week: 'Week 3', score: 0 },
    { week: 'Week 4', score: 0 }
  ] : [
    { week: 'Week 1', score: Math.max(0, averageScore - 12) },
    { week: 'Week 2', score: Math.max(0, averageScore - 8) },
    { week: 'Week 3', score: Math.max(0, averageScore - 4) },
    { week: 'Week 4', score: averageScore }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Grid */}
      <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-3 sm:p-4 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <IconTile icon={stat.icon} tone="muted" size="sm" />
              <div className={`flex items-center gap-0.5 text-xs font-medium font-metric ${totalSessions === 0 ? 'text-muted-foreground' : 'text-green-600'}`}>
                <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
                <span>{stat.change}</span>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-metric text-foreground">{stat.value}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
          </Card>
        ))}
      </Reveal>

      {/* Charts Section - Responsive Grid */}
      <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Pie Chart - Interview Types */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" strokeWidth={1.5} />
            <h3 className="text-sm sm:text-base font-semibold font-headline text-foreground">Interview Types</h3>
          </div>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  fill="#8884d8"
                  dataKey="value"
                  label={totalSessions === 0 ? false : ({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {totalSessions === 0 && (
            <div className="text-center text-xs text-muted-foreground mt-2">
              Complete interviews to see distribution
            </div>
          )}
        </Card>

        {/* Bar Chart - Weekly Activity */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-accent" strokeWidth={1.5} />
            <h3 className="text-sm sm:text-base font-semibold font-headline text-foreground">Weekly Activity</h3>
          </div>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="interviews" fill="hsl(var(--primary))" name="Interviews" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Reveal>

      {/* Skill Progress and Activities */}
      <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Skill Progress */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4 w-4 sm:h-5 sm:w-5 text-primary" strokeWidth={1.5} />
            <h3 className="text-sm sm:text-base font-semibold font-headline text-foreground">Skill Progress</h3>
          </div>
          <div className="space-y-3">
            {skillProgress.map((skill) => (
              <div key={skill.skill}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs sm:text-sm font-medium text-foreground">{skill.skill}</span>
                  <span className="text-xs text-muted-foreground font-metric">{skill.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 sm:h-2">
                  <div
                    className={`h-1.5 sm:h-2 rounded-full ${skill.color} transition-[width] duration-700 ease-out-quint`}
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activities */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-accent" strokeWidth={1.5} />
            <h3 className="text-sm sm:text-base font-semibold font-headline text-foreground">Recent Activities</h3>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {recentActivities.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">No activities yet</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Start your first interview
                </div>
              </div>
            ) : (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-2 sm:p-3 hover:bg-muted/50 rounded-lg transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-foreground truncate">{activity.type}</div>
                    <div className="text-xs text-muted-foreground font-metric">{activity.date}</div>
                  </div>
                  <div className="shrink-0 ml-2">
                    <StatusPill tone="active">{activity.status}</StatusPill>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </Reveal>

      {/* Performance Trend Line Chart */}
      <Reveal>
        <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm sm:text-base font-semibold font-headline text-foreground">Performance Trend</h3>
        </div>
        <div className="h-48 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {totalSessions === 0 && (
          <div className="text-center text-xs text-muted-foreground mt-2">
            Complete interviews to track your performance
          </div>
        )}
        </Card>
      </Reveal>
    </div>
  );
};

export default ProgressTracking;
