---
title: Recipe Index
subtitle: This covers the list of all recipes on the site. 
author: sara
tags: []
---


{% for article in site.articles %}
{% if article.title == "Recipe Index" %}
  <a href="{{ site.url }}{{ article.url }}">{{ article.title }}</a>
{% endif %}
{% endfor %}