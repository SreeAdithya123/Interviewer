import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:vyoman_interviewer/core/config/supabase_config.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';
import 'package:vyoman_interviewer/features/auth/screens/auth_screen.dart';
import 'package:vyoman_interviewer/features/auth/screens/reset_password_screen.dart';
import 'package:vyoman_interviewer/features/shell/screens/app_shell_screen.dart';

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
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    bool isInitialized = false;
    try {
      final _ = Supabase.instance.client;
      isInitialized = true;
    } catch (_) {
      isInitialized = false;
    }

    if (!isInitialized) {
      return const AuthScreen();
    }

    return StreamBuilder<AuthState>(
      stream: Supabase.instance.client.auth.onAuthStateChange,
      builder: (context, snapshot) {
        if (snapshot.hasData && snapshot.data!.event == AuthChangeEvent.passwordRecovery) {
          return const ResetPasswordScreen();
        }
        final session = Supabase.instance.client.auth.currentSession;
        if (session != null) {
          return const AppShellScreen();
        }
        return const AuthScreen();
      },
    );
  }
}
