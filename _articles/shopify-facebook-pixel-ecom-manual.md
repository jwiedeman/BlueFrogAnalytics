---
title: Facebook Pixel ecommerce tracking - Manual Integration
subtitle: This document covers the setup and options of theme feature described in the article title
author: Joshua Wiedeman
tags: [setup]
---

## Overview


2. Create the ecomm tracking snippet in the current Shopify theme files: (Snippets -> Add a new snippet)
 
    **Snippet Name:**
    lp-facebook-ecomm

    NOTE: Be sure to replace *ADD_TO_CART_ELEMENT_ID* in the below template with the id for the addto cart button on the site. This id changes based on the theme being used.

    ```
    {% if template contains 'product' %}
    <!-- LP: Facebook Dynamic Remarketing for products -->
    <script>
    
        fbq('track', 'ViewContent', {
        content_ids: ['{{ product.id }}'],
        content_type: 'product_group',
        value: {{ product.selected_or_first_available_variant.price | money_without_currency | remove: "," }},
        currency: 'USD'
        });

    document.querySelector('#ADD_TO_CART_ELEMENT_ID').addEventListener('click', function () {
        fbq('track', 'AddToCart', {
        content_ids: ['{{product.id}}'],
        content_type: 'product_group',
        value: {{ product.selected_or_first_available_variant.price | money_without_currency | remove: "," }},
        currency: 'USD'
        })});
    
    </script>
    <!-- END LP: Facebook Dynamic Remarketing for products -->
    {% endif %}
    ```

    ```{% include 'lp-facebook-ecomm' %}```
    Add just before ```</body>```




    
4. Add the checkout script to the checkout page:

    Note: Be sure to replace FB_PIXEL_ID:
   
   ```
    <!-- LP: Facebook Pixel Code -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', 'FB_PIXEL_ID');
    fbq('track', 'PageView');
    </script>
    <noscript>
    <img height="1" width="1" style="display:none" 
        src="https://www.facebook.com/tr?id=FB_PIXEL_ID&ev=PageView&noscript=1"/>
    </noscript>

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
    <!-- END LP: Facebook Pixel Code -->
    ```


---------------------------------------------------

## Verification

- 
  

---------------------------------------------------

## Summary

Congratulations! 



