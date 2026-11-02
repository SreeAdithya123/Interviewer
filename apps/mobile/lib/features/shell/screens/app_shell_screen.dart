import 'package:flutter/material.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';
import 'package:vyoman_interviewer/features/chat/screens/ai_coach_screen.dart';
import 'package:vyoman_interviewer/features/coding/screens/mobile_coding_screen.dart';
import 'package:vyoman_interviewer/features/drives/screens/drives_screen.dart';
import 'package:vyoman_interviewer/features/home/screens/home_mode_screen.dart';

class AppShellScreen extends StatefulWidget {
  const AppShellScreen({super.key});

  @override
  State<AppShellScreen> createState() => _AppShellScreenState();
}

class _AppShellScreenState extends State<AppShellScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeModeScreen(),
    DrivesScreen(),
    MobileCodingScreen(),
    AiCoachScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: VyomanTheme.borderLight, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: VyomanTheme.primaryIndigo,
          unselectedItemColor: VyomanTheme.textMuted,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard),
              label: 'Interviews',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.business_center_outlined),
              activeIcon: Icon(Icons.business_center),
              label: 'Drives',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.code_outlined),
              activeIcon: Icon(Icons.code),
              label: 'Sandbox',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.chat_bubble_outline),
              activeIcon: Icon(Icons.chat_bubble),
              label: 'AI Coach',
            ),
          ],
        ),
      ),
    );
  }
}
