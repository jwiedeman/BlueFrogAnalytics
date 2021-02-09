---
title: Facebook Pixel Base Code - Manual Integration
subtitle: This document covers the setup of the Facebook Pixel Base Code - Manual integration for shopify. This integration is a backup to the Shopify default integration if that cannot be setup. 
author: Joshua Wiedeman
tags: [setup]
---

## Overview

Setting up Shopify Facebook Pixel Base Code - Manual Tracking. 
You will need:

- Admin access to the shopify store
- Facebook Pixel ID


1. Create the main FB Pixel snippet in the current Shopify theme files: (Shopify Dashboard > Online store > Edit code > Snippets -> Add a new snippet).
    
*Snippet Name:*
facebook-pixel

Replace ADD_YOUR_FACEBOOK_PIXEL_ID_HERE with your Facebook Pixel ID in the following code, and add to the new facebook-pixel snippet:

```html
    <!--  Facebook Pixel Code -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', 'ADD_YOUR_FACEBOOK_PIXEL_ID_HERE');
    fbq('track', 'PageView');
    </script>

    <noscript>
    <img height="1" width="1" style="display:none" 
        src="https://www.facebook.com/tr?id=ADD_YOUR_FACEBOOK_PIXEL_ID_HERE&ev=PageView&noscript=1"/>
    </noscript>
    <!-- End Facebook Pixel Code -->
```

2. Add the snippet to the main theme.liquid file by adding "includes" in the appropriate spots:
Add just before the html `</head>` tag. 

```html
{% raw %}
        {% include 'facebook-pixel' %} 
{% endraw %}
```

3. To install the Shopify Facebook Pixel Manual Ecom integration, proceed to this article, 
[Facebook Pixel Ecom - Manual]({{site.baseurl}}/articles/shopify-facebook-pixel-ecom-manual))

## Verification



## Summary

Congratulations! 



