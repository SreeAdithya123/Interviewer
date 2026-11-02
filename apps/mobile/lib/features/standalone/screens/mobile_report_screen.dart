import 'package:flutter/material.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';

class MobileReportScreen extends StatelessWidget {
  final String targetRole;
  final String difficulty;
  final List<Map<String, dynamic>> recordedTurns;

  const MobileReportScreen({
    super.key,
    required this.targetRole,
    required this.difficulty,
    required this.recordedTurns,
  });

  @override
  Widget build(BuildContext context) {
    const overallScore = 82;
    const nationalPercentile = 89.4;
    const proctorScore = 98;

    return Scaffold(
      backgroundColor: VyomanTheme.surfacePorcelain,
      appBar: AppBar(
        title: const Text('Executive Evaluation Dossier'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Report link copied to clipboard!')),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Dossier Metadata Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: VyomanTheme.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: VyomanTheme.emeraldGreen.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'VERIFIED PROCTORED DOSSIER',
                          style: TextStyle(
                            color: VyomanTheme.emeraldGreen,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '#VY-${DateTime.now().millisecondsSinceEpoch % 100000}',
                        style: const TextStyle(
                          color: VyomanTheme.textMuted,
                          fontSize: 10,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '$targetRole Evaluation',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: VyomanTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Difficulty: ${difficulty.toUpperCase()} · 5 Questions Completed',
                    style: const TextStyle(fontSize: 12, color: VyomanTheme.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Consensus Verdict Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFC7D2FE)),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'PLACEMENT VERDICT',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: VyomanTheme.primaryIndigo,
                      letterSpacing: 0.5,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'CLEAR HIRE · DIGITAL SPECIALIST & HIGH-GROWTH TECH',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E1B4B),
                    ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Strong structural fundamentals, solid technical trade-off articulation, and clear camera composure under proctoring.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF4338CA), height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Three Pillar KPI Cards
            Row(
              children: [
                _KpiMetricCard(
                  label: 'Readiness',
                  value: '$overallScore',
                  suffix: '/100',
                  badgeText: 'Tier-1 Ready',
                  color: VyomanTheme.primaryIndigo,
                ),
                const SizedBox(width: 10),
                const _KpiMetricCard(
                  label: 'National Rank',
                  value: '$nationalPercentile',
                  suffix: 'th %ile',
                  badgeText: 'Top 11% India',
                  color: VyomanTheme.secondarySky,
                ),
                const SizedBox(width: 10),
                const _KpiMetricCard(
                  label: 'Integrity',
                  value: '$proctorScore%',
                  suffix: 'Trust',
                  badgeText: 'Pristine',
                  color: VyomanTheme.emeraldGreen,
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 5-Dimension Competency Rubrics
            const Text(
              'Performance by Dimension',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: VyomanTheme.textPrimary),
            ),
            const SizedBox(height: 10),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: VyomanTheme.borderLight),
              ),
              child: const Column(
                children: [
                  _DimensionBar(label: 'Technical Depth & CS Core', score: 85),
                  Divider(height: 20),
                  _DimensionBar(label: 'Communication & Articulation', score: 80),
                  Divider(height: 20),
                  _DimensionBar(label: 'Problem Solving & Structure', score: 82),
                  Divider(height: 20),
                  _DimensionBar(label: 'Relevance & Directness', score: 84),
                  Divider(height: 20),
                  _DimensionBar(label: 'Confidence & Composure', score: 79),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Turn-by-Turn Question Diagnostic
            const Text(
              'Turn-by-Turn Questions & Audio Playback',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: VyomanTheme.textPrimary),
            ),
            const SizedBox(height: 10),

            ...recordedTurns.map((turn) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: VyomanTheme.borderLight),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Question ${turn['turn']} · ${turn['stage']}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: VyomanTheme.primaryIndigo,
                            ),
                          ),
                          Text(
                            '${turn['duration']}s audio',
                            style: const TextStyle(fontSize: 10, color: VyomanTheme.textMuted),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        turn['question'] as String,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: VyomanTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: VyomanTheme.surfacePorcelain,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          turn['transcript'] as String,
                          style: const TextStyle(fontSize: 11, color: VyomanTheme.textMuted, fontStyle: FontStyle.italic),
                        ),
                      ),
                    ],
                  ),
                )),

            const SizedBox(height: 16),

            // Return to Home
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: VyomanTheme.ink,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                child: const Text('Back to Home Dashboard', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KpiMetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String suffix;
  final String badgeText;
  final Color color;

  const _KpiMetricCard({
    required this.label,
    required this.value,
    required this.suffix,
    required this.badgeText,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: VyomanTheme.borderLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: VyomanTheme.textMuted)),
            const SizedBox(height: 4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color),
                ),
                const SizedBox(width: 2),
                Text(
                  suffix,
                  style: const TextStyle(fontSize: 10, color: VyomanTheme.textMuted),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              badgeText,
              style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: color),
            ),
          ],
        ),
      ),
    );
  }
}

class _DimensionBar extends StatelessWidget {
  final String label;
  final int score;

  const _DimensionBar({required this.label, required this.score});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: VyomanTheme.textPrimary)),
            Text('$score / 100', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: VyomanTheme.textPrimary)),
          ],
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: score / 100,
          backgroundColor: VyomanTheme.borderLight,
          color: score >= 80 ? VyomanTheme.emeraldGreen : VyomanTheme.primaryIndigo,
          minHeight: 6,
          borderRadius: BorderRadius.circular(4),
        ),
      ],
    );
  }
}
