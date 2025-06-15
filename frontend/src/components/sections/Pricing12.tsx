const featuredAddons = [
  {
    id: "addon-1",
    title: "Monthly Analytics Report",
    description: "Detailed website performance delivered to your inbox",
    price: "$49",
  },
  {
    id: "addon-2",
    title: "Quarterly Strategy Call",
    description: "Review goals with our experts every quarter",
    price: "$99",
  },
  {
    id: "addon-3",
    title: "Social Media Posting",
    description: "We publish updates to your social channels",
    price: "$149",
  },
];

const otherAddons = [
  {
    id: "addon-4",
    title: "Google Business Profile Management",
    description: "Keep your profile current and respond to reviews",
    price: "$29",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-2.svg",
  },
  {
    id: "addon-5",
    title: "Extra Content Edits",
    description: "Five additional edits each month",
    price: "$19",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-3.svg",
  },
  {
    id: "addon-6",
    title: "Advanced SEO Audit",
    description: "Comprehensive audit and action plan",
    price: "$299",
    priceFootnote: "One-time fee",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-4.svg",
  },
];

const Pricing12 = () => {
  return (
    <section className="py-32">
      <div className="container">
        <div className="rounded-xl border border-border py-6 md:py-8 lg:pt-16 lg:pb-12">
          <div className="px-6 md:px-8 lg:px-12">
            <div className="mb-8 md:mb-10 md:flex md:justify-between lg:mb-9">
              <div className="lg:w-2/3">
                <h1 className="mb-4 text-2xl font-medium md:text-3xl lg:text-4xl">
                  Enhance Your Package
                </h1>
                <p className="text-xs text-muted-foreground md:text-sm lg:text-base">
                  Add specialized services for even more value.
                </p>
              </div>
              <img
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-1.svg"
                alt="placeholder"
                className="hidden size-24 md:block lg:size-32"
              />
            </div>
            <div className="flex flex-col gap-x-8 gap-y-3 xl:flex-row">
              {featuredAddons.map((addon) => (
                <div
                  key={addon.id}
                  className="flex flex-1 flex-col rounded-lg bg-accent p-6 lg:py-8"
                >
                  <h2 className="mb-1.5 text-base font-medium lg:mb-2 lg:text-lg">
                    {addon.title}
                  </h2>
                  <div className="grid flex-1 grid-cols-1 gap-x-10 md:grid-cols-3 lg:grid-cols-1">
                    <p className="mb-8 max-w-xs text-xs text-muted-foreground md:col-span-2 md:mb-0 lg:mb-10 lg:text-base">
                      {addon.description}
                    </p>
                    <div className="col-span-1 md:mt-auto md:ml-auto lg:ml-0">
                      <p>
                        <span className="font-medium lg:text-2xl">
                          {addon.price}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {" "}/ Month
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 border-t border-border md:mt-8 lg:mt-10">
            <div className="divide-y divide-border px-6 md:px-8 lg:px-12">
              {otherAddons.map((addon) => (
                <div
                  key={addon.id}
                  className="flex flex-col space-y-4 py-6 last:pb-0 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-12 lg:py-10"
                >
                  <div className="flex items-center md:max-w-md md:space-x-4 lg:max-w-full lg:space-x-6">
                    <img
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-1.svg"
                      alt="placeholder"
                      className="hidden shrink-0 md:block md:size-16 lg:size-20"
                    />
                    <div className="max-w-md space-y-1 lg:max-w-md lg:space-y-2">
                      <p className="mb-1.5 text-lg font-medium md:text-xl lg:mb-2 lg:text-2xl">
                        {addon.title}
                      </p>
                      <p className="text-xs text-muted-foreground md:text-xs lg:text-base">
                        {addon.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 md:self-end md:text-end">
                    <span className="text-2xl font-medium md:text-3xl lg:text-4xl">
                      {addon.price}
                    </span>
                    <span className="text-xs text-muted-foreground"> / Month</span>
                    {addon.priceFootnote && (
                      <div className="mt-1 text-xs font-medium text-muted-foreground md:max-w-[8rem] lg:max-w-full">
                        * {addon.priceFootnote}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Pricing12 };
