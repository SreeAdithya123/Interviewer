import 'package:flutter/material.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';
import 'package:vyoman_interviewer/features/standalone/screens/mobile_preflight_screen.dart';

class DrivesScreen extends StatefulWidget {
  const DrivesScreen({super.key});

  @override
  State<DrivesScreen> createState() => _DrivesScreenState();
}

class _DrivesScreenState extends State<DrivesScreen> {
  final List<Map<String, dynamic>> _drives = [
    {
      'id': 'drv_1',
      'company': 'Google',
      'role': 'Software Development Engineer - 1',
      'ctc': '₹32.0 LPA',
      'type': 'Product Tier-1',
      'eligibility': 'CGPA ≥ 8.0 · CSE, IT · 2026 Batch',
      'deadline': 'In 3 days',
      'color': const Color(0xFFEA4335),
      'registered': true,
      'badgeColor': VyomanTheme.primaryIndigo,
    },
    {
      'id': 'drv_2',
      'company': 'Infosys SP',
      'role': 'Specialist Programmer (Digital)',
      'ctc': '₹9.5 LPA',
      'type': 'Digital Specialist',
      'eligibility': 'CGPA ≥ 7.0 · All Circuit Branches',
      'deadline': 'In 5 days',
      'color': const Color(0xFF007CC3),
      'registered': false,
      'badgeColor': VyomanTheme.emeraldGreen,
    },
    {
      'id': 'drv_3',
      'company': 'TCS Prime',
      'role': 'Prime Systems Software Engineer',
      'ctc': '₹9.0 LPA',
      'type': 'Core Prime Track',
      'eligibility': 'CGPA ≥ 7.0 · No active backlogs',
      'deadline': 'Next week',
      'color': const Color(0xFF1E293B),
      'registered': false,
      'badgeColor': VyomanTheme.secondarySky,
    },
    {
      'id': 'drv_4',
      'company': 'Cognizant',
      'role': 'GenC Elevate Developer',
      'ctc': '₹7.0 LPA',
      'type': 'Premium Services',
      'eligibility': 'CGPA ≥ 6.5 · B.Tech / MCA',
      'deadline': 'Active now',
      'color': const Color(0xFF0971B8),
      'registered': true,
      'badgeColor': VyomanTheme.amberWarning,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VyomanTheme.surfacePorcelain,
      appBar: AppBar(
        title: const Text('Campus Placement Drives'),
        elevation: 0,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: _drives.length,
        itemBuilder: (context, index) {
          final drive = _drives[index];
          final isRegistered = drive['registered'] as bool;

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: VyomanTheme.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: (drive['color'] as Color).withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            (drive['company'] as String).substring(0, 1),
                            style: TextStyle(
                              color: drive['color'] as Color,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              drive['company'] as String,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: VyomanTheme.textPrimary),
                            ),
                            Text(
                              drive['type'] as String,
                              style: const TextStyle(fontSize: 11, color: VyomanTheme.textMuted),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Text(
                      drive['ctc'] as String,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: VyomanTheme.emeraldGreen),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  drive['role'] as String,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: VyomanTheme.textPrimary),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.school_outlined, size: 14, color: VyomanTheme.textMuted),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        drive['eligibility'] as String,
                        style: const TextStyle(fontSize: 11, color: VyomanTheme.textMuted),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          side: BorderSide(
                            color: isRegistered ? VyomanTheme.emeraldGreen : VyomanTheme.borderLight,
                          ),
                        ),
                        onPressed: () {
                          setState(() {
                            drive['registered'] = !isRegistered;
                          });
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                !isRegistered
                                    ? 'Registered for ${drive['company']} Drive!'
                                    : 'Registration cancelled.',
                              ),
                            ),
                          );
                        },
                        child: Text(
                          isRegistered ? 'Registered ✓' : 'Register Now',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isRegistered ? VyomanTheme.emeraldGreen : VyomanTheme.textPrimary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: VyomanTheme.ink,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const MobilePreflightScreen()),
                          );
                        },
                        icon: const Icon(Icons.play_arrow_rounded, size: 16, color: Colors.white),
                        label: const Text(
                          'Practice Mock',
                          style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
