import { SsoConfiguration } from "./types";

export const ENROLLED_SSO_DOMAINS: SsoConfiguration[] = [
  {
    id: "sso_sasi",
    collegeOrOrgId: "col_sasi_tech",
    orgName: "SASI Institute of Technology & Engineering",
    domain: "sasi.ac.in",
    provider: "google_workspace",
    entityId: "https://accounts.google.com/o/saml2?idpid=C01sasi",
    ssoUrl: "https://accounts.google.com/o/saml2/idp?idpid=C01sasi",
    x509Certificate: "MIIDdDCCAlygAwIBAgIGAY8sasiKey...",
    enabled: true,
    enforceSso: false,
    createdAt: "2026-10-15T00:00:00Z",
  },
  {
    id: "sso_tcs",
    collegeOrOrgId: "org_tcs_campus",
    orgName: "Tata Consultancy Services (Corporate Campus)",
    domain: "tcs.com",
    provider: "okta",
    entityId: "http://www.okta.com/exk8tcsCorporate",
    ssoUrl: "https://tcs.okta.com/app/tcs_vyoman_1/sso/saml",
    x509Certificate: "MIIDpDCCAoygAwIBAgIGAZ...tcsOktaCert",
    enabled: true,
    enforceSso: true,
    createdAt: "2026-10-18T00:00:00Z",
  },
  {
    id: "sso_infosys",
    collegeOrOrgId: "org_infy_recruitment",
    orgName: "Infosys Campus Recruitment",
    domain: "infosys.com",
    provider: "azure_ad",
    entityId: "https://sts.windows.net/infy-tenant-id/",
    ssoUrl: "https://login.microsoftonline.com/infy-tenant-id/saml2",
    x509Certificate: "MIIC8DCCAdigAwIBAgIQ...azureEntraCert",
    enabled: true,
    enforceSso: true,
    createdAt: "2026-10-20T00:00:00Z",
  },
];

/**
 * Resolves whether an email domain requires or supports enterprise SSO.
 */
export function resolveSsoForEmail(
  email: string,
  configs: SsoConfiguration[] = ENROLLED_SSO_DOMAINS
): SsoConfiguration | null {
  if (!email || !email.includes("@")) return null;
  const domain = email.split("@")[1].toLowerCase().trim();
  const match = configs.find((c) => c.enabled && c.domain.toLowerCase() === domain);
  return match || null;
}
