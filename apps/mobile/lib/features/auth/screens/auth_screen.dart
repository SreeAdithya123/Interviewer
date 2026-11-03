import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:vyoman_interviewer/core/theme/vyoman_theme.dart';
import 'package:vyoman_interviewer/features/shell/screens/app_shell_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Controllers
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _otpController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isOtpSent = false;
  bool _isLoading = false;
  bool _isSignUpMode = false;
  String? _errorMessage;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  // 1. Send 6-digit OTP code to email
  Future<void> _sendOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = 'Please enter a valid email address.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final supabase = Supabase.instance.client;
      await supabase.auth.signInWithOtp(
        email: email,
        shouldCreateUser: true,
      );
      setState(() {
        _isOtpSent = true;
        _successMessage = 'Verification code sent to $email';
      });
    } catch (e) {
      setState(() => _errorMessage = 'Error sending code: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // 2. Verify 6-digit OTP code (OtpType.email)
  Future<void> _verifyOtp() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();

    if (otp.length < 6) {
      setState(() => _errorMessage = 'Please enter the 6-digit code from your email.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final supabase = Supabase.instance.client;
      final res = await supabase.auth.verifyOTP(
        email: email,
        token: otp,
        type: OtpType.email,
      );

      if (res.session != null) {
        _onAuthSuccess();
      } else {
        setState(() => _errorMessage = 'Verification failed. Please try again.');
      }
    } catch (e) {
      setState(() => _errorMessage = 'Invalid code: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // 3. Email & Password Login / Signup
  Future<void> _handlePasswordAuth() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setState(() => _errorMessage = 'Password must be at least 6 characters.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final supabase = Supabase.instance.client;

      if (_isSignUpMode) {
        final res = await supabase.auth.signUp(
          email: email,
          password: password,
        );
        if (res.session != null) {
          _onAuthSuccess();
        } else {
          setState(() {
            _successMessage = 'Account created! Please check your email for confirmation.';
          });
        }
      } else {
        final res = await supabase.auth.signInWithPassword(
          email: email,
          password: password,
        );
        if (res.session != null) {
          _onAuthSuccess();
        }
      }
    } catch (e) {
      setState(() => _errorMessage = e.toString().replaceAll('AuthException: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // 4. Instant 1-Tap Verified Demo Student Sign-In
  Future<void> _signInAsDemoStudent() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = 'Connecting to Supabase...';
    });

    try {
      final supabase = Supabase.instance.client;
      final res = await supabase.auth.signInWithPassword(
        email: 'demo.student@vyoman.tech',
        password: 'Vyoman@2026!',
      );

      if (res.session != null) {
        _onAuthSuccess();
      } else {
        setState(() => _errorMessage = 'Demo sign-in failed. Please try again.');
      }
    } catch (e) {
      setState(() => _errorMessage = 'Supabase sign-in error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _onAuthSuccess() {
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const AppShellScreen()),
      );
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VyomanTheme.surfacePorcelain,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Vyoman Brand Header
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: VyomanTheme.ink,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: VyomanTheme.primaryIndigo.withOpacity(0.18),
                        blurRadius: 18,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 36),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Vyoman Interviewer',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: VyomanTheme.textPrimary),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Connected to Supabase Cloud Database',
                  style: TextStyle(fontSize: 12, color: VyomanTheme.textMuted),
                ),
                const SizedBox(height: 24),

                // Auth Form Container
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: VyomanTheme.borderLight),
                  ),
                  child: Column(
                    children: [
                      // Auth Method Tabs
                      Container(
                        decoration: const BoxDecoration(
                          border: Border(bottom: BorderSide(color: VyomanTheme.borderLight)),
                        ),
                        child: TabBar(
                          controller: _tabController,
                          indicatorColor: VyomanTheme.primaryIndigo,
                          labelColor: VyomanTheme.primaryIndigo,
                          unselectedLabelColor: VyomanTheme.textMuted,
                          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          tabs: const [
                            Tab(text: 'Email OTP (Code)'),
                            Tab(text: 'Password'),
                          ],
                        ),
                      ),

                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_errorMessage != null)
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(10),
                                margin: const EdgeInsets.only(bottom: 14),
                                decoration: BoxDecoration(
                                  color: VyomanTheme.roseDanger.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: VyomanTheme.roseDanger.withOpacity(0.3)),
                                ),
                                child: Text(
                                  _errorMessage!,
                                  style: const TextStyle(fontSize: 11, color: VyomanTheme.roseDanger, fontWeight: FontWeight.w600),
                                ),
                              ),

                            if (_successMessage != null)
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(10),
                                margin: const EdgeInsets.only(bottom: 14),
                                decoration: BoxDecoration(
                                  color: VyomanTheme.emeraldGreen.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: VyomanTheme.emeraldGreen.withOpacity(0.3)),
                                ),
                                child: Text(
                                  _successMessage!,
                                  style: const TextStyle(fontSize: 11, color: VyomanTheme.emeraldGreen, fontWeight: FontWeight.w600),
                                ),
                              ),

                            // Shared Email Input
                            TextField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: InputDecoration(
                                labelText: 'College Email / Gmail',
                                hintText: 'student@college.edu.in',
                                prefixIcon: const Icon(Icons.mail_outline, size: 20),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              ),
                            ),
                            const SizedBox(height: 14),

                            // Tab View Dynamic Fields
                            AnimatedBuilder(
                              animation: _tabController,
                              builder: (context, _) {
                                final isOtpTab = _tabController.index == 0;

                                if (isOtpTab) {
                                  // OTP Mode
                                  if (!_isOtpSent) {
                                    return SizedBox(
                                      width: double.infinity,
                                      height: 48,
                                      child: ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: VyomanTheme.ink,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                        ),
                                        onPressed: _isLoading ? null : _sendOtp,
                                        child: _isLoading
                                            ? const SizedBox(
                                                width: 20,
                                                height: 20,
                                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                              )
                                            : const Text('Send 6-Digit Code', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                      ),
                                    );
                                  } else {
                                    return Column(
                                      children: [
                                        TextField(
                                          controller: _otpController,
                                          keyboardType: TextInputType.number,
                                          maxLength: 6,
                                          textAlign: TextAlign.center,
                                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 8),
                                          decoration: InputDecoration(
                                            hintText: '123456',
                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        SizedBox(
                                          width: double.infinity,
                                          height: 48,
                                          child: ElevatedButton(
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: VyomanTheme.primaryIndigo,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                            ),
                                            onPressed: _isLoading ? null : _verifyOtp,
                                            child: _isLoading
                                                ? const SizedBox(
                                                    width: 20,
                                                    height: 20,
                                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                                  )
                                                : const Text('Verify & Sign In', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                          ),
                                        ),
                                        TextButton(
                                          onPressed: () => setState(() => _isOtpSent = false),
                                          child: const Text('Change email', style: TextStyle(fontSize: 11, color: VyomanTheme.textMuted)),
                                        ),
                                      ],
                                    );
                                  }
                                } else {
                                  // Password Mode
                                  return Column(
                                    children: [
                                      TextField(
                                        controller: _passwordController,
                                        obscureText: true,
                                        decoration: InputDecoration(
                                          labelText: 'Password',
                                          prefixIcon: const Icon(Icons.lock_outline, size: 20),
                                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                        ),
                                      ),
                                      const SizedBox(height: 14),
                                      SizedBox(
                                        width: double.infinity,
                                        height: 48,
                                        child: ElevatedButton(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: VyomanTheme.ink,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                          ),
                                          onPressed: _isLoading ? null : _handlePasswordAuth,
                                          child: _isLoading
                                              ? const SizedBox(
                                                  width: 20,
                                                  height: 20,
                                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                                )
                                              : Text(
                                                  _isSignUpMode ? 'Create Account' : 'Sign In with Password',
                                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                                ),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      TextButton(
                                        onPressed: () => setState(() => _isSignUpMode = !_isSignUpMode),
                                        child: Text(
                                          _isSignUpMode ? 'Already have an account? Sign In' : 'New student? Create Account',
                                          style: const TextStyle(fontSize: 12, color: VyomanTheme.primaryIndigo),
                                        ),
                                      ),
                                    ],
                                  );
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // ⚡ 1-Tap Verified Demo Student Sign-In
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: VyomanTheme.primaryIndigo.withOpacity(0.3)),
                  ),
                  child: Column(
                    children: [
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.bolt, color: VyomanTheme.primaryIndigo, size: 18),
                          SizedBox(width: 6),
                          Text(
                            'Quick Evaluator Access',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: VyomanTheme.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Instant sign-in with verified Supabase student account (demo.student@vyoman.tech)',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11, color: VyomanTheme.textMuted),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: VyomanTheme.primaryIndigo, width: 1.5),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: _isLoading ? null : _signInAsDemoStudent,
                          icon: const Icon(Icons.login_rounded, size: 16, color: VyomanTheme.primaryIndigo),
                          label: const Text(
                            '1-Tap Demo Student Login',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: VyomanTheme.primaryIndigo),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
