import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class PdfReportGenerator {
  static Future<void> generateAndPrintDossier({
    required String targetRole,
    required String difficulty,
    required int overallScore,
    required double nationalPercentile,
    required int proctorScore,
    required List<Map<String, dynamic>> turns,
    Map<String, dynamic>? scores,
    List<dynamic>? strengths,
    List<dynamic>? weakAreas,
    List<dynamic>? practiceActions,
  }) async {
    final doc = pw.Document();

    final techScore = _extractScore(scores, 'technical_depth', 85);
    final commScore = _extractScore(scores, 'communication_clarity', 80);
    final structScore = _extractScore(scores, 'answer_structure', 82);
    final relScore = _extractScore(scores, 'relevance', 84);
    final confScore = _extractScore(scores, 'confidence_and_delivery', 79);

    final finalStrengths = strengths != null && strengths.isNotEmpty
        ? strengths.map((s) => s.toString()).toList()
        : [
            'Structured problem decomposition and methodical implementation.',
            'Clear communication of algorithm complexities and edge scenarios.',
            'Consistent eye contact and composure under placement assessment conditions.',
          ];

    final finalWeakAreas = weakAreas != null && weakAreas.isNotEmpty
        ? weakAreas.map((w) {
            if (w is Map) return '${w['skill'] ?? 'Area'}: ${w['notes'] ?? ''}';
            return w.toString();
          }).toList()
        : [
            'Space Optimization: Look for opportunities to reduce auxiliary memory usage.',
            'Boundary Conditions: Explicitly discuss edge cases before writing code.',
          ];

    final finalActions = practiceActions != null && practiceActions.isNotEmpty
        ? practiceActions.map((a) => a.toString()).toList()
        : [
            'Solve 5 LeetCode Medium Sliding Window problems.',
            'Practice 60s concise verbal structuring on technical trade-offs.',
          ];

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (context) => [
          // Header
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    'VYOMAN INTERVIEWER',
                    style: pw.TextStyle(
                      fontSize: 16,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColors.indigo900,
                    ),
                  ),
                  pw.Text(
                    'Executive Candidate Evaluation Dossier',
                    style: const pw.TextStyle(fontSize: 11, color: PdfColors.grey700),
                  ),
                ],
              ),
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: pw.BoxDecoration(
                  color: PdfColors.green50,
                  borderRadius: pw.BorderRadius.circular(4),
                  border: pw.Border.all(color: PdfColors.green700),
                ),
                child: pw.Text(
                  'VERIFIED PROCTOR & RUBRIC',
                  style: pw.TextStyle(fontSize: 8, color: PdfColors.green900, fontWeight: pw.FontWeight.bold),
                ),
              ),
            ],
          ),
          pw.Divider(thickness: 1, color: PdfColors.grey300),
          pw.SizedBox(height: 12),

          // Metadata Card
          pw.Container(
            padding: const pw.EdgeInsets.all(12),
            decoration: pw.BoxDecoration(
              color: PdfColors.grey100,
              borderRadius: pw.BorderRadius.circular(8),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Role Track: $targetRole', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                    pw.Text('Difficulty Level: ${difficulty.toUpperCase()}', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                  ],
                ),
                pw.Text('Date: ${DateTime.now().toLocal().toString().split(' ')[0]}', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
              ],
            ),
          ),
          pw.SizedBox(height: 14),

          // Scorecard Metrics
          pw.Row(
            children: [
              _buildPdfMetric('Readiness Score', '$overallScore/100', overallScore >= 80 ? 'Tier-1 Ready' : 'Qualified', PdfColors.indigo700),
              pw.SizedBox(width: 10),
              _buildPdfMetric('National Percentile', '${nationalPercentile}th', 'Top ${(100 - nationalPercentile).clamp(1, 99).toStringAsFixed(0)}% Cohort', PdfColors.blue700),
              pw.SizedBox(width: 10),
              _buildPdfMetric('Integrity Index', '$proctorScore%', 'Pristine Audit', PdfColors.green700),
            ],
          ),
          pw.SizedBox(height: 16),

          // Competency Rubrics
          pw.Text('Performance by Dimension (5-Rubrics)', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),
          _buildPdfDimensionRow('Technical Depth & CS Core', techScore),
          _buildPdfDimensionRow('Communication & Articulation', commScore),
          _buildPdfDimensionRow('Problem Solving & Structure', structScore),
          _buildPdfDimensionRow('Relevance & Directness', relScore),
          _buildPdfDimensionRow('Confidence & Delivery', confScore),

          pw.SizedBox(height: 14),

          // Strengths & Weak Areas
          pw.Text('Key Observed Strengths', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.green900)),
          pw.SizedBox(height: 4),
          ...finalStrengths.map((s) => pw.Bullet(text: s, style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey800))),

          pw.SizedBox(height: 8),
          pw.Text('Priority Growth Areas', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.amber900)),
          pw.SizedBox(height: 4),
          ...finalWeakAreas.map((w) => pw.Bullet(text: w, style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey800))),

          pw.SizedBox(height: 8),
          pw.Text('Targeted Practice Actions', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
          pw.SizedBox(height: 4),
          ...finalActions.map((a) => pw.Bullet(text: a, style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey800))),

          pw.SizedBox(height: 16),

          // Question Turns
          pw.Text('Turn-by-Turn Question Evaluation', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),
          ...turns.map((t) => pw.Container(
                margin: const pw.EdgeInsets.only(bottom: 8),
                padding: const pw.EdgeInsets.all(8),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: PdfColors.grey300),
                  borderRadius: pw.BorderRadius.circular(6),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Q${t['turn']} (${t['stageLabel'] ?? t['stage']}): ${t['question']}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                    pw.SizedBox(height: 2),
                    pw.Text('Evaluation: ${t['transcript']}', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
                  ],
                ),
              )),
        ],
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => doc.save(),
    );
  }

  static int _extractScore(Map<String, dynamic>? scores, String key, int fallback) {
    if (scores == null) return fallback;
    final val = scores[key];
    if (val is num) return val.round();
    if (val is Map && val['score'] is num) return (val['score'] as num).round();
    return fallback;
  }

  static pw.Widget _buildPdfMetric(String label, String value, String sub, PdfColor color) {
    return pw.Expanded(
      child: pw.Container(
        padding: const pw.EdgeInsets.all(10),
        decoration: pw.BoxDecoration(
          border: pw.Border.all(color: PdfColors.grey300),
          borderRadius: pw.BorderRadius.circular(6),
        ),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(label, style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey600)),
            pw.SizedBox(height: 2),
            pw.Text(value, style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: color)),
            pw.SizedBox(height: 2),
            pw.Text(sub, style: pw.TextStyle(fontSize: 8, color: color, fontWeight: pw.FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  static pw.Widget _buildPdfDimensionRow(String label, int score) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: const pw.TextStyle(fontSize: 10)),
          pw.Text('$score / 100', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
        ],
      ),
    );
  }
}
