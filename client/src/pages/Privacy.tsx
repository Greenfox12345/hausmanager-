import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

const LAST_UPDATED_DE = "28. März 2026";
const LAST_UPDATED_EN = "March 28, 2026";

export function Privacy() {
  const { i18n } = useTranslation();
  const isDE = i18n.language?.startsWith("de");

  if (!isDE) {
    return <PrivacyEN />;
  }
  return <PrivacyDE />;
}

function BackButton({ label }: { label: string }) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  return (
    <Button variant="ghost" size="sm" className="mb-6 -ml-2" onClick={handleBack}>
      <ArrowLeft className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}

function PrivacyDE() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 pb-24">
        <BackButton label="Zurück zur Startseite" />

        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Stand: {LAST_UPDATED_DE}</p>

        <section className="prose prose-sm max-w-none space-y-8 text-foreground">

          {/* 1 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">1. Verantwortlicher</h2>
            <p>
              Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
            </p>
            <address className="not-italic mt-3 space-y-0.5 text-sm bg-muted rounded-lg p-4">
              <p className="font-medium">Sebastian Flierl</p>
              <p>c/o COCENTER</p>
              <p>Koppoldstr. 1</p>
              <p>86551 Aichach</p>
              <p>Deutschland</p>
              <p className="mt-2">
                E-Mail:{" "}
                <a href="mailto:greenfoxhaushalt@gmail.com" className="underline text-primary">
                  greenfoxhaushalt@gmail.com
                </a>
              </p>
            </address>
            <p className="mt-3 text-sm text-muted-foreground">
              Ein Datenschutzbeauftragter ist nicht bestellt, da die Voraussetzungen des § 38 BDSG
              (mindestens 20 ständig mit der automatisierten Verarbeitung personenbezogener Daten
              beschäftigte Personen) nicht erfüllt sind.
            </p>
          </div>

          {/* 2 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">2. Allgemeines zur Datenverarbeitung</h2>
            <p>
              Der Haushaltsmanager ist eine nicht-kommerzielle Webanwendung zur gemeinsamen
              Verwaltung von Haushalten. Personenbezogene Daten werden nur erhoben, soweit dies zur
              Bereitstellung der Funktionen der Anwendung erforderlich ist. Die Verarbeitung erfolgt
              auf Grundlage der DSGVO sowie des Bundesdatenschutzgesetzes (BDSG).
            </p>
          </div>

          {/* 3 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">3. Erhobene Daten und Verarbeitungszwecke</h2>

            <h3 className="text-base font-semibold mt-4 mb-2">3.1 Registrierung und Anmeldung</h3>
            <p>
              Zur Nutzung der Anwendung ist eine Registrierung erforderlich. Dabei werden folgende
              Daten erhoben: E-Mail-Adresse, Benutzername sowie ein verschlüsseltes Passwort. Diese
              Daten werden ausschließlich zur Authentifizierung und zur Bereitstellung des
              personalisierten Dienstes verarbeitet.
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserfüllung).
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">3.2 Haushaltsdaten</h3>
            <p>
              Im Rahmen der Nutzung werden haushaltsbezogene Daten gespeichert, die Nutzerinnen und
              Nutzer selbst eingeben: Aufgaben, Einkaufslisten, Kalendereinträge, Inventargegenstände,
              Ausleihanfragen sowie Projektdaten. Diese Daten werden ausschließlich zur Erbringung der
              Anwendungsfunktionen verarbeitet und sind nur für Mitglieder des jeweiligen Haushalts
              einsehbar.
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserfüllung).
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">3.3 Hochgeladene Dateien (Fotos)</h3>
            <p>
              Nutzerinnen und Nutzer können beim Abschluss von Aufgaben Fotos hochladen. Diese
              Dateien werden verschlüsselt auf Servern der Manus-Infrastruktur (S3-kompatibler
              Objektspeicher) gespeichert. Fotos sind ausschließlich für Haushaltsmitglieder
              zugänglich und werden nicht an Dritte weitergegeben.
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserfüllung).
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">3.4 Nutzungsstatistiken (Manus Analytics / Umami)</h3>
            <p>
              Die Anwendung wird auf der Manus-Plattform betrieben, die ein datenschutzfreundliches
              Webanalyse-System (Umami) einsetzt. Umami erhebt keine personenbezogenen Daten, setzt
              keine Cookies und speichert keine IP-Adressen. Es werden ausschließlich anonymisierte
              Nutzungsdaten (z. B. aufgerufene Seiten, Gerätekategorie, Browsertyp) erfasst, die
              keine Rückschlüsse auf einzelne Personen erlauben. Das Analyse-Skript wird über die
              Manus-eigene Infrastruktur ausgeliefert (Endpunkt:{" "}
              <code className="text-xs bg-muted px-1 rounded">manus-analytics.com</code> bzw.{" "}
              <code className="text-xs bg-muted px-1 rounded">manus.im</code>); es findet keine
              Datenübertragung an externe Drittanbieter statt.
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse an der Verbesserung der Anwendung). Da keine personenbezogenen
              Daten verarbeitet werden, ist eine Einwilligung nicht erforderlich.
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">3.5 Server-Logdaten</h3>
            <p>
              Bei jedem Zugriff auf die Anwendung werden technische Zugriffsdaten (IP-Adresse,
              Zeitstempel, aufgerufene URL, HTTP-Statuscode) in Server-Logdateien gespeichert. Diese
              Daten dienen ausschließlich der Sicherstellung des technischen Betriebs und werden nach
              spätestens 30 Tagen gelöscht.
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Rechtsgrundlage:</span> Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse an der Sicherstellung des Betriebs).
            </p>
          </div>

          {/* 4 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">4. Hosting und technische Infrastruktur</h2>

            <h3 className="text-base font-semibold mt-4 mb-2">4.1 Manus-Plattform (Auftragsverarbeiter)</h3>
            <p>
              Die Anwendung wird auf der Infrastruktur von <strong>Manus</strong> (Butterfly Effect
              Pte. Ltd.) betrieben. Manus agiert als Auftragsverarbeiter im Sinne des Art. 28 DSGVO.
              Informationen zur Datenverarbeitung durch Manus finden Sie in der{" "}
              <a
                href="https://manus.im/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Datenschutzerklärung von Manus
              </a>{" "}
              sowie im{" "}
              <a
                href="https://manus.im/dpa"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Auftragsverarbeitungsvertrag (DPA)
              </a>
              .
            </p>
            <p className="mt-3">
              Im Rahmen des Plattformbetriebs werden von Manus folgende Dienste eingesetzt, die beim
              Aufruf der Anwendung im Browser des Nutzers aktiv werden können:
            </p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-2 border-b border-border font-semibold">Dienst / Anbieter</th>
                    <th className="text-left p-2 border-b border-l border-border font-semibold">Domain(s)</th>
                    <th className="text-left p-2 border-b border-l border-border font-semibold">Zweck</th>
                    <th className="text-left p-2 border-b border-l border-border font-semibold">Datenschutz</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b border-border">Manus CDN</td>
                    <td className="p-2 border-b border-l border-border font-mono text-xs">manuscdn.com</td>
                    <td className="p-2 border-b border-l border-border">Auslieferung statischer Assets (JS, CSS, Bilder) der Anwendung</td>
                    <td className="p-2 border-b border-l border-border">
                      <a href="https://manus.im/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">manus.im/privacy</a>
                    </td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="p-2 border-b border-border">Manus Analytics (Umami)</td>
                    <td className="p-2 border-b border-l border-border font-mono text-xs">manus-analytics.com</td>
                    <td className="p-2 border-b border-l border-border">Anonymisierte Nutzungsstatistiken (keine personenbezogenen Daten, keine Cookies)</td>
                    <td className="p-2 border-b border-l border-border">
                      <a href="https://manus.im/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">manus.im/privacy</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b border-border">Amplitude Analytics</td>
                    <td className="p-2 border-b border-l border-border font-mono text-xs">amplitude.com</td>
                    <td className="p-2 border-b border-l border-border">Produktanalyse der Manus-Plattform (nicht der Anwendungsdaten); wird von Manus eingebunden</td>
                    <td className="p-2 border-b border-l border-border">
                      <a href="https://amplitude.com/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">amplitude.com/privacy</a>
                    </td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="p-2 border-b border-border">Google Fonts / gstatic</td>
                    <td className="p-2 border-b border-l border-border font-mono text-xs">fonts.googleapis.com,{" "}fonts.gstatic.com</td>
                    <td className="p-2 border-b border-l border-border">Laden von Schriftarten für die Manus-Plattform-Oberfläche; beim Aufruf wird die IP-Adresse des Nutzers an Google übermittelt</td>
                    <td className="p-2 border-b border-l border-border">
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">policies.google.com/privacy</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">Plausible Analytics</td>
                    <td className="p-2 border-l border-border font-mono text-xs">plausible.io</td>
                    <td className="p-2 border-l border-border">Datenschutzfreundliche Webanalyse der Manus-Plattform (keine Cookies, keine personenbezogenen Daten)</td>
                    <td className="p-2 border-l border-border">
                      <a href="https://plausible.io/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">plausible.io/privacy</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Die oben genannten Dienste (mit Ausnahme des Manus CDN) werden von Manus als
              Plattformbetreiber eingebunden und liegen außerhalb des direkten Einflussbereichs des
              Verantwortlichen dieser Anwendung. Soweit dabei personenbezogene Daten (insbesondere
              IP-Adressen) an Drittanbieter außerhalb der EU/des EWR übermittelt werden, stützt sich
              die Übermittlung auf die Standardvertragsklauseln der EU-Kommission (Art. 46 Abs. 2
              lit. c DSGVO) oder einen Angemessenheitsbeschluss.
            </p>

            <h3 className="text-base font-semibold mt-6 mb-2">4.2 Datenspeicherung und Drittlandtransfer</h3>
            <p>
              Sämtliche Anwendungsdaten (Haushaltsdaten, Nutzerkonten, Fotos) werden auf Servern der
              Manus-Infrastruktur gespeichert. Die relationale Datenbank wird über{" "}
              <strong>TiDB Cloud (PingCAP)</strong> betrieben und befindet sich in der AWS-Region{" "}
              <strong>us-east-1 (Northern Virginia, USA)</strong> – also außerhalb der EU/des EWR.
            </p>
            <p className="mt-2">
              Dieser Drittlandtransfer ist durch den Abschluss von{" "}
              <strong>Standardvertragsklauseln (SCC) der EU-Kommission</strong> (Art. 46 Abs. 2 lit. c
              DSGVO) zwischen Manus und PingCAP abgesichert. TiDB Cloud ist zudem GDPR-zertifiziert
              (ISO 27001, SOC 2 Type II). Weitere Informationen finden sich in der{" "}
              <a
                href="https://www.pingcap.com/trust-hub/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Datenschutzerklärung von PingCAP
              </a>.
            </p>
          </div>

          {/* 5 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">5. Weitergabe von Daten an Dritte</h2>
            <p>
              Personenbezogene Daten werden nicht an Dritte verkauft oder zu Werbezwecken
              weitergegeben. Eine Weitergabe erfolgt ausschließlich:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>
                soweit dies zur Erbringung des Dienstes technisch erforderlich ist
                (Auftragsverarbeitung durch Manus gemäß Art. 28 DSGVO),
              </li>
              <li>
                im Rahmen der von Manus als Plattformbetreiber eingebundenen Dienste (siehe
                Abschnitt 4.1), oder
              </li>
              <li>wenn eine gesetzliche Verpflichtung zur Weitergabe besteht.</li>
            </ul>
          </div>

          {/* 6 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">6. Speicherdauer</h2>
            <p>
              Personenbezogene Daten werden gelöscht, sobald der Zweck der Verarbeitung entfällt.
              Kontodaten werden nach Löschung des Benutzerkontos entfernt. Haushaltsdaten werden
              gelöscht, sobald der Haushalt aufgelöst wird oder alle Mitglieder das Konto löschen.
              Gesetzliche Aufbewahrungspflichten bleiben unberührt.
            </p>
          </div>

          {/* 7 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">7. Betroffenenrechte</h2>
            <p>
              Als betroffene Person stehen Ihnen nach der DSGVO folgende Rechte zu:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li><span className="font-medium">Auskunftsrecht</span> (Art. 15 DSGVO)</li>
              <li><span className="font-medium">Recht auf Berichtigung</span> (Art. 16 DSGVO)</li>
              <li><span className="font-medium">Recht auf Löschung</span> (Art. 17 DSGVO)</li>
              <li><span className="font-medium">Recht auf Einschränkung der Verarbeitung</span> (Art. 18 DSGVO)</li>
              <li><span className="font-medium">Recht auf Datenübertragbarkeit</span> (Art. 20 DSGVO)</li>
              <li><span className="font-medium">Widerspruchsrecht</span> (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-3">
              Zur Ausübung Ihrer Rechte wenden Sie sich bitte per E-Mail an:{" "}
              <a href="mailto:greenfoxhaushalt@gmail.com" className="underline text-primary">
                greenfoxhaushalt@gmail.com
              </a>
            </p>
            <p className="mt-3">
              Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
              Die zuständige Aufsichtsbehörde für Bayern ist das Bayerische Landesamt für
              Datenschutzaufsicht (BayLDA), Promenade 27, 91522 Ansbach,{" "}
              <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                www.lda.bayern.de
              </a>.
            </p>
          </div>

          {/* 8 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">8. Datensicherheit</h2>
            <p>
              Die Übertragung von Daten zwischen Ihrem Browser und der Anwendung erfolgt
              ausschließlich über eine verschlüsselte HTTPS-Verbindung (TLS). Passwörter werden
              ausschließlich als gehashte Werte gespeichert und sind für den Betreiber nicht
              einsehbar.
            </p>
          </div>

          {/* 9 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">9. Änderungen dieser Datenschutzerklärung</h2>
            <p>
              Diese Datenschutzerklärung kann bei Bedarf aktualisiert werden, etwa wenn neue
              Funktionen eingeführt werden, sich die Rechtslage ändert oder die Manus-Plattform neue
              Dienste einbindet. Das Datum der letzten Aktualisierung ist oben angegeben. Wesentliche
              Änderungen werden den Nutzerinnen und Nutzern über die Anwendung mitgeteilt.
            </p>
          </div>

        </section>
      </div>
    </div>
  );
}

function PrivacyEN() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 pb-24">
        <BackButton label="Back to Home" />

        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {LAST_UPDATED_EN}</p>

        <section className="prose prose-sm max-w-none space-y-8 text-foreground">

          {/* 1 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">1. Controller</h2>
            <p>
              The controller within the meaning of the General Data Protection Regulation (GDPR) is:
            </p>
            <address className="not-italic mt-3 space-y-0.5 text-sm bg-muted rounded-lg p-4">
              <p className="font-medium">Sebastian Flierl</p>
              <p>c/o COCENTER</p>
              <p>Koppoldstr. 1</p>
              <p>86551 Aichach</p>
              <p>Germany</p>
              <p className="mt-2">
                Email:{" "}
                <a href="mailto:greenfoxhaushalt@gmail.com" className="underline text-primary">
                  greenfoxhaushalt@gmail.com
                </a>
              </p>
            </address>
            <p className="mt-3 text-sm text-muted-foreground">
              No data protection officer has been appointed, as the conditions of § 38 BDSG
              (at least 20 employees regularly engaged in automated processing of personal data)
              are not met.
            </p>
          </div>

          {/* 2 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">2. General Information</h2>
            <p>
              Haushaltsmanager is a non-commercial web application for collaborative household
              management. Personal data is only collected to the extent necessary to provide the
              application's features. Processing is carried out on the basis of the GDPR and the
              German Federal Data Protection Act (BDSG).
            </p>
          </div>

          {/* 3 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">3. Data Collected and Purposes of Processing</h2>

            <h3 className="text-base font-semibold mt-4 mb-2">3.1 Registration and Login</h3>
            <p>
              Registration is required to use the application. The following data is collected:
              email address, username, and an encrypted password. This data is processed solely for
              authentication and to provide the personalised service.
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Legal basis:</span> Art. 6(1)(b) GDPR (performance of a contract).
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">3.2 Household Data</h3>
            <p>
              During use, household-related data entered by users is stored: tasks, shopping lists,
              calendar entries, inventory items, borrow requests, and project data. This data is
              processed solely to provide the application's features and is only accessible to
              members of the respective household.
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Legal basis:</span> Art. 6(1)(b) GDPR (performance of a contract).
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">3.3 Uploaded Files (Photos)</h3>
            <p>
              Users may upload photos when completing tasks. These files are stored encrypted on
              servers within the Manus infrastructure (S3-compatible object storage). Photos are
              accessible only to household members and are not shared with third parties.
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Legal basis:</span> Art. 6(1)(b) GDPR (performance of a contract).
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">3.4 Usage Statistics (Manus Analytics / Umami)</h3>
            <p>
              The application is operated on the Manus platform, which uses a privacy-friendly web
              analytics system (Umami). Umami does not collect personal data, does not set cookies,
              and does not store IP addresses. Only anonymised usage data (e.g. pages visited, device
              category, browser type) is collected, which does not allow conclusions to be drawn about
              individual persons. The analytics script is delivered via Manus's own infrastructure
              (endpoint:{" "}
              <code className="text-xs bg-muted px-1 rounded">manus-analytics.com</code> or{" "}
              <code className="text-xs bg-muted px-1 rounded">manus.im</code>); no data is
              transferred to external third parties.
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Legal basis:</span> Art. 6(1)(f) GDPR (legitimate interest
              in improving the application). As no personal data is processed, consent is not required.
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">3.5 Server Log Data</h3>
            <p>
              Each time the application is accessed, technical access data (IP address, timestamp,
              requested URL, HTTP status code) is stored in server log files. This data is used
              solely to ensure technical operation and is deleted after a maximum of 30 days.
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Legal basis:</span> Art. 6(1)(f) GDPR (legitimate interest
              in ensuring operation).
            </p>
          </div>

          {/* 4 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">4. Hosting and Technical Infrastructure</h2>

            <h3 className="text-base font-semibold mt-4 mb-2">4.1 Manus Platform (Data Processor)</h3>
            <p>
              The application is operated on the infrastructure of <strong>Manus</strong> (Butterfly
              Effect Pte. Ltd.). Manus acts as a data processor within the meaning of Art. 28 GDPR.
              Information on data processing by Manus can be found in the{" "}
              <a
                href="https://manus.im/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Manus Privacy Policy
              </a>{" "}
              and the{" "}
              <a
                href="https://manus.im/dpa"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Data Processing Agreement (DPA)
              </a>
              .
            </p>
            <p className="mt-3">
              As part of the platform operation, Manus integrates the following third-party services
              that may become active in the user's browser when accessing the application:
            </p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-2 border-b border-border font-semibold">Service / Provider</th>
                    <th className="text-left p-2 border-b border-l border-border font-semibold">Domain(s)</th>
                    <th className="text-left p-2 border-b border-l border-border font-semibold">Purpose</th>
                    <th className="text-left p-2 border-b border-l border-border font-semibold">Privacy Policy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b border-border">Manus CDN</td>
                    <td className="p-2 border-b border-l border-border font-mono text-xs">manuscdn.com</td>
                    <td className="p-2 border-b border-l border-border">Delivery of static assets (JS, CSS, images) for the application</td>
                    <td className="p-2 border-b border-l border-border">
                      <a href="https://manus.im/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">manus.im/privacy</a>
                    </td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="p-2 border-b border-border">Manus Analytics (Umami)</td>
                    <td className="p-2 border-b border-l border-border font-mono text-xs">manus-analytics.com</td>
                    <td className="p-2 border-b border-l border-border">Anonymised usage statistics (no personal data, no cookies)</td>
                    <td className="p-2 border-b border-l border-border">
                      <a href="https://manus.im/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">manus.im/privacy</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b border-border">Amplitude Analytics</td>
                    <td className="p-2 border-b border-l border-border font-mono text-xs">amplitude.com</td>
                    <td className="p-2 border-b border-l border-border">Product analytics for the Manus platform (not application data); integrated by Manus</td>
                    <td className="p-2 border-b border-l border-border">
                      <a href="https://amplitude.com/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">amplitude.com/privacy</a>
                    </td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="p-2 border-b border-border">Google Fonts / gstatic</td>
                    <td className="p-2 border-b border-l border-border font-mono text-xs">fonts.googleapis.com,{" "}fonts.gstatic.com</td>
                    <td className="p-2 border-b border-l border-border">Loading web fonts for the Manus platform interface; the user's IP address is transmitted to Google when fonts are loaded</td>
                    <td className="p-2 border-b border-l border-border">
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">policies.google.com/privacy</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">Plausible Analytics</td>
                    <td className="p-2 border-l border-border font-mono text-xs">plausible.io</td>
                    <td className="p-2 border-l border-border">Privacy-friendly web analytics for the Manus platform (no cookies, no personal data)</td>
                    <td className="p-2 border-l border-border">
                      <a href="https://plausible.io/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">plausible.io/privacy</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              The services listed above (with the exception of the Manus CDN) are integrated by Manus
              as the platform operator and are outside the direct sphere of influence of the
              controller of this application. Where personal data (in particular IP addresses) is
              transferred to third-party providers outside the EU/EEA, the transfer is based on the
              EU Commission's Standard Contractual Clauses (Art. 46(2)(c) GDPR) or an adequacy
              decision.
            </p>

            <h3 className="text-base font-semibold mt-6 mb-2">4.2 Data Storage and Third-Country Transfer</h3>
            <p>
              All application data (household data, user accounts, photos) is stored on Manus
              infrastructure servers. The relational database is operated via{" "}
              <strong>TiDB Cloud (PingCAP)</strong> and is located in the AWS region{" "}
              <strong>us-east-1 (Northern Virginia, USA)</strong> – outside the EU/EEA.
            </p>
            <p className="mt-2">
              This third-country transfer is safeguarded by{" "}
              <strong>Standard Contractual Clauses (SCCs)</strong> of the EU Commission
              (Art. 46(2)(c) GDPR) concluded between Manus and PingCAP. TiDB Cloud is also
              GDPR-certified (ISO 27001, SOC 2 Type II). Further information is available in the{" "}
              <a
                href="https://www.pingcap.com/trust-hub/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                PingCAP Privacy Policy
              </a>.
            </p>
          </div>

          {/* 5 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">5. Disclosure of Data to Third Parties</h2>
            <p>
              Personal data is not sold to third parties or shared for advertising purposes. Data is
              only disclosed:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>
                to the extent technically necessary for the provision of the service (data processing
                by Manus pursuant to Art. 28 GDPR),
              </li>
              <li>
                in the context of services integrated by Manus as the platform operator (see
                Section 4.1), or
              </li>
              <li>where required by law.</li>
            </ul>
          </div>

          {/* 6 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">6. Retention Period</h2>
            <p>
              Personal data is deleted once the purpose of processing no longer applies. Account
              data is removed upon deletion of the user account. Household data is deleted once the
              household is dissolved or all members delete their accounts. Statutory retention
              obligations remain unaffected.
            </p>
          </div>

          {/* 7 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p>As a data subject, you have the following rights under the GDPR:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li><span className="font-medium">Right of access</span> (Art. 15 GDPR)</li>
              <li><span className="font-medium">Right to rectification</span> (Art. 16 GDPR)</li>
              <li><span className="font-medium">Right to erasure</span> (Art. 17 GDPR)</li>
              <li><span className="font-medium">Right to restriction of processing</span> (Art. 18 GDPR)</li>
              <li><span className="font-medium">Right to data portability</span> (Art. 20 GDPR)</li>
              <li><span className="font-medium">Right to object</span> (Art. 21 GDPR)</li>
            </ul>
            <p className="mt-3">
              To exercise your rights, please contact us by email at:{" "}
              <a href="mailto:greenfoxhaushalt@gmail.com" className="underline text-primary">
                greenfoxhaushalt@gmail.com
              </a>
            </p>
            <p className="mt-3">
              You also have the right to lodge a complaint with a data protection supervisory
              authority. The competent authority for Bavaria is the Bayerisches Landesamt für
              Datenschutzaufsicht (BayLDA), Promenade 27, 91522 Ansbach,{" "}
              <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                www.lda.bayern.de
              </a>.
            </p>
          </div>

          {/* 8 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">8. Data Security</h2>
            <p>
              All data transmitted between your browser and the application is encrypted using HTTPS
              (TLS). Passwords are stored exclusively as hashed values and are not accessible to the
              operator.
            </p>
          </div>

          {/* 9 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">9. Changes to this Privacy Policy</h2>
            <p>
              This privacy policy may be updated as needed, for example when new features are
              introduced, the legal situation changes, or the Manus platform integrates new services.
              The date of the last update is shown above. Material changes will be communicated to
              users via the application.
            </p>
          </div>

        </section>
      </div>
    </div>
  );
}
