import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';
import 'package:vyoman_interviewer/features/standalone/screens/mobile_interview_screen.dart';

class MobilePreflightScreen extends StatefulWidget {
  const MobilePreflightScreen({super.key});

  @override
  State<MobilePreflightScreen> createState() => _MobilePreflightScreenState();
}

class _MobilePreflightScreenState extends State<MobilePreflightScreen> {
  CameraController? _cameraController;
  bool _cameraGranted = false;
  bool _micGranted = false;
  bool _isInitializing = true;

  String _targetRole = 'Software Development Engineer';
  String _interviewType = 'technical';
  String _difficulty = 'medium';

  final List<String> _roles = [
    'Software Development Engineer',
    'Frontend / React Specialist',
    'Backend / Cloud Engineer',
    'Data Structures & Algorithms Core',
    'Campus Placement Associate',
  ];

  @override
  void initState() {
    super.initState();
    _checkPermissionsAndInit();
  }

  Future<void> _checkPermissionsAndInit() async {
    try {
      final camStatus = await Permission.camera.request();
      final micStatus = await Permission.microphone.request();

      _cameraGranted = camStatus.isGranted;
      _micGranted = micStatus.isGranted;

      if (_cameraGranted) {
        final cameras = await availableCameras();
        final frontCamera = cameras.firstWhere(
          (c) => c.lensDirection == CameraLensDirection.front,
          orElse: () => cameras.first,
        );

        _cameraController = CameraController(
          frontCamera,
          ResolutionPreset.medium,
          enableAudio: false,
        );
        await _cameraController!.initialize();
      }
    } catch (e) {
      debugPrint('Hardware check error: $e');
    } finally {
      if (mounted) {
        setState(() => _isInitializing = false);
      }
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  void _startInterview() {
    if (!_cameraGranted || !_micGranted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please grant camera and microphone access to proceed with proctored interview.'),
          backgroundColor: VyomanTheme.roseDanger,
        ),
      );
      return;
    }

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => MobileInterviewScreen(
          targetRole: _targetRole,
          interviewType: _interviewType,
          difficulty: _difficulty,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VyomanTheme.surfacePorcelain,
      appBar: AppBar(
        title: const Text('Mobile Interview Setup'),
        elevation: 0,
      ),
      body: _isInitializing
          ? const Center(
              child: CircularProgressIndicator(color: VyomanTheme.primaryIndigo),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hardware Preflight Card (Camera Preview & Mic status)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: VyomanTheme.emeraldGreen,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'Hardware Pre-Flight Check',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          // Camera Preview Circle/Box
                          Center(
                            child: Container(
                              width: 140,
                              height: 140,
                              decoration: BoxDecoration(
                                color: VyomanTheme.inkSoft,
                                shape: BoxShape.circle,
                                border: Border.all(color: VyomanTheme.primaryIndigo, width: 2),
                              ),
                              clipBehavior: Clip.antiAlias,
                              child: _cameraController != null && _cameraController!.value.isInitialized
                                  ? CameraPreview(_cameraController!)
                                  : const Icon(Icons.videocam_off, color: Colors.white54, size: 36),
                            ),
                          ),
                          const SizedBox(height: 14),
                          // Status checklist
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _StatusBadge(
                                icon: Icons.camera_alt,
                                label: 'Face Camera',
                                isOk: _cameraGranted,
                              ),
                              _StatusBadge(
                                icon: Icons.mic,
                                label: 'Microphone',
                                isOk: _micGranted,
                              ),
                              const _StatusBadge(
                                icon: Icons.volume_up,
                                label: 'AI Voice TTS',
                                isOk: true,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Role & Difficulty Selection
                  const Text(
                    'Assessment Parameters',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: VyomanTheme.textPrimary),
                  ),
                  const SizedBox(height: 10),

                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Target Role
                          const Text(
                            'Target Engineering Role',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: VyomanTheme.textMuted),
                          ),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String>(
                            value: _targetRole,
                            isExpanded: true,
                            decoration: InputDecoration(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            items: _roles
                                .map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 13))))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _targetRole = val);
                            },
                          ),
                          const SizedBox(height: 16),

                          // Interview Type
                          const Text(
                            'Interview Focus',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: VyomanTheme.textMuted),
                          ),
                          const SizedBox(height: 8),
                          SegmentedButton<String>(
                            segments: const [
                              ButtonSegment(value: 'technical', label: Text('Technical')),
                              ButtonSegment(value: 'mixed', label: Text('Mixed / HR')),
                              ButtonSegment(value: 'behavioral', label: Text('Behavioral')),
                            ],
                            selected: {_interviewType},
                            onSelectionChanged: (val) => setState(() => _interviewType = val.first),
                          ),
                          const SizedBox(height: 16),

                          // Difficulty
                          const Text(
                            'Placement Difficulty Tier',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: VyomanTheme.textMuted),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _TierChip(
                                label: 'Easy (Ninja)',
                                isSelected: _difficulty == 'easy',
                                onTap: () => setState(() => _difficulty = 'easy'),
                              ),
                              const SizedBox(width: 8),
                              _TierChip(
                                label: 'Medium (Digital)',
                                isSelected: _difficulty == 'medium',
                                onTap: () => setState(() => _difficulty = 'medium'),
                              ),
                              const SizedBox(width: 8),
                              _TierChip(
                                label: 'Hard (Product/FAANG)',
                                isSelected: _difficulty == 'hard',
                                onTap: () => setState(() => _difficulty = 'hard'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Launch Button
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: VyomanTheme.ink,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: _startInterview,
                      icon: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 22),
                      label: const Text(
                        'Start Mobile Proctored Interview',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isOk;

  const _StatusBadge({required this.icon, required this.label, required this.isOk});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: isOk ? VyomanTheme.emeraldGreen : VyomanTheme.roseDanger, size: 20),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: VyomanTheme.textMuted),
        ),
      ],
    );
  }
}

class _TierChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _TierChip({required this.label, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? VyomanTheme.primaryIndigo.withOpacity(0.1) : Colors.transparent,
            border: Border.all(
              color: isSelected ? VyomanTheme.primaryIndigo : VyomanTheme.borderLight,
              width: isSelected ? 1.5 : 1,
            ),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: isSelected ? VyomanTheme.primaryIndigo : VyomanTheme.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}
