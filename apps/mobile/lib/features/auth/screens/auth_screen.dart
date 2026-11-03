import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  final TextEditingController _linkController = TextEditingController();

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

  // 1. Send Magic Link / OTP code to email
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
        emailRedirectTo: 'io.supabase.flutter://login-callback',
        shouldCreateUser: true,
      );
      setState(() {
        _isOtpSent = true;
        _successMessage = 'Sign-in email sent to $email';
      });
    } catch (e) {
      setState(() => _errorMessage = 'Error sending email: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // 2. Handle pasted email sign-in link or direct URL
  Future<void> _handlePastedLink(String input) async {
    final clean = input.trim();
    if (clean.isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final supabase = Supabase.instance.client;

      // Check if user pasted a 6-digit code
      if (clean.length == 6 && int.tryParse(clean) != null) {
        _otpController.text = clean;
        await _verifyOtp();
        return;
      }

      final uri = Uri.tryParse(clean);
      if (uri == null) {
        setState(() => _errorMessage = 'Invalid link format. Please paste the full URL from your email.');
        return;
      }

      // Try getSessionFromUrl directly (for deep link with fragments or query params)
      try {
        await supabase.auth.getSessionFromUrl(uri);
        _onAuthSuccess();
        return;
      } catch (_) {}

      // Extract token or code from query parameters
      final token = uri.queryParameters['token'] ?? uri.queryParameters['code'];
      final email = uri.queryParameters['email'] ?? _emailController.text.trim();

      if (token != null && token.isNotEmpty) {
        final type = uri.queryParameters['type'] ?? 'magiclink';
        AuthResponse? res;
        try {
          res = await supabase.auth.verifyOTP(
            email: email,
            token: token,
            type: type == 'signup'
                ? OtpType.signup
                : type == 'email'
                    ? OtpType.email
                    : OtpType.magiclink,
          );
        } catch (_) {
          res = await supabase.auth.verifyOTP(
            email: email,
            token: token,
            type: OtpType.magiclink,
          );
        }

        if (res.session != null) {
          _onAuthSuccess();
          return;
        }
      }

      setState(() => _errorMessage =
          'Could not authenticate with this link. Tap the "Log In" button in your email on this phone, or use Password Login.');
    } catch (e) {
      setState(() => _errorMessage = 'Failed to process link: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // 3. Quick paste from clipboard
  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final text = data?.text?.trim() ?? '';
    if (text.isEmpty) {
      setState(() => _errorMessage = 'Clipboard is empty. Copy the link from your email first.');
      return;
    }
    await _handlePastedLink(text);
  }

  // 4. Verify 6-digit OTP code (with automatic fallback to magiclink/signup)
  Future<void> _verifyOtp() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();

    if (otp.length < 6) {
      setState(() => _errorMessage = 'Please enter the 6-digit code or paste your sign-in link.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final supabase = Supabase.instance.client;
      AuthResponse? res;
      try {
        res = await supabase.auth.verifyOTP(
          email: email,
          token: otp,
          type: OtpType.email,
        );
      } catch (_) {
        try {
          res = await supabase.auth.verifyOTP(
            email: email,
            token: otp,
            type: OtpType.magiclink,
          );
        } catch (_) {
          res = await supabase.auth.verifyOTP(
            email: email,
            token: otp,
            type: OtpType.signup,
          );
        }
      }

      if (res.session != null) {
        _onAuthSuccess();
      } else {
        setState(() => _errorMessage = 'Verification failed. Please check your email or use Password Login.');
      }
    } catch (e) {
      setState(() => _errorMessage = 'Invalid code: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // 5. Email & Password Login / Signup
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

  // 6. Instant 1-Tap Verified Demo Student Sign-In
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
    _linkController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
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
                            Tab(text: 'Email Link / OTP'),
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
                                hintText: 'name@gmail.com',
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
                                  // Magic Link & OTP Mode
                                  if (!_isOtpSent) {
                                    return SizedBox(
                                      width: double.infinity,
                                      height: 48,
                                      child: ElevatedButton.icon(
                                        icon: const Icon(Icons.send_rounded, size: 16, color: Colors.white),
                                        label: _isLoading
                                            ? const SizedBox(
                                                width: 20,
                                                height: 20,
                                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                              )
                                            : const Text('Send Sign-in Link & Code', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: VyomanTheme.ink,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                        ),
                                        onPressed: _isLoading ? null : _sendOtp,
                                      ),
                                    );
                                  } else {
                                    return Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Instructions Banner
                                        Container(
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFEEF2FF),
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(color: const Color(0xFFC7D2FE)),
                                          ),
                                          child: const Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Icon(Icons.mark_email_read_outlined, size: 16, color: VyomanTheme.primaryIndigo),
                                                  SizedBox(width: 6),
                                                  Text(
                                                    'Check your inbox!',
                                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: VyomanTheme.primaryIndigo),
                                                  ),
                                                ],
                                              ),
                                              SizedBox(height: 4),
                                              Text(
                                                '1. Tap the "Log In" button in your email to open the app automatically.\n'
                                                '2. OR: Copy the link address from the email and tap "Paste Link" below.\n'
                                                '3. OR: Enter the 6-digit code if shown.',
                                                style: TextStyle(fontSize: 11, color: Color(0xFF4338CA), height: 1.4),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(height: 12),

                                        // 📋 Paste & Sign In Button
                                        SizedBox(
                                          width: double.infinity,
                                          height: 46,
                                          child: ElevatedButton.icon(
                                            icon: const Icon(Icons.content_paste_rounded, size: 16, color: Colors.white),
                                            label: _isLoading
                                                ? const SizedBox(
                                                    width: 18,
                                                    height: 18,
                                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                                  )
                                                : const Text('Paste Link from Email & Sign In', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: VyomanTheme.emeraldGreen,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                            ),
                                            onPressed: _isLoading ? null : _pasteFromClipboard,
                                          ),
                                        ),
                                        const SizedBox(height: 14),

                                        // Divider
                                        const Row(
                                          children: [
                                            Expanded(child: Divider()),
                                            Padding(
                                              padding: EdgeInsets.symmetric(horizontal: 8),
                                              child: Text('OR ENTER 6-DIGIT CODE', style: TextStyle(fontSize: 10, color: VyomanTheme.textMuted, fontWeight: FontWeight.bold)),
                                            ),
                                            Expanded(child: Divider()),
                                          ],
                                        ),
                                        const SizedBox(height: 10),

                                        // 6-digit input
                                        TextField(
                                          controller: _otpController,
                                          keyboardType: TextInputType.number,
                                          maxLength: 6,
                                          textAlign: TextAlign.center,
                                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 6),
                                          decoration: InputDecoration(
                                            hintText: '123456',
                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        SizedBox(
                                          width: double.infinity,
                                          height: 44,
                                          child: OutlinedButton(
                                            style: OutlinedButton.styleFrom(
                                              side: const BorderSide(color: VyomanTheme.primaryIndigo),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                            ),
                                            onPressed: _isLoading ? null : _verifyOtp,
                                            child: const Text('Verify Code', style: TextStyle(color: VyomanTheme.primaryIndigo, fontWeight: FontWeight.bold)),
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Center(
                                          child: TextButton(
                                            onPressed: () => setState(() => _isOtpSent = false),
                                            child: const Text('Change email / Resend', style: TextStyle(fontSize: 11, color: VyomanTheme.textMuted)),
                                          ),
                                        ),
                                      ],
                                    );
                                  }
                                } else {
                                  // Password Mode
                                  return Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      TextField(
                                        controller: _passwordController,
                                        obscureText: true,
                                        decoration: InputDecoration(
                                          labelText: 'Password',
                                          hintText: '••••••••',
                                          prefixIcon: const Icon(Icons.lock_outline, size: 20),
                                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      const Text(
                                        'Default password for verified accounts: Vyoman@2026!',
                                        style: TextStyle(fontSize: 10, color: VyomanTheme.textMuted),
                                      ),
                                      const SizedBox(height: 12),
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
                                      Center(
                                        child: TextButton(
                                          onPressed: () => setState(() => _isSignUpMode = !_isSignUpMode),
                                          child: Text(
                                            _isSignUpMode ? 'Already have an account? Sign In' : 'New student? Create Account',
                                            style: const TextStyle(fontSize: 12, color: VyomanTheme.primaryIndigo),
                                          ),
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
                            'Quick Demo Access (Zero Setup)',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: VyomanTheme.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Pre-configured candidate profile with access to all interview tracks.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11, color: VyomanTheme.textMuted),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            backgroundColor: VyomanTheme.primaryIndigo.withOpacity(0.06),
                            side: const BorderSide(color: VyomanTheme.primaryIndigo),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: _isLoading ? null : _signInAsDemoStudent,
                          child: const Text(
                            'One-Tap Demo Student Login',
                            style: TextStyle(color: VyomanTheme.primaryIndigo, fontWeight: FontWeight.bold, fontSize: 13),
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
