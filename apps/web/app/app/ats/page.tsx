import { AtsSettingsClient } from "./AtsSettingsClient";

export const metadata = {
  title: "ATS Integrations | Vyoman",
  description: "Enterprise ATS Webhook configurations for Greenhouse, Lever, and Darwinbox.",
};

export default function AtsPage() {
  return <AtsSettingsClient />;
}
