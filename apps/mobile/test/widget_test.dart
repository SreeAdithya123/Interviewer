import 'package:flutter_test/flutter_test.dart';
import 'package:vyoman_interviewer/main.dart';

void main() {
  testWidgets('Vyoman App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const VyomanApp());
    expect(find.text('Vyoman Interviewer'), findsOneWidget);
  });
}
