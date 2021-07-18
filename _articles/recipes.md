---
title: Creating recipe posts
subtitle: Cras at dolor eget urna varius faucibus tempus in elit. Cras a dui imperdiet, tempus metus quis, pharetra turpis.
tags: [setup]
---

Create new recipe post entries in `_recipes` folder, similar to creating posts, but with following front matter settings:

```yml
---
title: Category hosting Setting up new domain and page
subtitle: This is optional recipe subtitle
tags: [featured, development]
---
```

Sidebar navigation on recipes post can edited in `_data/recipes.yml`:

```yml
- title: Getting Started    # Section title
  icon: cog
  recipes:
  - home                    # recipe file name from _recipes folder
  - quickstart
  - installation
  - windows
```
