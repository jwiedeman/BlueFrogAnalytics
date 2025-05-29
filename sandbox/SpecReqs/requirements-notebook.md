## ObservableHQ Requirements Generator

This notebook allows you to:
- View and explore your `Dimensions.csv`, `Events.csv`, `Implementation Packages.csv`, and `Products.csv`.
- Select products, implementation packages, or direct events.
- Automatically join events with associated dimensions.
- Generate a requirements page for developers, including product details, SDK settings, events, and required dimensions.

### Usage
1. Go to https://observablehq.com.
2. Create a new notebook (free plan).
3. In the notebook, upload the four CSV files:
   - `Dimensions.csv`
   - `Events.csv`
   - `Implementation Packages.csv`
   - `Products.csv`
4. Copy the code below into the first cell of your notebook.

---

```js
// Import built-in libraries
import { FileAttachment } from "@observablehq/runtime";
import { Inputs } from "@observablehq/inputs";

// 1. Load CSV data (uploaded as file attachments)
dimensions = FileAttachment("Dimensions.csv").csv({typed: true});
events = FileAttachment("Events.csv").csv({typed: true});
packages = FileAttachment("Implementation Packages.csv").csv({typed: true});
products = FileAttachment("Products.csv").csv({typed: true});

// 2. Display raw tables for inspection
viewProducts = Inputs.table(products, {width: 800, height: 200});
viewEvents = Inputs.table(events, {width: 800, height: 200});
viewPackages = Inputs.table(packages, {width: 800, height: 200});
viewDimensions = Inputs.table(dimensions, {width: 800, height: 200});

// 3. Select products
selectedProducts = Inputs.multiselect({
  label: "Select Products",
  options: products.map(d => d.product_name),
  value: []
});

// 4. Choose selection mode: Packages or Direct Events
mode = Inputs.radio({
  label: "How would you like to pick events?",
  options: ["Implementation Packages", "Direct Events"],
  value: "Implementation Packages"
});

// 5. Filter packages by selected products
filteredPackages = packages.filter(
  p => selectedProducts.includes(p.product_name)
);

// 6. Available events by selected packages
eventsByPackage = events.filter(e =>
  filteredPackages.some(pkg => pkg.event_id === e.event_id)
);

// 7. UI for selecting packages or direct events
selectedPackages = mode === "Implementation Packages"
  ? Inputs.multiselect({
      label: "Select Implementation Packages",
      options: filteredPackages.map(d => d.package_name),
      value: []
    })
  : [];

selectedEvents = mode === "Direct Events"
  ? Inputs.multiselect({
      label: "Select Events",
      options: events.map(d => d.event_name),
      value: []
    })
  : Inputs.multiselect({
      label: "Select Events from Packages",
      options: eventsByPackage.map(d => d.event_name),
      value: []
    });

// 8. Build final selected event rows
selectedEventRows = events.filter(e =>
  selectedEvents.includes(e.event_name)
);

// 9. Extract associated dimensions for each event
// Assuming `event_dimension_ids` column in events CSV is a separator-delimited string of IDs
selectedDimensionRows = (
  selectedEventRows.flatMap(e => {
    const ids = e.event_dimension_ids
      ? String(e.event_dimension_ids).split("|")
      : [];
    return ids.map(id =>
      dimensions.find(d => String(d.dimension_id) === id)
    );
  })
).filter(Boolean);

// 10. Gather SDK settings per product (assuming `sdk_settings` column)
productSettings = products
  .filter(p => selectedProducts.includes(p.product_name))
  .map(p => ({
    product_name: p.product_name,
    sdk_settings: p.sdk_settings
  }));

// 11. Render requirements
md`
## Implementation Requirements

### Products & SDK Settings
${Inputs.table(productSettings, {width: 800})}

### Events to Implement
${Inputs.table(selectedEventRows, {width: 800})}

### Required Dimensions
${Inputs.table(selectedDimensionRows, {width: 800})}
`;
```

---

Feel free to customize the column names (e.g., `event_dimension_ids` or `sdk_settings`) to match your CSV schema.
Once pasted, the notebook will automatically re-compute as you make selections.