import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:record/record.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';
import 'package:vyoman_interviewer/features/standalone/screens/mobile_report_screen.dart';

class MobileInterviewScreen extends StatefulWidget {
  final String targetRole;
  final String interviewType;
  final String difficulty;

  const MobileInterviewScreen({
    super.key,
    required this.targetRole,
    required this.interviewType,
    required this.difficulty,
  });

  @override
  State<MobileInterviewScreen> createState() => _MobileInterviewScreenState();
}

class _MobileInterviewScreenState extends State<MobileInterviewScreen> {
  CameraController? _cameraController;
  final AudioPlayer _audioPlayer = AudioPlayer();
  final AudioRecorder _audioRecorder = AudioRecorder();

  int _currentTurn = 1;
  final int _totalTurns = 5;
  String _currentStage = 'Technical Core';
  bool _isAiSpeaking = false;
  bool _isCandidateRecording = false;
  Timer? _pauseTimer;
  int _speechDurationSeconds = 0;
  Timer? _durationTimer;

  // Interview Questions Flow
  final List<Map<String, String>> _interviewScript = [
    {
      'stage': 'Intro & Context',
      'question': 'Welcome! To kick off, could you briefly introduce yourself and highlight a project where you solved a non-trivial technical challenge?',
      'expectedTopic': 'Introductory overview and technical depth',
    },
    {
      'stage': 'Technical Core',
      'question': 'Let’s explore data structures. Can you explain the time and space trade-offs between an Array-based list and a Hash Table for lookup-heavy workloads?',
      'expectedTopic': 'Asymptotic complexity & memory locality',
    },
    {
      'stage': 'Problem Solving',
      'question': 'Suppose you are designing an LRU Cache with O(1) get and put operations. What underlying data structures would you combine, and how do you handle eviction?',
      'expectedTopic': 'Doubly Linked List + Hash Map combination',
    },
    {
      'stage': 'Behavioral / STAR',
      'question': 'Describe a scenario where you faced a tight production deadline or an unexpected bug. How did you prioritize tasks and communicate with peers?',
      'expectedTopic': 'STAR method: Situation, Task, Action, Result',
    },
    {
      'stage': 'Closing & Systems',
      'question': 'Great. Finally, how do you handle database connection pooling and query optimization when user concurrency scales by 10x?',
      'expectedTopic': 'Indexing, connection pool limits, caching layer',
    },
  ];

  final List<Map<String, dynamic>> _recordedTurns = [];

  @override
  void initState() {
    super.initState();
    _initFrontCamera();
    _playQuestionTurn(0);
  }

  Future<void> _initFrontCamera() async {
    try {
      final cameras = await availableCameras();
      final frontCam = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      _cameraController = CameraController(frontCam, ResolutionPreset.low, enableAudio: false);
      await _cameraController!.initialize();
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _playQuestionTurn(int turnIndex) async {
    setState(() {
      _isAiSpeaking = true;
      _isCandidateRecording = false;
      _currentTurn = turnIndex + 1;
      _currentStage = _interviewScript[turnIndex]['stage']!;
    });

    // Simulate AI speaking duration (3.5 seconds)
    await Future.delayed(const Duration(seconds: 4));

    if (mounted) {
      setState(() {
        _isAiSpeaking = false;
      });
      _startCandidateRecording();
    }
  }

  Future<void> _startCandidateRecording() async {
    try {
      if (await _audioRecorder.hasPermission()) {
        _speechDurationSeconds = 0;
        _durationTimer?.cancel();
        _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
          if (mounted) setState(() => _speechDurationSeconds++);
        });

        setState(() {
          _isCandidateRecording = true;
        });
      }
    } catch (_) {}
  }

