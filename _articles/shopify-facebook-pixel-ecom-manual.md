---
title: Shopify Facebook Pixel ecommerce tracking - Manual Integration
subtitle: This document covers the setup and options of theme feature described in the article title
author: Joshua Wiedeman
tags: [setup]
---


## Overview

Setting up the Facebook Pixel Manual integration for shopify. 
You will need:

- Facebook Pixel Base Code - Manual, needs to be installed first. 
[Facebook Pixel Base Code - Manual]({{site.url}}/articles/shopify-facebook-pixel-basecode-manual))
- Facebook Pixel ID


1. If you have not already, add the facebook pixel base code - manual integration before completing this. 
[Facebook Pixel Base Code - Manual](https://whostracking.me/articles/shopify-facebook-pixel-basecode-manual))


2. Create the ecomm tracking snippet in the current Shopify theme files: (Snippets -> Add a new snippet)
 
    **Snippet Name:**
    facebook-ecomm

    NOTE: Be sure to replace *ADD_TO_CART_ELEMENT_ID* in the below template with the id for the addto cart button on the site. This id changes based on the theme being used.

    ```html
    {% raw %}
    {% if template contains 'product' %}
    <!-- : Facebook Dynamic Remarketing for products -->
    <script>
    
        fbq('track', 'ViewContent', {
            content_ids: ['{{ product.id }}'],
            content_type: 'product_group',
            value: {{ product.selected_or_first_available_variant.price | money_without_currency | remove: "," }},
            currency: 'USD'
        });

        document.querySelector('button[class*=add-to-cart]').addEventListener('click', function () {
            fbq('track', 'AddToCart', {
            content_ids: ['{{product.id}}'],
            content_type: 'product_group',
            value: {{ product.selected_or_first_available_variant.price | money_without_currency | remove: "," }},
            currency: 'USD'
        })});
    
    </script>
    <!-- END : Facebook Dynamic Remarketing for products -->
    {% endif %}
    {% endraw %}
    ```

3. Add the snippets to the main theme.liquid file by adding "includes" in the appropriate spots:

Add just before ```</body>```
```html
{% raw %}
        {% include 'facebook-ecomm' %}
{% endraw %}
```

    
4. Add the checkout script to the checkout page, at Dashboard > settings > checkout > additional scripts:

    Note: Be sure to replace ADD_YOUR_FACEBOOK_PIXEL_ID_HERE:
   
   ```html
    <!-- : Facebook Pixel Code -->
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

    {% raw %}
    {% if first_time_accessed %}
    <script>
    fbq('track', 'Purchase', {
        contents: [{% for product in order.line_items %}
    {id :'{{ product.product_id }}',
    quantity:'{{ product.quantity }}'},
    {% endfor %}],
        content_type: 'product_group',
        value: {{ subtotal_price | money_without_currency | remove: "," }},
        currency: '{{ shop.currency }}'
        });
    </script>
    {% endif %}
    {% endraw %}
    <!-- END : Facebook Pixel Code -->
    ```



    
## Verification



## Summary

Congratulations! 
