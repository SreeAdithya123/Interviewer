import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:vyoman_interviewer/core/config/supabase_config.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';
import 'package:vyoman_interviewer/features/home/screens/home_mode_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase Client
  try {
    await Supabase.initialize(
      url: SupabaseConfig.url,
      anonKey: SupabaseConfig.anonKey,
    );
  } catch (e) {
    debugPrint('Supabase initialization note: $e');
  }

  runApp(const VyomanApp());
}

class VyomanApp extends StatelessWidget {
  const VyomanApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vyoman Interviewer',
      debugShowCheckedModeBanner: false,
      theme: VyomanTheme.lightTheme,
      darkTheme: VyomanTheme.darkTheme,
      themeMode: ThemeMode.light,
      home: const HomeModeScreen(),
    );
  }
}
