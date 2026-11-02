import 'package:flutter/material.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';

class AiCoachScreen extends StatefulWidget {
  const AiCoachScreen({super.key});

  @override
  State<AiCoachScreen> createState() => _AiCoachScreenState();
}

class _AiCoachScreenState extends State<AiCoachScreen> {
  final List<Map<String, String>> _messages = [
    {
      'sender': 'ai',
      'text': 'Hello! I am your Vyoman AI Placement Coach. What topic or campus company would you like to prepare for today?',
    },
  ];

  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isTyping = false;

  final List<String> _quickPrompts = [
    'How do I structure answers with the STAR method?',
    'Explain LRU Cache O(1) design with code',
    'Top SQL queries asked in campus placements',
    'Common sliding window edge cases in DSA',
  ];

  void _sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    setState(() {
      _messages.add({'sender': 'user', 'text': text.trim()});
      _isTyping = true;
    });

    _inputController.clear();
    _scrollToBottom();

    await Future.delayed(const Duration(seconds: 1));

    String aiReply = _generateCoachReply(text);

    if (mounted) {
      setState(() {
        _isTyping = false;
        _messages.add({'sender': 'ai', 'text': aiReply});
      });
      _scrollToBottom();
    }
  }

  String _generateCoachReply(String prompt) {
    final lower = prompt.toLowerCase();
    if (lower.contains('star')) {
      return '''The STAR framework is essential for behavioral rounds:

1. Situation: Set the scene (e.g. "During our college capstone project...").
2. Task: The explicit challenge or goal you were assigned.
3. Action: The exact technical steps YOU took (use "I", not "we").
4. Result: Quantifiable outcome (e.g. "reduced latency by 35%").

Tip: Keep the answer between 60 to 90 seconds.''';
    } else if (lower.contains('lru')) {
      return '''To implement an LRU (Least Recently Used) Cache with O(1) operations:

- Combine a Hash Map (lookup in O(1)) with a Doubly Linked List (re-ordering nodes in O(1)).
- On get(key): Retrieve the node via map and move it to the head of the DLL.
- On put(key, val): If at capacity, remove the tail node from DLL and delete from map.''';
    } else if (lower.contains('sql')) {
      return '''Top 3 SQL queries frequently tested in campus technical interviews:

1. Nth Highest Salary:
   SELECT DISTINCT salary FROM Employee ORDER BY salary DESC LIMIT 1 OFFSET N-1;
2. Duplicate Records:
   SELECT email, COUNT(*) FROM Users GROUP BY email HAVING COUNT(*) > 1;
3. Department-wise Max Salary with Window Functions:
   SELECT name, salary, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as rank FROM Employee;''';
    } else {
      return 'Great question! In campus placement interviews, always start by clarifying constraints, discussing brute-force vs optimized time complexity, and testing boundary edge cases (empty inputs, duplicates, overflow) before writing code.';
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VyomanTheme.surfacePorcelain,
      appBar: AppBar(
        title: const Text('Placement AI Coach'),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Quick Prompt Chips
          Container(
            height: 48,
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _quickPrompts.length,
              itemBuilder: (context, idx) {
                final prompt = _quickPrompts[idx];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    backgroundColor: Colors.white,
                    side: const BorderSide(color: VyomanTheme.borderLight),
                    label: Text(prompt, style: const TextStyle(fontSize: 11, color: VyomanTheme.textPrimary)),
                    onPressed: () => _sendMessage(prompt),
                  ),
                );
              },
            ),
          ),

          // Messages List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, idx) {
                final msg = _messages[idx];
                final isUser = msg['sender'] == 'user';

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                    decoration: BoxDecoration(
                      color: isUser ? VyomanTheme.ink : Colors.white,
                      borderRadius: BorderRadius.circular(16).copyWith(
                        bottomRight: isUser ? const Radius.circular(0) : const Radius.circular(16),
                        bottomLeft: !isUser ? const Radius.circular(0) : const Radius.circular(16),
                      ),
                      border: Border.all(
                        color: isUser ? Colors.transparent : VyomanTheme.borderLight,
                      ),
                    ),
                    child: Text(
                      msg['text']!,
                      style: TextStyle(
                        fontSize: 13,
                        color: isUser ? Colors.white : VyomanTheme.textPrimary,
                        height: 1.45,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          if (_isTyping)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('AI Coach is typing...', style: TextStyle(fontSize: 11, color: VyomanTheme.textMuted)),
              ),
            ),

          // Input Bar
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: VyomanTheme.borderLight)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputController,
                    onSubmitted: _sendMessage,
                    decoration: InputDecoration(
                      hintText: 'Ask anything about placements...',
                      hintStyle: const TextStyle(fontSize: 12, color: VyomanTheme.textMuted),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: const BorderSide(color: VyomanTheme.borderLight),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  style: IconButton.styleFrom(
                    backgroundColor: VyomanTheme.primaryIndigo,
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.send_rounded, size: 18),
                  onPressed: () => _sendMessage(_inputController.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
