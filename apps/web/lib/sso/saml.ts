import { SamlAuthRequest, SamlParsedAssertion, SsoConfiguration } from "./types";

/**
 * Builds a SAML 2.0 AuthnRequest for SP-initiated SSO.
 */
export function buildSamlAuthRequest(
  config: SsoConfiguration,
  relayState: string = "/app",
  origin: string = "https://vyoman.ai"
): SamlAuthRequest {
  const requestId = `_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const issueInstant = new Date().toISOString();
  const spEntityId = `${origin}/auth/sso/metadata`;
  const acsUrl = `${origin}/auth/sso/callback`;

  const authnXml = [
    `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"`,
    `  ID="${requestId}" Version="2.0" IssueInstant="${issueInstant}"`,
    `  Destination="${config.ssoUrl}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"`,
    `  AssertionConsumerServiceURL="${acsUrl}">`,
    `  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${spEntityId}</saml:Issuer>`,
    `  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>`,
    `</samlp:AuthnRequest>`,
  ].join("\n");

  const encodedSaml = Buffer.from(authnXml).toString("base64");
  const queryParams = new URLSearchParams({
    SAMLRequest: encodedSaml,
    RelayState: relayState,
  });

  const separator = config.ssoUrl.includes("?") ? "&" : "?";
  const redirectUrl = `${config.ssoUrl}${separator}${queryParams.toString()}`;

  return {
    id: requestId,
    issueInstant,
    destination: config.ssoUrl,
    issuer: spEntityId,
    redirectUrl,
  };
}

function extractAttribute(xml: string, name: string): string | undefined {
  const match = xml.match(new RegExp(`Name=["']${name}["'][^>]*>\\s*<[^>]*AttributeValue[^>]*>([^<]+)<`, "i"));
  if (match) return match[1].trim();
  const directMatch = xml.match(new RegExp(`<[^>]*${name}[^>]*>([^<]+)<`, "i"));
  return directMatch ? directMatch[1].trim() : undefined;
}

/**
 * Mock/Lightweight parser for SAML Response XML assertions.
 */
export function parseSamlAssertion(xmlString: string): SamlParsedAssertion | null {
  try {
    const nameIdMatch = xmlString.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/i) ||
      xmlString.match(/<NameID[^>]*>([^<]+)<\/NameID>/i);

    if (!nameIdMatch) return null;
    const nameId = nameIdMatch[1].trim();

    const sessionMatch = xmlString.match(/SessionIndex="([^"]+)"/i);
    const sessionIndex = sessionMatch ? sessionMatch[1] : `sess_${Date.now()}`;

    const firstName = extractAttribute(xmlString, "firstName") || extractAttribute(xmlString, "first_name");
    const lastName = extractAttribute(xmlString, "lastName") || extractAttribute(xmlString, "last_name");
    const role = extractAttribute(xmlString, "role") || "student";

    return {
      nameId,
      firstName,
      lastName,
      role,
      sessionIndex,
    };
  } catch {
    return null;
  }
}
