---
title: Google Ads conversion tracking
subtitle: This document covers the setup and options of theme feature described in the article title
author: Joshua Wiedeman
tags: [setup]
---

## Overview

Setting up Google Ads Conversion Tracking. 
You will need:

- Google Ads Base code added, if you havent, start here : [Shopify Google Ads Base Code]({{site.url}}/articles/shopify-google-ads-basecode)
- Google Ads ID ADD_YOUR_GOOGLE_ADS_ID_HERE
- Google Ads Conversion Label ADD_YOUR_GOOGLE_ADS_CONVERSION_LABEL_HERE

1 Add to Settings > Checkout > Additional Scripts:

<script async src="https://www.googletagmanager.com/gtag/js?id=AW-ADD_YOUR_GOOGLE_ADS_ID_HERE"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-ADD_YOUR_GOOGLE_ADS_ID_HERE');
</script>
{% if first_time_accessed %}
<script>
  gtag('event', 'conversion', {
      'send_to': 'AW-ADD_YOUR_GOOGLE_ADS_ID_HERE/ADD_YOUR_GOOGLE_ADS_CONVERSION_LABEL_HERE',
      'value': {{ subtotal_price | money_without_currency | remove: "," }},
      'currency': '{{ checkout.currency }}',
      'transaction_id': '{{ order_number }}'
  });
</script>
{% endif %}



---------------------------------------------------

## Verification

- 
  

---------------------------------------------------

## Summary

Congratulations! 



