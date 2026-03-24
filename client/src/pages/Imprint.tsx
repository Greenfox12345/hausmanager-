import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Imprint() {
  const { i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const isDE = i18n.language.startsWith("de");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {isDE ? "Zurück" : "Back"}
        </Button>

        {isDE ? (
          <>
            <h1 className="text-3xl font-bold mb-2">Impressum</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Angaben gemäß § 5 TMG
            </p>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Verantwortlich</h2>
              <p className="leading-relaxed">
                Sebastian Flierl<br />
                c/o COCENTER<br />
                Koppoldstr. 1<br />
                86551 Aichach<br />
                Deutschland
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Kontakt</h2>
              <p>
                E-Mail:{" "}
                <a
                  href="mailto:greenfoxhaushalt@gmail.com"
                  className="underline text-primary"
                >
                  greenfoxhaushalt@gmail.com
                </a>
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Hinweis zur Impressumspflicht
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                Dieses Angebot ist ein privates, nicht-kommerzielles Projekt ohne
                Gewinnerzielungsabsicht. Es werden keine Waren oder
                Dienstleistungen angeboten und keine Einnahmen erzielt.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Haftungsausschluss
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                Trotz sorgfältiger inhaltlicher Kontrolle übernehme ich keine
                Haftung für die Inhalte externer Links. Für den Inhalt der
                verlinkten Seiten sind ausschließlich deren Betreiber
                verantwortlich.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Datenschutz</h2>
              <p className="leading-relaxed text-muted-foreground">
                Informationen zum Datenschutz findest du in der{" "}
                <button
                  onClick={() => setLocation("/privacy")}
                  className="underline text-primary"
                >
                  Datenschutzerklärung
                </button>
                .
              </p>
            </section>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-2">Legal Notice</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Information according to § 5 TMG (German Telemedia Act)
            </p>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Responsible Party</h2>
              <p className="leading-relaxed">
                Sebastian Flierl<br />
                c/o COCENTER<br />
                Koppoldstr. 1<br />
                86551 Aichach<br />
                Germany
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Contact</h2>
              <p>
                Email:{" "}
                <a
                  href="mailto:greenfoxhaushalt@gmail.com"
                  className="underline text-primary"
                >
                  greenfoxhaushalt@gmail.com
                </a>
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Note on Legal Notice Obligation
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                This service is a private, non-commercial project without any
                profit motive. No goods or services are offered and no revenue
                is generated.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Disclaimer of Liability
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                Despite careful content review, I assume no liability for the
                content of external links. The operators of linked pages are
                solely responsible for their content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Privacy</h2>
              <p className="leading-relaxed text-muted-foreground">
                For information on data protection, please refer to the{" "}
                <button
                  onClick={() => setLocation("/privacy")}
                  className="underline text-primary"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
