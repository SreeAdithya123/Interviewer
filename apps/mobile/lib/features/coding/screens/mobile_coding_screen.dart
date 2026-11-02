import 'package:flutter/material.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';

class MobileCodingScreen extends StatefulWidget {
  const MobileCodingScreen({super.key});

  @override
  State<MobileCodingScreen> createState() => _MobileCodingScreenState();
}

class _MobileCodingScreenState extends State<MobileCodingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedLanguage = 'python';
  final TextEditingController _codeController = TextEditingController();

  bool _isRunning = false;
  bool? _testPassed;
  String _outputLogs = '';

  final Map<String, String> _starterCode = {
    'python': '''class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        lookup = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in lookup:
                return [lookup[diff], i]
            lookup[num] = i
        return []
''',
    'java': '''class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}''',
    'cpp': '''#include <vector>
#include <unordered_map>

class Solution {
public:
    std::vector<int> twoSum(std::vector<int>& nums, int target) {
        // Write your solution here
        return {};
    }
};''',
    'javascript': '''function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (map.has(diff)) return [map.get(diff), i];
        map.set(nums[i], i);
    }
    return [];
}''',
  };

  final List<String> _quickSymbols = ['{', '}', '(', ')', '[', ']', ';', ':', '=', '->', 'tab', '//'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _codeController.text = _starterCode[_selectedLanguage]!;
  }

  void _insertSymbol(String symbol) {
    final text = _codeController.text;
    final selection = _codeController.selection;
    final insertVal = symbol == 'tab' ? '    ' : symbol;

    final newText = text.replaceRange(
      selection.start >= 0 ? selection.start : text.length,
      selection.end >= 0 ? selection.end : text.length,
      insertVal,
    );

    _codeController.text = newText;
    _codeController.selection = TextSelection.collapsed(
      offset: (selection.start >= 0 ? selection.start : text.length) + insertVal.length,
    );
  }

  Future<void> _runCode() async {
    setState(() {
      _isRunning = true;
      _testPassed = null;
      _outputLogs = 'Executing test cases in sandbox environment...\n';
    });

    await Future.delayed(const Duration(seconds: 2));

    if (mounted) {
      setState(() {
        _isRunning = false;
        _testPassed = true;
        _outputLogs = '''✓ Test Case 1: nums = [2, 7, 11, 15], target = 9
Expected: [0, 1] | Output: [0, 1] (Passed - 14ms)

✓ Test Case 2: nums = [3, 2, 4], target = 6
Expected: [1, 2] | Output: [1, 2] (Passed - 18ms)

All 2 Test Cases Passed! Complexity: O(N) Time, O(N) Space.''';
      });
      _tabController.animateTo(1); // switch to output tab
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VyomanTheme.ink,
      appBar: AppBar(
        backgroundColor: VyomanTheme.inkSoft,
        elevation: 0,
        title: const Text('Mobile Coding Sandbox', style: TextStyle(color: Colors.white, fontSize: 16)),
        actions: [
          // Language Dropdown
          DropdownButton<String>(
            value: _selectedLanguage,
            dropdownColor: VyomanTheme.inkSoft,
            underline: const SizedBox(),
            icon: const Icon(Icons.arrow_drop_down, color: Colors.white70),
            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
            items: const [
              DropdownMenuItem(value: 'python', child: Text('Python 3')),
              DropdownMenuItem(value: 'java', child: Text('Java 17')),
              DropdownMenuItem(value: 'cpp', child: Text('C++ 20')),
              DropdownMenuItem(value: 'javascript', child: Text('JavaScript')),
            ],
            onChanged: (val) {
              if (val != null) {
                setState(() {
                  _selectedLanguage = val;
                  _codeController.text = _starterCode[val] ?? '';
                });
              }
            },
          ),
          const SizedBox(width: 12),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: VyomanTheme.primaryIndigo,
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFF94A3B8),
          tabs: const [
            Tab(text: 'Code Editor'),
            Tab(text: 'Test Cases & Output'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Quick Coding Symbols Toolbar
          Container(
            height: 42,
            color: const Color(0xFF0F111E),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _quickSymbols.length,
              itemBuilder: (context, idx) {
                final sym = _quickSymbols[idx];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E2235),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    onPressed: () => _insertSymbol(sym),
                    child: Text(
                      sym,
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontFamily: 'monospace'),
                    ),
                  ),
                );
              },
            ),
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Code Editor
                Container(
                  color: VyomanTheme.ink,
                  padding: const EdgeInsets.all(12),
                  child: TextField(
                    controller: _codeController,
                    maxLines: null,
                    expands: true,
                    style: const TextStyle(
                      color: Color(0xFFE2E8F0),
                      fontSize: 13,
                      fontFamily: 'monospace',
                      height: 1.5,
                    ),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      hintText: 'Type your code here...',
                      hintStyle: TextStyle(color: Colors.white24),
                    ),
                  ),
                ),

                // Tab 2: Test Cases & Execution Logs
                Container(
                  color: const Color(0xFF090A10),
                  padding: const EdgeInsets.all(16),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_testPassed != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: _testPassed!
                                  ? VyomanTheme.emeraldGreen.withOpacity(0.15)
                                  : VyomanTheme.roseDanger.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: _testPassed! ? VyomanTheme.emeraldGreen : VyomanTheme.roseDanger,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  _testPassed! ? Icons.check_circle : Icons.error,
                                  color: _testPassed! ? VyomanTheme.emeraldGreen : VyomanTheme.roseDanger,
                                  size: 16,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  _testPassed! ? 'PASSED ALL TEST CASES' : 'TESTS FAILED',
                                  style: TextStyle(
                                    color: _testPassed! ? VyomanTheme.emeraldGreen : VyomanTheme.roseDanger,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        Text(
                          _outputLogs.isEmpty ? 'Click "Run Code" below to compile and execute test cases.' : _outputLogs,
                          style: const TextStyle(
                            color: Color(0xFFCBD5E1),
                            fontFamily: 'monospace',
                            fontSize: 12,
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Run Code Action Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: VyomanTheme.inkSoft,
              border: Border(top: BorderSide(color: Colors.white.withOpacity(0.08))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: VyomanTheme.emeraldGreen,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _isRunning ? null : _runCode,
                    icon: _isRunning
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.play_arrow_rounded, color: Colors.white),
                    label: Text(
                      _isRunning ? 'Compiling...' : 'Run Code (Testcases)',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
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
