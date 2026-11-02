import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';
import 'package:vyoman_interviewer/features/dualcam/screens/dualcam_stream_screen.dart';

class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  bool _isProcessing = false;
  final TextEditingController _codeController = TextEditingController();

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing) return;
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      final rawValue = barcode.rawValue;
      if (rawValue != null && rawValue.isNotEmpty) {
        _handleScannedValue(rawValue);
        break;
      }
    }
  }

  void _handleScannedValue(String value) {
    setState(() => _isProcessing = true);

    String interviewId = 'session_${DateTime.now().millisecondsSinceEpoch}';
    String token = 'PAIR_${DateTime.now().millisecondsSinceEpoch % 10000}';

    try {
      final uri = Uri.parse(value);
      final idParam = uri.queryParameters['interviewId'];
      final tokenParam = uri.queryParameters['token'];

      if (idParam != null && idParam.isNotEmpty) {
        interviewId = idParam;
      }
      if (tokenParam != null && tokenParam.isNotEmpty) {
        token = tokenParam;
      }
    } catch (_) {
      // If plain text token
      if (value.length > 4) {
        token = value;
      }
    }

    _controller.stop();

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => DualCamStreamScreen(
          interviewId: interviewId,
          token: token,
        ),
      ),
    );
  }

  void _showManualInputDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: VyomanTheme.inkSoft,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Enter Pairing Code',
          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter the 6-character pairing code shown below the QR code on your PC.',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _codeController,
              autofocus: true,
              style: const TextStyle(color: Colors.white, letterSpacing: 2, fontWeight: FontWeight.bold),
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'e.g. VY8492',
                hintStyle: const TextStyle(color: Color(0xFF64748B)),
                filled: true,
                fillColor: const Color(0xFF090A10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF334155)),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: VyomanTheme.primaryIndigo),
            onPressed: () {
              final code = _codeController.text.trim();
              if (code.isNotEmpty) {
                Navigator.pop(ctx);
                _handleScannedValue('https://vyoman.tech/pair?token=$code');
              }
            },
            child: const Text('Connect', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Scan PC Proctor QR',
          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on, color: Colors.white),
            onPressed: () => _controller.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Camera feed for scanner
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),

          // Viewfinder reticle overlay
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(color: VyomanTheme.primaryIndigo, width: 2.5),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: VyomanTheme.primaryIndigo.withOpacity(0.2),
                    blurRadius: 20,
                    spreadRadius: 4,
                  ),
                ],
              ),
            ),
          ),

          // Instructions & Manual Token Button
          Positioned(
            left: 20,
            right: 20,
            bottom: 40,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.75),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.15)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.qr_code_scanner, color: VyomanTheme.primaryIndigo, size: 20),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Point at the QR code displayed on your PC screen at the start of your mock interview.',
                          style: TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                TextButton.icon(
                  onPressed: _showManualInputDialog,
                  icon: const Icon(Icons.keyboard_outlined, color: Colors.white70, size: 18),
                  label: const Text(
                    'Can\'t scan? Enter code manually',
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
