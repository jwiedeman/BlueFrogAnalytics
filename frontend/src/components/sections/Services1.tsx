"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Slash } from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { ControllerRenderProps, useForm } from "react-hook-form";
import { z } from "zod";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BreadcrumbItem {
  label: string;
  link: string;
}

interface Service {
  id: string;
  category: string;
  title: string;
  summary: string;
  link: string;
  cta: string;
  thumbnail: string;
}

interface Category {
  label: string;
  value: string;
}

interface FilterFormProps {
  categories: Array<Category>;
  onCategoryChange: (selectedCategories: string[]) => void;
}

interface ServicesResultProps {
  services: Array<Service>;
  categories: Array<Category>;
}

interface BreadcrumbServicesProps {
  breadcrumb: Array<BreadcrumbItem>;
}

const SERVICES_PER_PAGE = 6;

const BREADCRUMB: Array<BreadcrumbItem> = [
  {
    label: "Home",
    link: "/",
  },
  {
    label: "Services",
    link: "#",
  },
];

const CATEGORIES: Array<Category> = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Launch",
    value: "launch",
  },
  {
    label: "Add-on",
    value: "addon",
  },
  {
    label: "Monitoring",
    value: "monitoring",
  },
];

const PRIMARY_SERVICE: Service = {
  id: "launch",
  category: "Launch",
  title: "Business Launch Kit",
  summary:
    "Launch your business online with our starter package including a brochure website and SEO basics.",
  link: "#launch",
  cta: "Get Started",
  thumbnail: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
};

const SERVICES: Array<Service> = [
  {
    id: "seo",
    category: "addon",
    title: "SEO Optimization",
    summary: "Improve search visibility with on-page and technical fixes",
    link: "#seo",
    cta: "Learn more",
    thumbnail: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
  },
  {
    id: "performance",
    category: "monitoring",
    title: "Performance Tuning",
    summary: "Boost site speed and Core Web Vitals scores",
    link: "#performance",
    cta: "Learn more",
    thumbnail: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
  },
  {
    id: "marketing",
    category: "addon",
    title: "Marketing Automation",
    summary: "Engage customers with targeted campaigns",
    link: "#marketing",
    cta: "Learn more",
    thumbnail: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
  },
  {
    id: "consulting",
    category: "addon",
    title: "Analytics Consulting",
    summary: "Work directly with our experts to plan strategy",
    link: "#consulting",
    cta: "Learn more",
    thumbnail: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
  },
  {
    id: "compliance",
    category: "monitoring",
    title: "Compliance Monitoring",
    summary: "Stay ahead of privacy and regulatory changes",
    link: "#compliance",
    cta: "Learn more",
    thumbnail: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
  },
  {
    id: "accessibility",
    category: "addon",
    title: "Accessibility Audits",
    summary: "Identify and remediate usability barriers",
    link: "#accessibility",
    cta: "Learn more",
    thumbnail: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
  },
];

const FilterFormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.length > 0, {
    message: "At least one category should be selected.",
  }),
});

const FilterForm = ({ categories, onCategoryChange }: FilterFormProps) => {
  const form = useForm<z.infer<typeof FilterFormSchema>>({
    resolver: zodResolver(FilterFormSchema),
    defaultValues: {
      items: [CATEGORIES[0].value],
    },
  });

  const handleCheckboxChange = useCallback(
    (
      checked: boolean | string,
      categoryValue: string,
      field: ControllerRenderProps<z.infer<typeof FilterFormSchema>, "items">,
    ) => {
      let updatedValues = checked
        ? [...field.value, categoryValue]
        : field.value.filter((value: string) => value !== categoryValue);

      if (updatedValues.length === 0) {
        form.setValue("items", ["all"]);
        onCategoryChange(["all"]);
        return;
      }

      if (updatedValues.includes("all")) {
        updatedValues = updatedValues.filter((v: string) => v !== "all");
      }

      if (JSON.stringify(field.value) !== JSON.stringify(updatedValues)) {
        form.setValue("items", updatedValues);
        onCategoryChange(updatedValues);
      }
    },
    [form, onCategoryChange],
  );

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="items"
          render={({ field }) => (
            <FormItem className="flex w-full flex-wrap items-center gap-2.5">
              {categories.map((category) => {
                const isChecked = field.value?.includes(category.value);
                return (
                  <FormItem
                    key={category.value}
                    className="flex flex-row items-start space-x-3 space-y-0"
                  >
                    <FormControl>
                      <Label className="bg-muted flex cursor-pointer items-center gap-2.5 rounded-full px-2.5 py-1.5">
                        <div>{category.label}</div>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(checked, category.value, field)
                          }
                        />
                      </Label>
                    </FormControl>
                  </FormItem>
                );
              })}
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

const ServicesResult = ({ services, categories }: ServicesResultProps) => {
  const [visibleCount, setVisibleCount] = useState(SERVICES_PER_PAGE);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    CATEGORIES[0].value,
  ]);
  const handleCategoryChange = useCallback((selected: string[]) => {
    setSelectedCategories(selected);
    setVisibleCount(SERVICES_PER_PAGE);
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + SERVICES_PER_PAGE);
  }, []);
  const filteredServices = useMemo(() => {
    return services.filter(
      (service) =>
        selectedCategories.includes(service.category.toLowerCase()) ||
        selectedCategories.includes("all"),
    );
  }, [services, selectedCategories]);

  const servicesToDisplay =
    filteredServices.length > 0 ? filteredServices : services;

  const hasMore = visibleCount < servicesToDisplay.length;

  return (
    <div>
      <FilterForm
        categories={categories}
        onCategoryChange={handleCategoryChange}
      />
      <div className="flex w-full flex-col gap-4 py-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {servicesToDisplay.slice(0, visibleCount).map((service) => (
            <ServicesCard key={service.title} {...service} />
          ))}
        </div>
        {hasMore && (
          <Button
            className="w-full"
            variant="secondary"
            onClick={handleLoadMore}
          >
            Load More
          </Button>
        )}
      </div>
    </div>
  );
};

