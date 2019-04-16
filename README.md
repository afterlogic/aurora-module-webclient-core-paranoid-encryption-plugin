# Aurora Core Paranoid Encryption Plugin webclient module

Paranoid Encryption module allows you to encrypt files in File module using client-based functionality only. This keeps you from storing critical data on server in a readable format. To get this module to work you browser should support Web Crypto API. You can check if you browser has such capability [here](http://caniuse.com/#search=Cryptography).
You will be able to generate your own encryption key and store it in some secure place. It's useful for getting access to encrypted data in other browsers.

Not only browser can be used for decrypt files. All files are encrypted using AES-CBC algorithm with a 256 bit key length. You can decrypt files using some offline programs which support AES 256 algorithm. Of course you will need you encryption key. Don't forget to store it.

# License
This module is licensed under AGPLv3 license if free version of the product is used or Afterlogic Software License if commercial version of the product was purchased.
