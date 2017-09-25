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
	this.sKeyName = ko.observable();

	this.loadKeyFromStorage();
}

CJscryptoKey.prototype.key = null;
CJscryptoKey.prototype.sPrefix = '';

CJscryptoKey.prototype.getKey = function ()
{
	return this.key();
};

CJscryptoKey.prototype.getKeyName = function ()
{
	if (Storage.hasData(this.sPrefix + 'cryptoKey'))
	{
		return Storage.getData(this.sPrefix + 'cryptoKey').keyname;
	}
	return false;
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
	var 
		aKey = [],
		sKey = ''
	;
	if (Storage.hasData(this.sPrefix + 'cryptoKey'))
	{
		sKey = Storage.getData(this.sPrefix + 'cryptoKey').keydata;
		aKey = HexUtils.HexString2Array(sKey);
		if (aKey.length > 0)
		{
			aKey = new Uint8Array(aKey);
			window.crypto.subtle.importKey(
				"raw",
				aKey.buffer,
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
		else
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY'));
		}
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
			this.loadKeyFromStorage(fOnGenerateCallback);
		}, this))
		.catch(function(err) {
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_EXPORT_KEY'));
		});
	}, this))
	.catch(function(err) {
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_GENERATE_KEY'));
	});
};

CJscryptoKey.prototype.importKeyFromString = function (sKeyName, sKey)
{
	try
	{
		this.sKeyName(sKeyName);
		Storage.setData(this.sPrefix + 'cryptoKey', {keyname: sKeyName, keydata: sKey});
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
		"raw",
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