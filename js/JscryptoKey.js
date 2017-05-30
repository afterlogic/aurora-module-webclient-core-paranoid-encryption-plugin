'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	
	Storage = require('%PathToCoreWebclientModule%/js/Storage.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	UserSettings = require('%PathToCoreWebclientModule%/js/Settings.js')
;

/**
 * @constructor
 */
function CJscryptoKey()
{
	this.sPrefix = 'user_' + (UserSettings.UserId || '0') + '_';
	
	this.key = ko.observable();

	this.loadKeyFromStorage();
}

CJscryptoKey.prototype.key = null;
CJscryptoKey.prototype.sPrefix = '';

CJscryptoKey.prototype.getKey = function ()
{
	return this.key();
};

CJscryptoKey.prototype.getKeyObservable = function ()
{
	return this.key;
};

/**
 *  import key from data in local storage
 */
CJscryptoKey.prototype.loadKeyFromStorage = function (fOnGenerateCallback)
{
	var oKey = null;
	if (Storage.hasData(this.sPrefix + 'cryptoKey'))
	{
		oKey = Storage.getData(this.sPrefix + 'cryptoKey');
		window.crypto.subtle.importKey(
			"jwk",
			oKey,
			{
				name: "AES-CBC",
			},
			true,
			["encrypt", "decrypt"]
		)
		.then(_.bind(function(key) {
			this.key(key);
			if (fOnGenerateCallback)
			{
				fOnGenerateCallback(true);
			}
		}, this))
		.catch(function(err) {
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY'));
		});
	}
};

/**
 *  generate new key
 */
CJscryptoKey.prototype.generateKey = function (fOnGenerateCallback)
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
			"jwk",
			key
		)
		.then(_.bind(function(keydata) {
			Storage.setData(this.sPrefix + 'cryptoKey', keydata);
			this.loadKeyFromStorage(fOnGenerateCallback);
		}, this))
		.catch(function(err) {
			Screens.showError(err);
		});
	}, this))
	.catch(function(err) {
		Screens.showError(err);
	});
};

CJscryptoKey.prototype.importKeyFromString = function (sKey)
{
	var
		oKey = {
			alg: "A256CBC",
			ext: true,
			k: sKey,
			key_ops: ["encrypt","decrypt"],
			kty: "oct"
		}
	;
	try
	{
		Storage.setData(this.sPrefix + 'cryptoKey', oKey);
	}
	catch (e)
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_IMPORT_KEY'));
	}
	this.loadKeyFromStorage();
}

CJscryptoKey.prototype.exportKey = function ()
{
	return window.crypto.subtle.exportKey(
		"jwk",
		this.getKey()
	);
}

CJscryptoKey.prototype.deleteKey = function ()
{
	try
	{
		this.key(null);
		Storage.removeData(this.sPrefix + 'cryptoKey');
	}
	catch (e)
	{
		return {error: e}
	}

	this.loadKeyFromStorage();

	return {status: 'ok'};
};

module.exports = new CJscryptoKey();