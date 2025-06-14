"use client";

import { Facebook, Home, Linkedin, Twitter } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface BlogpostProps {
  title: string;
  author?: string;
  date?: string | Date;
  description?: string;
  children: React.ReactNode;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const Blogpost5 = ({ title, author, date, description, children }: BlogpostProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement>>({});
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const articleEl = articleRef.current;
    if (!articleEl) return;
    const hs = Array.from(articleEl.querySelectorAll("h2"));
    const newHeadings: { id: string; text: string }[] = [];
    sectionRefs.current = {};
    hs.forEach((el) => {
      let id = el.id;
      if (!id) {
        id = slugify(el.textContent || "");
        el.id = id;
      }
      newHeadings.push({ id, text: el.textContent || "" });
      sectionRefs.current[id] = el as HTMLElement;
    });
    setHeadings(newHeadings);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 1 }
    );
    newHeadings.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [children]);

  const formattedDate = date
    ? new Date(date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <section className="py-32">
      <div className="container">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/blog">Blog</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="mb-7 mt-9 max-w-3xl text-4xl font-bold md:mb-10 md:text-7xl">
          {title}
        </h1>
        <div className="flex items-center gap-3 text-sm md:text-base">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp" />
          </Avatar>
          <span>
            {author && (
              <a href="#" className="font-medium">
                {author}
              </a>
            )}
            {formattedDate && (
              <span className="text-muted-foreground ml-1">{formattedDate}</span>
            )}
          </span>
        </div>
        {description && (
          <p className="text-muted-foreground mt-4 max-w-3xl text-sm md:text-base">
            {description}
          </p>
        )}
        <div className="relative mt-12 grid max-w-7xl gap-14 lg:mt-14 lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="order-2 lg:order-none lg:col-span-8">
            <article ref={articleRef} className="prose dark:prose-invert mb-8">
              {children}
            </article>
          </div>
          <div className="order-1 flex h-fit flex-col text-sm lg:sticky lg:top-8 lg:order-none lg:col-span-3 lg:col-start-10 lg:text-xs">
            {headings.length > 0 && (
              <div className="order-3 lg:order-none">
                <span className="text-xs font-medium">ON THIS PAGE</span>
                <nav className="mt-2 lg:mt-4">
                  <ul className="space-y-1">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          className={cn(
                            "block py-1 transition-colors duration-200",
                            activeSection === h.id
                              ? "text-muted-foreground lg:text-primary"
                              : "text-muted-foreground hover:text-primary"
                          )}
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            )}
            <Separator className="order-2 mb-11 mt-8 lg:hidden" />
            <div className="order-1 flex flex-col gap-2 lg:order-none lg:mt-9">
              <p className="text-muted-foreground font-medium">Share this article:</p>
              <ul className="flex gap-2">
                <li>
                  <Button variant="secondary" size="icon" className="group rounded-full">
                    <a href="#">
                      <Facebook className="fill-muted-foreground text-muted-foreground group-hover:fill-primary group-hover:text-primary h-4 w-4 transition-colors" />
                    </a>
                  </Button>
                </li>
                <li>
                  <Button variant="secondary" size="icon" className="group rounded-full">
                    <a href="#">
                      <Linkedin className="fill-muted-foreground text-muted-foreground group-hover:fill-primary group-hover:text-primary h-4 w-4 transition-colors" />
                    </a>
                  </Button>
                </li>
                <li>
                  <Button variant="secondary" size="icon" className="group rounded-full">
                    <a href="#">
                      <Twitter className="fill-muted-foreground text-muted-foreground group-hover:fill-primary group-hover:text-primary h-4 w-4 transition-colors" />
                    </a>
                  </Button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Blogpost5 };

