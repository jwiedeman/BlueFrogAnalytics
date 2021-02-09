---
title: Google Ads base code 
subtitle: This document covers the setup and options of theme feature described in the article title
author: Joshua Wiedeman
tags: [setup]
---

## Overview

Setting up Google Ads Base Code. 

You will need:
- Shopify Admin access
- Google Ads base code

### Step 1 - Go to the shopify dashboard > online store > actions > edit code

1. Make sure the file you are on is "theme.liquid" 
2. Paste your Google Ads Base Code to the site header, all you need to do is find this HTML Element

`</head>` the "closing" head tag. The google ads base code : 
Replace the "ADD_YOUR_GOOGLE_ADS_ID_HERE" with your "AW-000" Google ads ID

```html
<!-- Global site tag (gtag.js) - Google Ads: 694458146 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=ADD_YOUR_GOOGLE_ADS_ID_HERE"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'ADD_YOUR_GOOGLE_ADS_ID_HERE');
</script>

```


This integration provides tracking needed to allow future events to send conversions to google.
The base code alone adds basic remarketing, dynamic remarketing requires additional setup and modifications.  


More tracking 
[Google Ads Conversion Tracking]({{site.url}}/articles/shopify-google-ads-conversiontracking))
[Google Ads Dynamic Remarketing]({{site.url}}/articles/shopify-google-ads-dynamicremarketing))


---------------------------------------------------

## Verification

- 
  

---------------------------------------------------

## Summary

Congratulations! 
