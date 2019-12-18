# Aurora Core Paranoid Encryption Plugin webclient module

Paranoid Encryption module allows you to encrypt files in File module using client-based functionality only. This keeps you from storing critical data on server in a readable format. To get this module to work you browser should support Web Crypto API. You can check if you browser has such capability [here](http://caniuse.com/#search=Cryptography).
You will be able to generate your own encryption key and store it in some secure place. It's useful for getting access to encrypted data in other browsers.

Not only browser can be used for decrypt files. All files are encrypted using AES-CBC algorithm with a 256 bit key length. You can decrypt files using some offline programs which support AES 256 algorithm. Of course you will need you encryption key. Don't forget to store it. You're also going to need an initialization vector, it can be obtained by downloading a file using [AuroraFileSync](https://afterlogic.com/download/AuroraFileSync.msi) tool, vector will be included in filename of the downloaded file.

Once you have file, key and vector you can proceed with decrypting. Using OpenSSL, that's done as follows:

```
openssl enc -d -aes256
-K 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
-iv 0123456789abcdef0123456789abcdef
-in inFileName
-out outFileName
```

where -K defines encryption key, and -iv defines initialization vector.

# License
This module is licensed under AGPLv3 license if free version of the product is used or Afterlogic Software License if commercial version of the product was purchased.
