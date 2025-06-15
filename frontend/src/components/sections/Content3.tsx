"use client";

import { Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

const Content3 = () => {
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
              <BreadcrumbPage>Accessibility Statement</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="mt-10 text-balance text-4xl font-bold md:text-5xl lg:text-6xl">
          Accessibility Statement for Blue Frog Analytics
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-xl font-medium">
          Our commitment to digital accessibility for everyone.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button size="lg" href="/contact">
            Contact Us
          </Button>
        </div>
        <div className="relative mt-16 grid gap-10 lg:mt-28 lg:grid-cols-5">
          <aside className="top-10 flex h-fit w-full max-w-56 flex-col gap-5 lg:sticky">
            <div>
              <h2 className="font-semibold">Sections</h2>
              <ul className="mt-2 flex flex-col gap-2">
                <li>
                  <p className="text-muted-foreground text-sm">Overview</p>
                </li>
                <li>
                  <p className="text-muted-foreground text-sm">Accessibility Measures</p>
                </li>
                <li>
                  <p className="text-muted-foreground text-sm">Feedback</p>
                </li>
              </ul>
            </div>
          </aside>
          <div className="gap-6 lg:col-span-3">
            <div className="max-w-prose lg:mx-auto">
              <div className="prose dark:prose-invert prose-h3:mt-14 prose-h3:scroll-mt-14 prose-h3:text-lg mt-12">
                <h2 className="text-4xl font-semibold">Overview</h2>
                <p>
                  At Blue Frog Analytics, we are deeply committed to ensuring digital accessibility for everyone, including those with disabilities. Our dedication is rooted in our belief that the web should be an inclusive and universally accessible environment.
                </p>
                <p>
                  We strive to meet and exceed compliance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards and continually incorporate innovative practices.
                </p>
                <h3 id="measures" ref={(ref) => addSectionRef("measures", ref)}>
                  Accessibility Measures
                </h3>
                <ul>
                  <li>
                    <strong>Comprehensive WCAG Testing:</strong> Regular audits and evaluations to ensure alignment with WCAG 2.1 Level AA guidelines.
                  </li>
                  <li>
                    <strong>Innovative Custom Testing:</strong> Unique testing methodologies like our proprietary "Tabchain Visualization Test" that simulates screen reader behavior to visualize navigation flow.
                  </li>
                  <li>
                    <strong>Continuous Improvement:</strong> Ongoing updates driven by user feedback, accessibility research, and technological advancements.
                  </li>
                </ul>
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>Need help?</AlertTitle>
                  <AlertDescription>
                    Reach out if you encounter any accessibility barriers.
                  </AlertDescription>
                </Alert>
                <h3 id="feedback" ref={(ref) => addSectionRef("feedback", ref)}>
                  Feedback and Assistance
                </h3>
                <p>
                  We welcome your feedback on the accessibility of Blue Frog Analytics. If you experience issues or need assistance, please <a href="/contact">contact us</a>. We strive to respond promptly and resolve concerns.
                </p>
                <p>Thank you for helping make the web accessible to all.</p>
              </div>
            </div>
          </div>
          <nav className="sticky top-10 hidden h-fit lg:block">
            <p className="text-muted-foreground text-sm">ON THIS PAGE</p>
            <ul className="text-muted-foreground mt-1.5 text-xs">
              <li>
                <a
                  className={cn(
                    "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                    activeHeadings.includes("measures")
                      ? "border-primary text-primary font-medium"
                      : "text-muted-foreground hover:text-primary"
                  )}
                  href="#measures"
                >
                  Accessibility Measures
                </a>
              </li>
              <li>
                <a
                  className={cn(
                    "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                    activeHeadings.includes("feedback")
                      ? "border-primary text-primary font-medium"
                      : "text-muted-foreground hover:text-primary"
                  )}
                  href="#feedback"
                >
                  Feedback and Assistance
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
};

export { Content3 };
