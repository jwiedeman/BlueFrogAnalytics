import { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const [activeHeadings, setActiveHeadings] = useState<string[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    const sections = Object.keys(sectionRefs.current);

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const id = entry.target.id;

        if (entry.isIntersecting) {
          setActiveHeadings((prev) =>
            prev.includes(id) ? prev : [...prev, id]
          );
        } else {
          setActiveHeadings((prev) => prev.filter((heading) => heading !== id));
        }
      });
    };

    let observer: IntersectionObserver | null = new IntersectionObserver(
      observerCallback,
      {
        root: null,
        rootMargin: "0px",
        threshold: 1,
      }
    );

    sections.forEach((sectionId) => {
      const element = sectionRefs.current[sectionId];
      if (element) {
        observer?.observe(element);
      }
    });

    return () => {
      observer?.disconnect();
      observer = null;
    };
  }, []);

  const addSectionRef = (id: string, ref: HTMLElement | null) => {
    if (ref) {
      sectionRefs.current[id] = ref;
    }
  };

  return (
    <section className="py-32">
      <div className="container">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Privacy Policy</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="mt-10 text-balance text-4xl font-bold md:text-5xl lg:text-6xl">
          Privacy Policy
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-xl font-medium">
          Blue Frog Analytics respects your privacy and is committed to protecting
          your personal data.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button size="lg" href="/contact">
            Contact Us
          </Button>
          <Button variant="outline" size="lg" href="/privacy-choices">
            Privacy Choices
          </Button>
        </div>
        <div className="relative mt-16 grid gap-10 lg:mt-28 lg:grid-cols-5">
          <aside className="top-10 flex h-fit w-full max-w-56 flex-col gap-5 lg:sticky">
            <div>
              <h2 className="font-semibold">Topics</h2>
              <ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
                <li>Data Collection</li>
                <li>Usage</li>
                <li>Your Rights</li>
              </ul>
            </div>
            <div>
              <h2 className="font-semibold">Last Updated</h2>
              <time className="text-sm text-muted-foreground">April 15, 2024</time>
            </div>
          </aside>
          <div className="gap-6 lg:col-span-3">
            <div className="max-w-prose lg:mx-auto">
              <div className="prose dark:prose-invert prose-h3:mt-14 prose-h3:scroll-mt-14 prose-h3:text-lg mt-12">
                <h3
                  id="info"
                  ref={(ref) => addSectionRef("info", ref)}
                  className="text-2xl font-semibold"
                >
                  Information We Collect
                </h3>
                <ul>
                  <li>
                    <strong>Account Information:</strong> Your name, email, and other
                    details provided when registering or contacting us.
                  </li>
                  <li>
                    <strong>Usage Data:</strong> Information on how you interact with our
                    site, including pages visited, actions taken, IP address, browser
                    type, device identifiers, and timestamps.
                  </li>
                  <li>
                    <strong>Cookies and Tracking:</strong> Technologies such as cookies and
                    pixels to monitor site usage and enhance functionality.
                  </li>
                  <li>
                    <strong>Third-Party Data:</strong> Data from advertising partners and
                    analytics providers to enhance our service.
                  </li>
                </ul>
                <h3
                  id="use"
                  ref={(ref) => addSectionRef("use", ref)}
                  className="text-2xl font-semibold"
                >
                  How We Use Your Information
                </h3>
                <ul>
                  <li>To provide, maintain, and improve our services.</li>
                  <li>For analyzing user behavior to enhance features and develop new services.</li>
                  <li>To personalize content and advertisements based on your interests.</li>
                  <li>For detecting and preventing security or technical issues.</li>
                  <li>To comply with applicable laws and regulations.</li>
                </ul>
                <h3
                  id="sharing"
                  ref={(ref) => addSectionRef("sharing", ref)}
                  className="text-2xl font-semibold"
                >
                  Sharing Your Information
                </h3>
                <ul>
                  <li>
                    <strong>Service Providers:</strong> Vendors assisting with analytics, hosting, and marketing.
                  </li>
                  <li>
                    <strong>Advertising Partners:</strong> Third parties for targeted advertising and measuring ad effectiveness.
                  </li>
                  <li>
                    <strong>Business Transfers:</strong> Information may be transferred in connection with a merger, acquisition, or asset sale.
                  </li>
                  <li>
                    <strong>Legal Compliance:</strong> When required by law or to protect our rights and safety.
                  </li>
                </ul>
                <h3
                  id="cookies"
                  ref={(ref) => addSectionRef("cookies", ref)}
                  className="text-2xl font-semibold"
                >
                  Cookies and Tracking Technologies
                </h3>
                <p>
                  We use cookies and similar tracking technologies to enhance your browsing
                  experience, analyze trends, and administer the website. You can control cookies
                  through your browser settings; disabling cookies may affect site functionality.
                </p>
                <h3
                  id="retention"
                  ref={(ref) => addSectionRef("retention", ref)}
                  className="text-2xl font-semibold"
                >
                  Data Retention
                </h3>
                <p>
                  We retain personal information only as long as necessary to fulfill the purposes outlined in this policy or as required by law.
                </p>
                <h3
                  id="rights"
                  ref={(ref) => addSectionRef("rights", ref)}
                  className="text-2xl font-semibold"
                >
                  Your Rights and Choices
                </h3>
                <ul>
                  <li>Access, update, or delete your information through your account dashboard.</li>
                  <li>Unsubscribe from marketing communications via provided links.</li>
                  <li>Manage cookies through browser settings.</li>
                  <li>Exercise data rights available in your jurisdiction, such as data portability or erasure.</li>
                </ul>
                <h3
                  id="security"
                  ref={(ref) => addSectionRef("security", ref)}
                  className="text-2xl font-semibold"
                >
                  Security
                </h3>
                <p>
                  We employ robust security measures to protect your personal data. However, no security method is entirely foolproof, and we cannot guarantee absolute security.
                </p>
                <h3
                  id="children"
                  ref={(ref) => addSectionRef("children", ref)}
                  className="text-2xl font-semibold"
                >
                  Children’s Privacy
                </h3>
                <p>
                  Our services are not intended for individuals under the age of 13, and we do not knowingly collect data from children.
                </p>
                <h3
                  id="international"
                  ref={(ref) => addSectionRef("international", ref)}
                  className="text-2xl font-semibold"
                >
                  International Data Transfers
                </h3>
                <p>
                  Your information may be processed in countries outside your own, including the United States. We ensure appropriate safeguards are in place for these transfers.
                </p>
                <h3
                  id="updates"
                  ref={(ref) => addSectionRef("updates", ref)}
                  className="text-2xl font-semibold"
                >
                  Policy Updates
                </h3>
                <p>
                  We may periodically update this policy. Significant changes will be communicated clearly via our website or direct notifications.
                </p>
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>Need Help?</AlertTitle>
                  <AlertDescription>
                    If you have questions or concerns regarding this policy or our data practices, please <a href="/contact">contact us</a>.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
          <nav className="sticky top-10 hidden h-fit lg:block">
            <p className="text-sm text-muted-foreground">ON THIS PAGE</p>
            <ul className="mt-1.5 text-xs text-muted-foreground">
              {[
                { id: "info", label: "Information We Collect" },
                { id: "use", label: "How We Use" },
                { id: "sharing", label: "Sharing" },
                { id: "cookies", label: "Cookies" },
                { id: "retention", label: "Data Retention" },
                { id: "rights", label: "Your Rights" },
                { id: "security", label: "Security" },
                { id: "children", label: "Children" },
                { id: "international", label: "International" },
                { id: "updates", label: "Updates" },
              ].map((section) => (
                <li key={section.id}>
                  <a
                    className={cn(
                      "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                      activeHeadings.includes(section.id)
                        ? "border-primary text-primary font-medium"
                        : "text-muted-foreground hover:text-primary"
                    )}
                    href={`#${section.id}`}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
};

export { PrivacyPolicy };
