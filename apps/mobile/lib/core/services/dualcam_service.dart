import 'dart:async';
import 'package:battery_plus/battery_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

class DualCamService {
  final String interviewId;
  final String token;
  final Battery _battery = Battery();

  RealtimeChannel? _channel;
  Timer? _heartbeatTimer;
  int _heartbeatCount = 0;
  int _batteryLevel = 100;
  bool _isActive = false;

  DualCamService({required this.interviewId, required this.token});

  bool get isActive => _isActive;
  int get heartbeatCount => _heartbeatCount;
  int get batteryLevel => _batteryLevel;

  Future<void> startStreaming({
    required Function(int count, int battery) onHeartbeat,
    Function(String error)? onError,
  }) async {
    try {
      // 1. Enable Wakelock so phone does not sleep or dim during interview
      await WakelockPlus.enable();

      // 2. Fetch battery level
      try {
        _batteryLevel = await _battery.batteryLevel;
      } catch (_) {
        _batteryLevel = 95;
      }

      // 3. Connect to Supabase Realtime broadcast channel
      final supabase = Supabase.instance.client;
      _channel = supabase.channel('vyoman_dualcam_$interviewId');

      _channel?.subscribe((status, [error]) {
        if (status == RealtimeSubscribeStatus.subscribed) {
          _isActive = true;
          _sendTelemetryBroadcast('connected');
        }
      });

      // 4. Start 3-second heartbeat loop
      _heartbeatTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
        _heartbeatCount++;
        try {
          _batteryLevel = await _battery.batteryLevel;
        } catch (_) {}

        await _sendTelemetryBroadcast('streaming_active');
        onHeartbeat(_heartbeatCount, _batteryLevel);
      });
    } catch (e) {
      if (onError != null) onError(e.toString());
    }
  }

  Future<void> _sendTelemetryBroadcast(String status) async {
    if (_channel == null) return;

    try {
      await _channel!.sendBroadcastMessage(
        event: 'heartbeat',
        payload: {
          'token': token,
          'interviewId': interviewId,
          'status': status,
          'timestamp': DateTime.now().toIso8601String(),
          'battery': _batteryLevel,
          'angleConfidence': 94,
          'deviceType': 'android_mobile_companion',
        },
      );
    } catch (_) {
      // Non-blocking telemetry
    }
  }

  Future<void> stopStreaming() async {
    _isActive = false;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;

    if (_channel != null) {
      await _sendTelemetryBroadcast('disconnected');
      await Supabase.instance.client.removeChannel(_channel!);
      _channel = null;
    }

    await WakelockPlus.disable();
  }
}
