import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:vyoman_interviewer/core/services/dualcam_service.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';

class DualCamStreamScreen extends StatefulWidget {
  final String interviewId;
  final String token;

  const DualCamStreamScreen({
    super.key,
    required this.interviewId,
    required this.token,
  });

  @override
  State<DualCamStreamScreen> createState() => _DualCamStreamScreenState();
}

class _DualCamStreamScreenState extends State<DualCamStreamScreen> {
  CameraController? _cameraController;
  DualCamService? _dualCamService;
  bool _isCameraReady = false;
  String? _errorMessage;
  int _heartbeats = 0;
  int _batteryPct = 100;
  bool _showGuideOverlay = true;

  @override
  void initState() {
    super.initState();
    _initCameraAndStreaming();
  }

  Future<void> _initCameraAndStreaming() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _errorMessage = 'No camera found on this device.');
        return;
      }

      // Prefer back camera for wide desk monitoring
      final selectedCamera = cameras.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      _cameraController = CameraController(
        selectedCamera,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _cameraController!.initialize();

      _dualCamService = DualCamService(
        interviewId: widget.interviewId,
        token: widget.token,
      );

      await _dualCamService!.startStreaming(
        onHeartbeat: (count, battery) {
          if (mounted) {
            setState(() {
              _heartbeats = count;
              _batteryPct = battery;
            });
          }
        },
        onError: (err) {
          if (mounted) {
            setState(() => _errorMessage = err);
          }
        },
      );

      if (mounted) {
        setState(() => _isCameraReady = true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = 'Camera initialization failed: $e');
      }
    }
  }

  Future<void> _handleExit() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: VyomanTheme.inkSoft,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Disconnect Secondary Camera?',
          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'Ending the secondary camera stream may flag an integrity warning on your PC mock interview.',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Stay Connected', style: TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: VyomanTheme.roseDanger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Disconnect', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _dualCamService?.stopStreaming();
      if (mounted) {
        Navigator.of(context).pop();
      }
    }
  }

  @override
  void dispose() {
    _dualCamService?.stopStreaming();
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_errorMessage != null) {
      return Scaffold(
        backgroundColor: VyomanTheme.ink,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: VyomanTheme.roseDanger, size: 48),
                const SizedBox(height: 16),
                Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Return to Home'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!_isCameraReady || _cameraController == null) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: VyomanTheme.primaryIndigo),
              SizedBox(height: 16),
              Text(
                'Linking camera with PC session...',
                style: TextStyle(color: Colors.white, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Fullscreen camera preview
          CameraPreview(_cameraController!),

          // 45-degree angle visual positioning guide
          if (_showGuideOverlay)
            IgnorePointer(
              child: Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white.withOpacity(0.35), width: 1.5),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.6),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.crop_free, color: VyomanTheme.secondarySky, size: 16),
                            SizedBox(width: 8),
                            Text(
                              'Frame hands, keyboard & screen edge',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      // Target indicator
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        margin: const EdgeInsets.only(bottom: 20),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.7),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'Place phone at 45° angle, ~1m to your side',
                          style: TextStyle(color: Color(0xFFE2E8F0), fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Header Status Bar: Streaming Indicator, Heartbeats, Battery, Dismiss Guide
          SafeArea(
            child: Align(
              alignment: Alignment.topCenter,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    // Live Status Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.75),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: VyomanTheme.emeraldGreen.withOpacity(0.4)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: VyomanTheme.emeraldGreen,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text(
                            'PROCTOR LIVE',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${_heartbeats}s',
                            style: const TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 10,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),

                    // Battery Indicator
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.75),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _batteryPct < 20 ? Icons.battery_alert : Icons.battery_charging_full,
                            color: _batteryPct < 20 ? VyomanTheme.roseDanger : VyomanTheme.emeraldGreen,
                            size: 16,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$_batteryPct%',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Toggle Guide
                    IconButton(
                      icon: Icon(
                        _showGuideOverlay ? Icons.visibility : Icons.visibility_off,
                        color: Colors.white,
                        size: 20,
                      ),
                      style: IconButton.styleFrom(backgroundColor: Colors.black.withOpacity(0.6)),
                      onPressed: () => setState(() => _showGuideOverlay = !_showGuideOverlay),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Footer Bar: Session Token & Disconnect Button
          SafeArea(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: VyomanTheme.inkSoft.withOpacity(0.92),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.12)),
                  ),
                  child: Row(
                    children: [
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PAIRING TOKEN',
                            style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            widget.token,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: VyomanTheme.roseDanger,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _handleExit,
                        icon: const Icon(Icons.stop_circle_outlined, size: 16, color: Colors.white),
                        label: const Text(
                          'End Stream',
                          style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
