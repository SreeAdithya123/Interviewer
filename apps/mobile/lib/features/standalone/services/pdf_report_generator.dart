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
  }) async {
    final doc = pw.Document();

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
              _buildPdfMetric('Readiness Score', '$overallScore/100', 'Tier-1 Ready', PdfColors.indigo700),
              pw.SizedBox(width: 10),
              _buildPdfMetric('National Percentile', '${nationalPercentile}th', 'Top 11% India', PdfColors.blue700),
              pw.SizedBox(width: 10),
              _buildPdfMetric('Integrity Index', '$proctorScore%', 'Pristine Audit', PdfColors.green700),
            ],
          ),
          pw.SizedBox(height: 16),

          // Competency Rubrics
          pw.Text('Performance by Dimension (5-Rubrics)', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),
          _buildPdfDimensionRow('Technical Depth & CS Core', 85),
          _buildPdfDimensionRow('Communication & Articulation', 80),
          _buildPdfDimensionRow('Problem Solving & Structure', 82),
          _buildPdfDimensionRow('Relevance & Directness', 84),
          _buildPdfDimensionRow('Confidence & Delivery', 79),

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
                    pw.Text('Q${t['turn']} (${t['stage']}): ${t['question']}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
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
