import 'package:flutter/material.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';
import 'package:vyoman_interviewer/features/dualcam/screens/qr_scanner_screen.dart';
import 'package:vyoman_interviewer/features/standalone/screens/mobile_preflight_screen.dart';

class HomeModeScreen extends StatelessWidget {
  const HomeModeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VyomanTheme.surfacePorcelain,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: VyomanTheme.ink,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.rocket_launch, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 10),
            const Text(
              'Vyoman Interviewer',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: VyomanTheme.primaryIndigo.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: VyomanTheme.primaryIndigo.withOpacity(0.2)),
            ),
            child: const Row(
              children: [
                Icon(Icons.cloud_done, color: VyomanTheme.primaryIndigo, size: 14),
                SizedBox(width: 4),
                Text(
                  'Connected',
                  style: TextStyle(color: VyomanTheme.primaryIndigo, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select Interview Mode',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: VyomanTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Choose how you want to use Vyoman on your mobile device today:',
              style: TextStyle(fontSize: 13, color: VyomanTheme.textMuted),
            ),
            const SizedBox(height: 20),

            // Card 1: Primary PC Companion Extension
            _ModeCard(
              isPrimary: true,
              badgeText: 'PRIMARY PC EXTENSION',
              badgeColor: VyomanTheme.primaryIndigo,
              icon: Icons.qr_code_scanner,
              title: 'PC Companion · Dual-Cam Proctor',
              description:
                  'Taking an interview on your laptop or PC? Scan the on-screen QR code to pair your phone as a wireless 45° angle desk proctor.',
              benefits: const [
                'Live 45° desk, keyboard & screen monitoring',
                'Real-time heartbeat & battery telemetry to PC',
                'Screen keep-awake enabled automatically',
              ],
              buttonText: 'Scan PC QR to Pair',
              buttonIcon: Icons.camera_alt_outlined,
              buttonColor: VyomanTheme.primaryIndigo,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const QRScannerScreen()),
                );
              },
            ),

            const SizedBox(height: 20),

            // Card 2: Standalone Mobile Station
            _ModeCard(
              isPrimary: false,
              badgeText: 'MOBILE-ONLY STATION',
              badgeColor: VyomanTheme.emeraldGreen,
              icon: Icons.phone_android,
              title: 'Standalone Mobile Interview',
              description:
                  'Don’t have a laptop or computer? Take your complete proctored mock interview right here on your phone.',
              benefits: const [
                'Front-camera face proctoring & voice wave VAD',
                'Conversational AI speech synthesis',
                'Instant National Percentile & Rubric Report',
              ],
              buttonText: 'Start Mobile Interview',
              buttonIcon: Icons.play_arrow_rounded,
              buttonColor: VyomanTheme.ink,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const MobilePreflightScreen()),
                );
              },
            ),

            const SizedBox(height: 28),

            // College Placement Readiness Info Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: VyomanTheme.borderLight),
              ),
              child: const Row(
                children: [
                  Icon(Icons.verified_user_outlined, color: VyomanTheme.secondarySky, size: 24),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Calibrated National Rubrics',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: VyomanTheme.textPrimary),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Mock interviews are benchmarked against 104,200+ campus placement candidates nationwide.',
                          style: TextStyle(fontSize: 11, color: VyomanTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  final bool isPrimary;
  final String badgeText;
  final Color badgeColor;
  final IconData icon;
  final String title;
  final String description;
  final List<String> benefits;
  final String buttonText;
  final IconData buttonIcon;
  final Color buttonColor;
  final VoidCallback onTap;

  const _ModeCard({
    required this.isPrimary,
    required this.badgeText,
    required this.badgeColor,
    required this.icon,
    required this.title,
    required this.description,
    required this.benefits,
    required this.buttonText,
    required this.buttonIcon,
    required this.buttonColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isPrimary ? VyomanTheme.primaryIndigo.withOpacity(0.4) : VyomanTheme.borderLight,
          width: isPrimary ? 2 : 1,
        ),
        boxShadow: isPrimary
            ? [
                BoxShadow(
                  color: VyomanTheme.primaryIndigo.withOpacity(0.08),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  badgeText,
                  style: TextStyle(
                    color: badgeColor,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const Spacer(),
              Icon(icon, color: badgeColor, size: 24),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: VyomanTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            description,
            style: const TextStyle(
              fontSize: 12,
              color: VyomanTheme.textMuted,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),

          // Benefits List
          ...benefits.map((b) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Icon(Icons.check_circle_rounded, color: badgeColor, size: 14),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        b,
                        style: const TextStyle(fontSize: 11, color: VyomanTheme.textPrimary),
                      ),
                    ),
                  ],
                ),
              )),

          const SizedBox(height: 16),

          // Action Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: buttonColor,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: onTap,
              icon: Icon(buttonIcon, color: Colors.white, size: 18),
              label: Text(
                buttonText,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
