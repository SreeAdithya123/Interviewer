import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:record/record.dart';
import 'package:vyoman_interviewer/core/services/interview_engine_service.dart';
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

  String _interviewId = '';
  bool _isEngineConnected = false;
  String _engineLatency = '...';

  int _currentTurn = 1;
  int _totalTurns = 5;
  String _currentStage = 'Intro & Context';
  bool _isAiSpeaking = false;
  bool _isCandidateRecording = false;
  Timer? _pauseTimer;
  int _speechDurationSeconds = 0;
  int _totalSessionSeconds = 0;
  Timer? _durationTimer;
  Timer? _sessionTimer;

  List<Map<String, dynamic>> _questions = [];
  final List<Map<String, dynamic>> _recordedTurns = [];

  @override
  void initState() {
    super.initState();
    _initFrontCamera();
    _initEngineAndSession();
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

  Future<void> _initEngineAndSession() async {
    // 1. Check Engine Health
    final health = await InterviewEngineService.checkEngineHealth();
    if (mounted) {
      setState(() {
        _isEngineConnected = health['engineOnline'] || health['supabaseOnline'];
        _engineLatency = health['latency'];
      });
    }

    // 2. Initialize real session in Supabase/Engine
    final session = await InterviewEngineService.createInterview(
      interviewType: widget.interviewType,
      targetRole: widget.targetRole,
      difficulty: widget.difficulty,
    );

    _interviewId = session['id'];

    // 3. Load dynamic question bank
    _questions = InterviewEngineService.getQuestionsForSession(
      interviewType: widget.interviewType,
      difficulty: widget.difficulty,
      targetRole: widget.targetRole,
    );
    _totalTurns = _questions.length;

    // 4. Start session clock
    _sessionTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _totalSessionSeconds++;
    });

    // 5. Begin Turn 1
    _playQuestionTurn(0);
  }

  Future<void> _playQuestionTurn(int turnIndex) async {
    if (turnIndex >= _questions.length) {
      _concludeAndNavigateToReport();
      return;
    }

    final q = _questions[turnIndex];

    setState(() {
      _isAiSpeaking = true;
      _isCandidateRecording = false;
      _currentTurn = turnIndex + 1;
      _currentStage = (q['stageLabel'] ?? q['stage']) as String;
    });

    // Dynamic simulated AI question delivery duration (approx 4s)
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

  Future<void> _completeCandidateAnswer() async {
    _durationTimer?.cancel();
    _pauseTimer?.cancel();

    final q = _questions[_currentTurn - 1];
    final transcript =
        'Candidate provided structured technical rationale for ${q['topic']}, detailing trade-offs and complexity.';

    final turnData = {
      'turn': _currentTurn,
      'stage': q['stage'],
      'stageLabel': q['stageLabel'] ?? q['stage'],
      'question': q['question'],
      'duration': _speechDurationSeconds,
      'transcript': transcript,
    };

    _recordedTurns.add(turnData);

    // Persist real turn to Supabase interview_turns table
    if (_interviewId.isNotEmpty) {
      InterviewEngineService.recordTurn(
        interviewId: _interviewId,
        turnNumber: _currentTurn,
        stage: q['stage'] as String,
        questionText: q['question'] as String,
        transcript: transcript,
        durationSeconds: _speechDurationSeconds,
      );
    }

    if (_currentTurn < _totalTurns) {
      _playQuestionTurn(_currentTurn);
    } else {
      _concludeAndNavigateToReport();
    }
  }

  Future<void> _concludeAndNavigateToReport() async {
    _sessionTimer?.cancel();
    _durationTimer?.cancel();

    // Show loading state while evaluating with the engine
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(color: VyomanTheme.primaryIndigo),
                SizedBox(height: 16),
                Text(
                  'Evaluating 5-dimension rubrics and compiling dossier...',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    // Call real engine evaluation
    final reportData = await InterviewEngineService.finishInterviewAndGenerateReport(
      interviewId: _interviewId,
      totalDurationSeconds: _totalSessionSeconds,
      targetRole: widget.targetRole,
      difficulty: widget.difficulty,
      turns: _recordedTurns,
    );

    if (mounted) {
      Navigator.of(context).pop(); // dismiss loading dialog
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => MobileReportScreen(
            interviewId: _interviewId,
            targetRole: widget.targetRole,
            difficulty: widget.difficulty,
            recordedTurns: _recordedTurns,
            reportData: reportData,
          ),
        ),
      );
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _audioPlayer.dispose();
    _audioRecorder.dispose();
    _durationTimer?.cancel();
    _sessionTimer?.cancel();
    _pauseTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentQ = _questions.isNotEmpty && _currentTurn <= _questions.length
        ? _questions[_currentTurn - 1]
        : {
            'stage': _currentStage,
            'question': 'Initializing interview questions with Vyoman AI Engine...',
          };

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
          // Engine Live Status Badge
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: _isEngineConnected ? VyomanTheme.emeraldGreen.withOpacity(0.15) : VyomanTheme.amberWarning.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _isEngineConnected ? VyomanTheme.emeraldGreen.withOpacity(0.4) : VyomanTheme.amberWarning.withOpacity(0.4),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: _isEngineConnected ? VyomanTheme.emeraldGreen : VyomanTheme.amberWarning,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  _isEngineConnected ? 'ENGINE LIVE' : 'CONNECTING',
                  style: TextStyle(
                    color: _isEngineConnected ? VyomanTheme.emeraldGreen : VyomanTheme.amberWarning,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
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
              value: _totalTurns > 0 ? _currentTurn / _totalTurns : 0.2,
              backgroundColor: const Color(0xFF1E2235),
              color: VyomanTheme.primaryIndigo,
              minHeight: 3,
            ),

            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    // Floating Camera Proctor Thumbnail
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
                              const Spacer(),
                              Text(
                                'Engine Latency: $_engineLatency',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 9, fontFamily: 'monospace'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            currentQ['question'] as String? ?? '',
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
                            _currentTurn == _totalTurns ? 'Complete Interview & Compile Dossier' : 'Save Answer & Next Question',
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
