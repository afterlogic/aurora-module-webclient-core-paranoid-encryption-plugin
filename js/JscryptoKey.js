'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),
	
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Storage = require('%PathToCoreWebclientModule%/js/Storage.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	UserSettings = require('%PathToCoreWebclientModule%/js/Settings.js'),
	HexUtils = require('modules/%ModuleName%/js/utils/Hex.js')
;

/**
 * @constructor
 */
function CJscryptoKey()
{
	this.sPrefix = 'user_' + (UserSettings.UserId || '0') + '_';

	this.key = ko.observable();
	this.keyName = ko.observable();
}

CJscryptoKey.prototype.key = null;
CJscryptoKey.prototype.sPrefix = '';

CJscryptoKey.prototype.getKey = function (fOnGenerateKeyCallback, fOnErrorCallback)
{
	var 
		aKey = this.loadKeyFromStorage(),
		oPromise = new Promise((resolve, reject) => {
			if (!aKey)
			{
				reject(new Error(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY')));
			}
			else
			{
				if (!this.key())
				{
					this.generateKeyFromArray(aKey)
						.then(_.bind(function(key) {
							resolve(key);
						}, this));
				}
				else
				{
					resolve(this.key());
				}
			}
		})
	;

	this.loadKeyNameFromStorage();
	oPromise
		.then(_.bind(function(oKey) {
			this.onKeyGenerateSuccess(oKey);
			if (_.isFunction(fOnGenerateKeyCallback))
			{
				fOnGenerateKeyCallback(oKey);
			}
		}, this))
		.catch(_.bind(function(oError) {
			if (_.isFunction(fOnErrorCallback))
			{
				fOnErrorCallback();
			}
			this.onKeyGenerateError(oError);
		}, this));
};

CJscryptoKey.prototype.loadKeyNameFromStorage = function ()
{
	if (Storage.hasData(this.sPrefix + 'cryptoKey'))
	{
		this.keyName(Storage.getData(this.sPrefix + 'cryptoKey').keyname);
	}
};

/**
 *  import key from data in local storage
 */
CJscryptoKey.prototype.loadKeyFromStorage = function ()
{
	var 
		aKey = false,
		sKey = ''
	;
	if (Storage.hasData(this.sPrefix + 'cryptoKey'))
	{
		sKey = Storage.getData(this.sPrefix + 'cryptoKey').keydata;
		aKey = HexUtils.HexString2Array(sKey);
		if (aKey.length > 0)
		{
			aKey = new Uint8Array(aKey);
		}
		else
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY'));
		}
	}
	return aKey;
};

CJscryptoKey.prototype.generateKeyFromArray = function (aKey)
{
	var keyPromise = window.crypto.subtle.importKey(
		"raw",
		aKey.buffer,
		{
			name: "AES-CBC"
		},
		true,
		["encrypt", "decrypt"]
	);
	return keyPromise;
};

CJscryptoKey.prototype.onKeyGenerateSuccess = function (oKey)
{
	this.key(oKey);
};

CJscryptoKey.prototype.onKeyGenerateError = function (oError)
{
	if (oError.message)
	{
		Screens.showError(oError.message);
	}
};

/**
 *  generate new key
 */
CJscryptoKey.prototype.generateKey = function (fOnGenerateCallback, sKeyName)
{
	window.crypto.subtle.generateKey(
		{
			name: "AES-CBC",
			length: 256
		},
		true,
		["encrypt", "decrypt"]
	)
	.then(_.bind(function (key) {
		window.crypto.subtle.exportKey(
			"raw",
			key
		)
		.then(_.bind(function(keydata) {
			Storage.setData(
				this.sPrefix + 'cryptoKey', 
				{
					keyname: sKeyName,
					keydata: HexUtils.Array2HexString(new Uint8Array(keydata))
				}
			);
			this.getKey(fOnGenerateCallback);
		}, this))
		.catch(function(err) {
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_EXPORT_KEY'));
		});
	}, this))
	.catch(function(err) {
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_GENERATE_KEY'));
	});
};

CJscryptoKey.prototype.importKeyFromString = function (sKeyName, sKey, fOnGenerateKeyCallback, fOnErrorCallback)
{
	try
	{
		this.keyName(sKeyName);
		Storage.setData(this.sPrefix + 'cryptoKey', {keyname: sKeyName, keydata: sKey});
		this.getKey(fOnGenerateKeyCallback, fOnErrorCallback);
	}
	catch (e)
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_IMPORT_KEY'));
	}
};

CJscryptoKey.prototype.exportKey = function ()
{
	return window.crypto.subtle.exportKey(
		"raw",
		this.key()
	);
};

CJscryptoKey.prototype.deleteKey = function ()
{
	try
	{
		this.key(null);
		Storage.removeData(this.sPrefix + 'cryptoKey');
	}
	catch (e)
	{
		return {error: e};
	}

	return {status: 'ok'};
};

module.exports = new CJscryptoKey();