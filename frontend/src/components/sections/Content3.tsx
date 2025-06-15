"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const Content3 = () => {
  const [activeHeadings, setActiveHeadings] = useState<string[]>([]);

  useEffect(() => {
    const ids = [
      "heading1",
      "heading2",
      "heading3",
      "heading4",
      "heading5",
      "heading6",
      "heading7",
      "heading8",
    ];

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        if (entry.isIntersecting) {
          setActiveHeadings((prev) =>
            prev.includes(id) ? prev : [...prev, id],
          );
        } else {
          setActiveHeadings((prev) => prev.filter((heading) => heading !== id));
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "0px",
      threshold: 1,
    });

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

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
              <BreadcrumbPage>Terms of Service</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="mt-10 text-balance text-4xl font-bold md:text-5xl lg:text-6xl">
          Terms of Service
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-xl font-medium">
          Review the terms that govern your use of Blue Frog Analytics.
        </p>
        <div className="relative mt-16 grid gap-10 lg:mt-28 lg:grid-cols-5">
          <aside className="top-10 flex h-fit w-full max-w-56 flex-col gap-5 lg:sticky">
            <div>
              <h2 className="font-semibold">Sections</h2>
              <ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
                <li>
                  <a
                    className={cn(
                      "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                      activeHeadings.includes("heading1")
                        ? "border-primary text-primary font-medium"
                        : "hover:text-primary",
                    )}
                    href="#heading1"
                  >
                    Eligibility & Accounts
                  </a>
                </li>
                <li>
                  <a
                    className={cn(
                      "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                      activeHeadings.includes("heading2")
                        ? "border-primary text-primary font-medium"
                        : "hover:text-primary",
                    )}
                    href="#heading2"
                  >
                    Use of Services
                  </a>
                </li>
                <li>
                  <a
                    className={cn(
                      "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                      activeHeadings.includes("heading3")
                        ? "border-primary text-primary font-medium"
                        : "hover:text-primary",
                    )}
                    href="#heading3"
                  >
                    Data Tracking
                  </a>
                </li>
                <li>
                  <a
                    className={cn(
                      "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                      activeHeadings.includes("heading4")
                        ? "border-primary text-primary font-medium"
                        : "hover:text-primary",
                    )}
                    href="#heading4"
                  >
                    Third-Party Services
                  </a>
                </li>
                <li>
                  <a
                    className={cn(
                      "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                      activeHeadings.includes("heading5")
                        ? "border-primary text-primary font-medium"
                        : "hover:text-primary",
                    )}
                    href="#heading5"
                  >
                    Intellectual Property
                  </a>
                </li>
                <li>
                  <a
                    className={cn(
                      "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                      activeHeadings.includes("heading6")
                        ? "border-primary text-primary font-medium"
                        : "hover:text-primary",
                    )}
                    href="#heading6"
                  >
                    Disclaimers
                  </a>
                </li>
                <li>
                  <a
                    className={cn(
                      "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                      activeHeadings.includes("heading7")
                        ? "border-primary text-primary font-medium"
                        : "hover:text-primary",
                    )}
                    href="#heading7"
                  >
                    Modifications
                  </a>
                </li>
                <li>
                  <a
                    className={cn(
                      "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                      activeHeadings.includes("heading8")
                        ? "border-primary text-primary font-medium"
                        : "hover:text-primary",
                    )}
                    href="#heading8"
                  >
                    Governing Law
                  </a>
                </li>
              </ul>
            </div>
          </aside>
          <div className="gap-6 lg:col-span-3">
            <div className="prose dark:prose-invert prose-h3:mt-14 prose-h3:scroll-mt-14 prose-h3:text-lg">
              <article>
                <slot />
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Content3 };
