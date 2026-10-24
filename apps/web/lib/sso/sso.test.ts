import { describe, expect, it } from "vitest";
import { ENROLLED_SSO_DOMAINS, resolveSsoForEmail } from "./domainRouter";
import { buildSamlAuthRequest, parseSamlAssertion } from "./saml";

describe("SAML 2.0 & Enterprise SSO Suite", () => {
  it("resolves enterprise SSO configuration by email domain", () => {
    const sasiSso = resolveSsoForEmail("adithya@sasi.ac.in");
    expect(sasiSso).toBeDefined();
    expect(sasiSso?.orgName).toContain("SASI Institute");
    expect(sasiSso?.provider).toBe("google_workspace");

    const tcsSso = resolveSsoForEmail("recruiter@tcs.com");
    expect(tcsSso?.provider).toBe("okta");

    const unknown = resolveSsoForEmail("student@gmail.com");
    expect(unknown).toBeNull();
  });

  it("builds valid SAML 2.0 AuthnRequest with Base64 payload", () => {
    const sasiConfig = ENROLLED_SSO_DOMAINS[0];
    const req = buildSamlAuthRequest(sasiConfig, "/app/drives");

    expect(req.id).toContain("_req_");
    expect(req.destination).toBe(sasiConfig.ssoUrl);
    expect(req.redirectUrl).toContain("SAMLRequest=");
    expect(req.redirectUrl).toContain("RelayState=");
  });

  it("parses SAML Response XML assertion", () => {
    const sampleXml = `
      <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
        <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" SessionIndex="sess_99182">
          <saml:Subject>
            <saml:NameID>priya.sharma@sasi.ac.in</saml:NameID>
          </saml:Subject>
          <saml:AttributeStatement>
            <saml:Attribute Name="firstName"><saml:AttributeValue>Priya</saml:AttributeValue></saml:Attribute>
            <saml:Attribute Name="role"><saml:AttributeValue>student</saml:AttributeValue></saml:Attribute>
          </saml:AttributeStatement>
        </saml:Assertion>
      </samlp:Response>
    `;

    const parsed = parseSamlAssertion(sampleXml);
    expect(parsed?.nameId).toBe("priya.sharma@sasi.ac.in");
    expect(parsed?.firstName).toBe("Priya");
    expect(parsed?.role).toBe("student");
    expect(parsed?.sessionIndex).toBe("sess_99182");
  });
});