const BreadcrumbServices = ({ breadcrumb }: BreadcrumbServicesProps) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumb.map((item, i) => {
          return (
            <Fragment key={`${item.label}`}>
              <BreadcrumbItem>
                <BreadcrumbLink href={item.link}>{item.label}</BreadcrumbLink>
              </BreadcrumbItem>
              {i < breadcrumb.length - 1 ? (
                <BreadcrumbSeparator>
                  <Slash />
                </BreadcrumbSeparator>
              ) : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

const EmailFormSchema = z
  .object({
    email: z.string().email({
      message: "Invalid email address",
    }),
  })
  .required({ email: true });

const EmailForm = () => {
  const form = useForm<z.infer<typeof EmailFormSchema>>({
    resolver: zodResolver(EmailFormSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: z.infer<typeof EmailFormSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="w-full">
                  <div className="relative flex w-full flex-col gap-2 lg:block">
                    <Input
                      {...field}
                      type="email"
                      id="emailInput"
                      placeholder="What's your work email?"
                      className="bg-background h-fit py-4 pl-5 pr-5 lg:pr-[13.75rem]"
                    />
                    <div className="right-2.5 top-1/2 lg:absolute lg:-translate-y-1/2">
                      <Button
                        type="submit"
                        className="w-full rounded-full lg:w-fit"
                      >
                        Learn More
                        <ArrowRight />
                      </Button>
                    </div>
                  </div>
                  <FormMessage className="py-1" />
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

const ServicesCard = ({
  id,
  category,
  title,
  thumbnail,
  summary,
  link,
  cta,
}: Service) => {
  return (
    <a href={link} id={id} className="block h-full w-full">
      <Card className="size-full border py-0">
        <CardContent className="p-0">
          <div className="text-muted-foreground border-b p-2.5 text-sm font-medium leading-[1.2]">
            {category}
          </div>
          <AspectRatio ratio={1.520833333} className="overflow-hidden">
            <img
              src={thumbnail}
              alt={title}
              className="block size-full object-cover object-center"
            />
          </AspectRatio>
          <div className="flex w-full flex-col gap-5 p-5">
            <h2 className="text-lg font-bold leading-none md:text-2xl">
              {title}
            </h2>
            <div className="w-full max-w-[20rem]">
              <p className="text-foreground text-sm font-medium leading-[1.4]">
                {summary}
              </p>
            </div>
            <div>
              <Badge className="rounded-full">
                {cta}
                <ArrowRight />
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
};

const Services1 = () => {
  return (
    <section className="pb-32">
      <div className="bg-muted bg-[url('https://deifkwefumgah.cloudfront.net/shadcnblocks/block/patterns/dot-pattern-2.svg')] bg-[length:3.125rem_3.125rem] bg-repeat">
        <div className="container flex flex-col items-start justify-start gap-16 py-20 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col justify-between gap-12">
            <div className="flex w-full max-w-[36rem] flex-col gap-8">
              <BreadcrumbServices breadcrumb={BREADCRUMB} />
              <div className="flex w-full flex-col gap-5">
                <h1 className="text-[2.5rem] font-semibold leading-[1.2] md:text-5xl lg:text-6xl">
                  Explore Services
                </h1>
                <p className="text-foreground text-xl font-semibold leading-[1.4]">
                  Choose from our launch packages, ongoing monitoring, and helpful add-ons.
                </p>
              </div>
              <div className="max-w-[30rem]">
                <EmailForm />
              </div>
            </div>
          </div>
          <div className="w-full max-w-[27.5rem]">
            <ServicesCard {...PRIMARY_SERVICE} />
          </div>
        </div>
      </div>
      <div className="py-20">
        <div className="container flex flex-col gap-8">
          <h2 className="text-[1.75rem] font-medium leading-none md:text-[2.25rem] lg:text-[2rem]">
            All Services
          </h2>
          <div>
            <ServicesResult services={SERVICES} categories={CATEGORIES} />
          </div>
        </div>
      </div>
    </section>
  );
};

export { Services1 };
