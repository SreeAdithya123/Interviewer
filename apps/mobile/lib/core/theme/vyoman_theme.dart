import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class VyomanTheme {
  // Brand Color Palette
  static const Color ink = Color(0xFF090A10);
  static const Color inkSoft = Color(0xFF131522);
  static const Color surfacePorcelain = Color(0xFFF8F9FC);
  static const Color surfaceCard = Colors.white;
  static const Color primaryIndigo = Color(0xFF4F46E5);
  static const Color secondarySky = Color(0xFF0284C7);
  static const Color emeraldGreen = Color(0xFF059669);
  static const Color amberWarning = Color(0xFFD97706);
  static const Color roseDanger = Color(0xFFDC2626);
  static const Color textMuted = Color(0xFF64748B);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color borderLight = Color(0xFFE2E8F0);

  static ThemeData get lightTheme {
    final baseFont = GoogleFonts.plusJakartaSansTextTheme();

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: surfacePorcelain,
      colorScheme: ColorScheme.light(
        primary: primaryIndigo,
        secondary: secondarySky,
        surface: surfaceCard,
        error: roseDanger,
        onPrimary: Colors.white,
        onSurface: textPrimary,
      ),
      textTheme: baseFont.copyWith(
        headlineLarge: GoogleFonts.spaceGrotesk(
          fontSize: 28,
          fontWeight: FontWeight.w700,
          color: textPrimary,
          letterSpacing: -0.5,
        ),
        headlineMedium: GoogleFonts.spaceGrotesk(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: textPrimary,
          letterSpacing: -0.3,
        ),
        titleLarge: GoogleFonts.spaceGrotesk(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        titleMedium: baseFont.titleMedium?.copyWith(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        bodyLarge: baseFont.bodyLarge?.copyWith(
          fontSize: 14,
          color: textPrimary,
        ),
        bodyMedium: baseFont.bodyMedium?.copyWith(
          fontSize: 13,
          color: textPrimary,
        ),
        bodySmall: baseFont.bodySmall?.copyWith(
          fontSize: 11,
          color: textMuted,
        ),
      ),
      cardTheme: CardThemeData(
        color: surfaceCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: borderLight, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: ink,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.plusJakartaSans(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          side: const BorderSide(color: borderLight, width: 1),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.plusJakartaSans(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: surfacePorcelain,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: textPrimary),
        titleTextStyle: GoogleFonts.spaceGrotesk(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    final baseFont = GoogleFonts.plusJakartaSansTextTheme(
      ThemeData(brightness: Brightness.dark).textTheme,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: ink,
      colorScheme: ColorScheme.dark(
        primary: primaryIndigo,
        secondary: secondarySky,
        surface: inkSoft,
        error: roseDanger,
        onPrimary: Colors.white,
        onSurface: Colors.white,
      ),
      textTheme: baseFont.copyWith(
        headlineLarge: GoogleFonts.spaceGrotesk(
          fontSize: 28,
          fontWeight: FontWeight.w700,
          color: Colors.white,
          letterSpacing: -0.5,
        ),
        headlineMedium: GoogleFonts.spaceGrotesk(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: Colors.white,
          letterSpacing: -0.3,
        ),
        titleLarge: GoogleFonts.spaceGrotesk(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
        titleMedium: baseFont.titleMedium?.copyWith(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
        bodyLarge: baseFont.bodyLarge?.copyWith(
          fontSize: 14,
          color: Colors.white,
        ),
        bodyMedium: baseFont.bodyMedium?.copyWith(
          fontSize: 13,
          color: const Color(0xFFCBD5E1),
        ),
        bodySmall: baseFont.bodySmall?.copyWith(
          fontSize: 11,
          color: const Color(0xFF94A3B8),
        ),
      ),
      cardTheme: CardThemeData(
        color: inkSoft,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF1E2235), width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
    );
  }
}
