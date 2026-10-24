/**
 * SAML 2.0 & Enterprise Single Sign-On (SSO) Suite Types.
 * Enables enterprise corporate recruiters and universities to authenticate
 * via Okta, Microsoft Azure Active Directory (Entra ID), and Google Workspace SAML.
 */

export type SsoProvider = "okta" | "azure_ad" | "google_workspace" | "generic_saml";

export interface SsoConfiguration {
  id: string;
  collegeOrOrgId: string;
  orgName: string;
  domain: string; // e.g. "sasi.ac.in" or "infosys.com"
  provider: SsoProvider;
  entityId: string; // IdP Entity ID / Issuer URI
  ssoUrl: string; // Single Sign-On Login URL (HTTP-Redirect)
  x509Certificate: string; // Base64 X.509 signing certificate
  enabled: boolean;
  enforceSso: boolean;
  createdAt: string;
}

export interface SamlParsedAssertion {
  nameId: string; // User email
  firstName?: string;
  lastName?: string;
  role?: string;
  department?: string;
  sessionIndex: string;
}

export interface SamlAuthRequest {
  id: string;
  issueInstant: string;
  destination: string;
  issuer: string;
  redirectUrl: string;
}