  void _completeCandidateAnswer() {
    _durationTimer?.cancel();
    _pauseTimer?.cancel();

    final script = _interviewScript[_currentTurn - 1];
    _recordedTurns.add({
      'turn': _currentTurn,
      'stage': script['stage'],
      'question': script['question'],
      'duration': _speechDurationSeconds,
      'transcript': 'Demonstrated methodical decomposition and trade-off analysis for ${script['expectedTopic']}.',
    });

    if (_currentTurn < _totalTurns) {
      _playQuestionTurn(_currentTurn);
    } else {
      _concludeAndNavigateToReport();
    }
  }

  void _concludeAndNavigateToReport() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => MobileReportScreen(
          targetRole: widget.targetRole,
          difficulty: widget.difficulty,
          recordedTurns: _recordedTurns,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _audioPlayer.dispose();
    _audioRecorder.dispose();
    _durationTimer?.cancel();
    _pauseTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentQ = _interviewScript[(_currentTurn - 1).clamp(0, _interviewScript.length - 1)];

    return Scaffold(
      backgroundColor: VyomanTheme.ink,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white70),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${widget.targetRole} Mock',
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
            ),
            Text(
              'Question $_currentTurn of $_totalTurns · $_currentStage',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: VyomanTheme.emeraldGreen.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: VyomanTheme.emeraldGreen.withOpacity(0.3)),
            ),
            child: const Row(
              children: [
                Icon(Icons.shield_outlined, color: VyomanTheme.emeraldGreen, size: 12),
                SizedBox(width: 4),
                Text('Proctor Active', style: TextStyle(color: VyomanTheme.emeraldGreen, fontSize: 10, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Progress Bar across turns
            LinearProgressIndicator(
              value: _currentTurn / _totalTurns,
              backgroundColor: const Color(0xFF1E2235),
              color: VyomanTheme.primaryIndigo,
              minHeight: 3,
            ),

            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    // Floating Camera Proctor Picture-in-Picture
                    Align(
                      alignment: Alignment.topRight,
                      child: Container(
                        width: 90,
                        height: 120,
                        decoration: BoxDecoration(
                          color: VyomanTheme.inkSoft,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white.withOpacity(0.2)),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: _cameraController != null && _cameraController!.value.isInitialized
                            ? CameraPreview(_cameraController!)
                            : const Icon(Icons.person, color: Colors.white30, size: 30),
                      ),
                    ),

                    const Spacer(),

                    // Voice Wave / AI Speaking Animation
                    Center(
                      child: Column(
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _isAiSpeaking
                                  ? VyomanTheme.primaryIndigo.withOpacity(0.2)
                                  : VyomanTheme.emeraldGreen.withOpacity(0.15),
                              border: Border.all(
                                color: _isAiSpeaking ? VyomanTheme.primaryIndigo : VyomanTheme.emeraldGreen,
                                width: 2,
                              ),
                            ),
                            child: Icon(
                              _isAiSpeaking ? Icons.graphic_eq : Icons.mic,
                              color: _isAiSpeaking ? VyomanTheme.primaryIndigo : VyomanTheme.emeraldGreen,
                              size: 36,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _isAiSpeaking ? 'AI Interviewer speaking...' : 'Listening to your response (${_speechDurationSeconds}s)',
                            style: TextStyle(
                              color: _isAiSpeaking ? const Color(0xFF94A3B8) : VyomanTheme.emeraldGreen,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const Spacer(),

                    // Question Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: VyomanTheme.inkSoft,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: VyomanTheme.primaryIndigo.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  _currentStage.toUpperCase(),
                                  style: const TextStyle(
                                    color: VyomanTheme.primaryIndigo,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            currentQ['question']!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              height: 1.45,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Controls: Complete Turn / Next Question
                    if (_isCandidateRecording)
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: VyomanTheme.primaryIndigo,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: _completeCandidateAnswer,
                          icon: const Icon(Icons.check, size: 18),
                          label: Text(
                            _currentTurn == _totalTurns ? 'Complete Interview & View Report' : 'Save Answer & Next Question',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
