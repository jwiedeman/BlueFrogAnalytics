import { BookOpen, Briefcase, Code, LayoutDashboard, Search } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Lead Services",
    description: "High-intent local leads delivered right to your dashboard."
  },
  {
    icon: LayoutDashboard,
    title: "Domain Dashboard",
    description: "Monitor uptime, SEO and performance metrics in one place."
  },
  {
    icon: Code,
    title: "Website Services",
    description: "Design, content updates and managed hosting handled by experts."
  },
  {
    icon: BookOpen,
    title: "Free Documentation",
    description: "Step-by-step guides to level up your team at no cost."
  },
  {
    icon: Briefcase,
    title: "Consulting & Audits",
    description: "Strategic sessions and deep audits—no CTO required."
  }
];

const HomeFeatures = () => {
  return (
    <section className="py-20">
      <div className="container">
        <h2 className="mb-10 text-center text-3xl font-semibold md:text-4xl">
          What We Do
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col items-start gap-3">
              <Icon className="size-8 text-primary" />
              <h3 className="text-xl font-medium">{title}</h3>
              <p className="text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { HomeFeatures };
