import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

const LAST_UPDATED_DE = "24. März 2026";
const LAST_UPDATED_EN = "March 24, 2026";

export function Privacy() {
  const { i18n } = useTranslation();
  const isDE = i18n.language?.startsWith("de");

  if (!isDE) {
    return <PrivacyEN />;
  }
  return <PrivacyDE />;
}

function BackButton({ label }: { label: string }) {
  return (
    <Link href="/">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </Link>
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

            <h3 className="text-base font-semibold mt-4 mb-2">3.4 Nutzungsstatistiken (Umami Analytics)</h3>
            <p>
              Die Anwendung verwendet Umami Analytics, ein datenschutzfreundliches
              Webanalyse-Werkzeug. Umami erhebt keine personenbezogenen Daten, setzt keine Cookies
              und speichert keine IP-Adressen. Es werden ausschließlich anonymisierte Nutzungsdaten
              (z. B. aufgerufene Seiten, Gerätekategorie, Browsertyp) erhoben, die keine
              Rückschlüsse auf einzelne Personen erlauben. Das Analyse-Skript wird über die
              Manus-Infrastruktur ausgeliefert; es findet keine Datenübertragung an externe
              Drittanbieter statt.
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
            <p>
              Die Anwendung wird auf der Infrastruktur von Manus (Butterfly Effect Pte. Ltd.)
              betrieben. Sämtliche Daten werden auf Servern innerhalb der Europäischen Union bzw.
              des Europäischen Wirtschaftsraums gespeichert und verarbeitet. Manus agiert als
              Auftragsverarbeiter im Sinne des Art. 28 DSGVO.
            </p>
          </div>

          {/* 5 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">5. Weitergabe von Daten an Dritte</h2>
            <p>
              Personenbezogene Daten werden nicht an Dritte verkauft oder zu Werbezwecken
              weitergegeben. Eine Weitergabe erfolgt ausschließlich, soweit dies zur Erbringung des
              Dienstes technisch erforderlich ist (Auftragsverarbeitung durch Manus) oder eine
              gesetzliche Verpflichtung besteht.
            </p>
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
              Funktionen eingeführt werden oder sich die Rechtslage ändert. Das Datum der letzten
              Aktualisierung ist oben angegeben. Wesentliche Änderungen werden den Nutzerinnen und
              Nutzern über die Anwendung mitgeteilt.
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

            <h3 className="text-base font-semibold mt-4 mb-2">3.4 Usage Statistics (Umami Analytics)</h3>
            <p>
              The application uses Umami Analytics, a privacy-friendly web analytics tool. Umami
              does not collect personal data, does not set cookies, and does not store IP addresses.
              Only anonymised usage data (e.g. pages visited, device category, browser type) is
              collected, which does not allow conclusions to be drawn about individual persons. The
              analytics script is delivered via the Manus infrastructure; no data is transferred to
              external third parties.
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
            <p>
              The application is operated on the infrastructure of Manus (Butterfly Effect Pte. Ltd.).
              All data is stored and processed on servers within the European Union or the European
              Economic Area. Manus acts as a data processor within the meaning of Art. 28 GDPR.
            </p>
          </div>

          {/* 5 */}
          <div>
            <h2 className="text-xl font-semibold mb-3">5. Disclosure of Data to Third Parties</h2>
            <p>
              Personal data is not sold to third parties or shared for advertising purposes. Data is
              only disclosed to the extent technically necessary for the provision of the service
              (data processing by Manus) or where required by law.
            </p>
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
              introduced or the legal situation changes. The date of the last update is shown above.
              Material changes will be communicated to users via the application.
            </p>
          </div>

        </section>
      </div>
    </div>
  );
}
