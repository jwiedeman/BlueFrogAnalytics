import { BookOpen, Briefcase, LayoutDashboard, Megaphone, Globe } from "lucide-react";

const features = [
  {
    icon: Megaphone,
    title: "Lead Services",
    description: "Capture and convert prospects with targeted outreach.",
    href: "/services/marketing",
  },
  {
    icon: LayoutDashboard,
    title: "Domain Dashboard",
    description: "Monitor domain metrics and online health in real time.",
    href: "/dashboard",
  },
  {
    icon: Globe,
    title: "Website Services",
    description: "Design, hosting and SEO for your site.",
    href: "/services/launch",
  },
  {
    icon: BookOpen,
    title: "Free Documentation",
    description: "Guides and best practices for marketing and analytics.",
    href: "/docs",
  },
  {
    icon: Briefcase,
    title: "Consulting & Audits",
    description: "Detailed analysis and expert guidance.",
    href: "/services/consulting",
  },
];

const HomeFeatures = () => {
  return (
    <section className="py-20">
      <div className="container">
        <h2 className="mb-10 text-center text-3xl font-semibold md:text-4xl">
          Our Core Offerings
        </h2>
        <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-5">
          {features.map(({ icon: Icon, title, description, href }) => (
            <a
              key={title}
              href={href}
              className="flex flex-col items-start gap-3 hover:underline"
            >
              <Icon className="size-8 text-primary" />
              <h3 className="text-xl font-medium">{title}</h3>
              <p className="text-muted-foreground">{description}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export { HomeFeatures };
