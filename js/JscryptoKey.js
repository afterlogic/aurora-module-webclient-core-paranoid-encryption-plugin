'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Storage = require('%PathToCoreWebclientModule%/js/Storage.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	UserSettings = require('%PathToCoreWebclientModule%/js/Settings.js'),
	HexUtils = require('modules/%ModuleName%/js/utils/Hex.js'),
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	DecryptKeyPasswordPopup =  require('modules/%ModuleName%/js/popups/DecryptKeyPasswordPopup.js'),
	EncryptKeyPasswordPopup = require('modules/%ModuleName%/js/popups/EncryptKeyPasswordPopup.js')
;

/**
 * @constructor
 */
function CJscryptoKey()
{
	this.sPrefix = 'user_' + (UserSettings.UserId || '0') + '_';
	this.key = ko.observable();
	this.keyName = ko.observable();
	this.storageName = 'cryptoKeyEncrypted';
}

CJscryptoKey.prototype.key = null;
CJscryptoKey.prototype.sPrefix = '';

/**
 * Asynchronously read key from storage, decrypt and generate key-object
 *
 * @param {Function} fOnGenerateKeyCallback - starts after the key is successfully generated
 * @param {Function} fOnErrorCallback - starts if error occurred during key generation process
 * @param {string} sPassword - encrypt key with given password, "password dialog" wouldn't show
 * @param {boolean} bForcedKeyLoading - forced key loading and decryption
 */
CJscryptoKey.prototype.getKey = function (fOnGenerateKeyCallback, fOnErrorCallback, sPassword, bForcedKeyLoading)
{
	var
		sEncryptedKeyData = this.loadKeyFromStorage(),
		oPromise = new Promise(function (resolve, reject) {
			var fDecryptKeyCallback = _.bind(function(sPassword) {
				//Decrypt key with user password
				this.decryptKeyData(sEncryptedKeyData, sPassword)
					.then(_.bind(function(aKeyData) {
						//generate key object from encrypted data
						this.generateKeyFromArray(aKeyData)
							.then(function(oKey) {
								//return key object
								resolve(oKey);
							})
							.catch(function(e) {
								reject(new Error(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY')));
							});
					}, this))
					.catch(function(e) {
						reject(new Error(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY')));
					});
			}, this);
			if (!sEncryptedKeyData)
			{
				reject(new Error(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY')));
			}
			else
			{
				if (!this.key() || bForcedKeyLoading)
				{//if key not available or loading is forced - encrypt key data
					if (!sPassword)
					{//if password is unknown - request password
						Popups.showPopup(DecryptKeyPasswordPopup, [
							fDecryptKeyCallback,
							function() {
								if (_.isFunction(fOnErrorCallback))
								{
									fOnErrorCallback();
								}
							}
						]);
					}
					else
					{//if password is known - decrypt key with this password
						fDecryptKeyCallback(sPassword);
					}
				}
				else
				{//if key already available - return key
					resolve(this.key());
				}
			}
		}.bind(this))
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

/**
 * Read key name from local storage
 */
CJscryptoKey.prototype.loadKeyNameFromStorage = function ()
{
	if (Storage.hasData(this.getStorageName()))
	{
		this.keyName(Storage.getData(this.getStorageName()).keyname);
	}
};

/**
 *  read key data from local storage
 *
 *  @returns {string}
 */
CJscryptoKey.prototype.loadKeyFromStorage = function ()
{
	var
		sKey = ''
	;

	if (Storage.hasData(this.getStorageName()))
	{
		sKey = Storage.getData(this.getStorageName()).keydata;
	}
	return sKey;
};

/**
 * Asynchronously generate key object from array data
 *
 * @param {ArrayBuffer} aKey
 * @returns {Promise}
 */
CJscryptoKey.prototype.generateKeyFromArray = function (aKey)
{
	var keyPromise = window.crypto.subtle.importKey(
		"raw",
		aKey,
		{
			name: "AES-CBC"
		},
		true,
		["encrypt", "decrypt"]
	);
	return keyPromise;
};

/**
 * Write key-object to knockout variable
 *
 * @param {Object} oKey
 */
CJscryptoKey.prototype.onKeyGenerateSuccess = function (oKey)
{
	this.key(oKey);
};

/**
 * Show error message
 *
 * @param {Object} oError
 */
CJscryptoKey.prototype.onKeyGenerateError = function (oError)
{
	if (oError && oError.message)
	{
		Screens.showError(oError.message);
	}
};

/**
 * Asynchronously generate new key
 */
CJscryptoKey.prototype.generateKey = async function ()
{
	let oKey = false;

	try
	{
		oKey = await window.crypto.subtle.generateKey(
			{
				name: "AES-CBC",
				length: 256
			},
			true,
			["encrypt", "decrypt"]
		);
	}
	catch (e)
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_GENERATE_KEY'));
	}

	return oKey;
};

CJscryptoKey.prototype.convertKeyToString = async function (oKey)
{
	let sKeyData = '';

	if (oKey)
	{
		try
		{
			let aKeyData = await window.crypto.subtle.exportKey(
				"raw",
				oKey
			);
			sKeyData = HexUtils.Array2HexString(new Uint8Array(aKeyData));
		}
		catch (e)
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_EXPORT_KEY'));
		}
	}

	return sKeyData;
};

/**
 * Asynchronously generate and export new key
 *
 * @param {Function} fOnGenerateCallback - starts after the key is successfully generated
 * @param {string} sKeyName
 */
CJscryptoKey.prototype.generateAndExportKey = async function (fOnGenerateCallback, sKeyName)
{
	let oKey = await this.generateKey();
	const sKeyData = await this.convertKeyToString(oKey);

	Popups.showPopup(EncryptKeyPasswordPopup,
		[
			async sPassword => {
				//Encrypt generated Key with User password
				try
				{
					const sKeyDataEncrypted = await this.encryptKeyData(sKeyData, sPassword);
					Storage.setData(
						this.getStorageName(),
						{
							keyname: sKeyName,
							keydata: sKeyDataEncrypted
						}
					);
					this.loadKeyNameFromStorage();
					this.onKeyGenerateSuccess(oKey);
					if (_.isFunction(fOnGenerateCallback))
					{
						fOnGenerateCallback();
					}
				}
				catch (e)
				{
					Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY'));
				}
			},
			() => {}
		]
	);
};

CJscryptoKey.prototype.getKeyFromString = async function (sParanoidKey)
{
	let oKey = null;
	let aKeyData = HexUtils.HexString2Array(sParanoidKey);
	if (aKeyData.length > 0)
	{
		aKeyData = new Uint8Array(aKeyData);
	}
	else
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY'));
	}

	try
	{
		oKey = await this.generateKeyFromArray(aKeyData);
	}
	catch (e)
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY'));
	}

	return oKey;
};

/**
 * Asynchronously generate key-object from string key-data
 *
 * @param {string} sKeyName
 * @param {string} sKeyData
 * @param {Function} fOnImportKeyCallback - starts after the key is successfully imported
 * @param {Function} fOnErrorCallback - starts if an error occurs during the key import process
 */
CJscryptoKey.prototype.importKeyFromString = function (sKeyName, sKeyData, fOnImportKeyCallback, fOnErrorCallback)
{
	try
	{
		Popups.showPopup(EncryptKeyPasswordPopup, [
			_.bind(function(sPassword) { // Encrypt imported Key with User password
				this.encryptKeyData(sKeyData, sPassword)
					.then(_.bind(function(sKeyDataEncrypted) { // Store encrypted key in local storage
						Storage.setData(
							this.getStorageName(),
							{
								keyname: sKeyName,
								keydata: sKeyDataEncrypted
							}
						);
						this.getKey(fOnImportKeyCallback, fOnErrorCallback, sPassword);
					}, this))
					.catch(function() {
						Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY'));
						if (_.isFunction(fOnErrorCallback))
						{
							fOnErrorCallback();
						}
					});
			}, this),
			function() {
				// Cancel callback
				if (_.isFunction(fOnErrorCallback))
				{
					fOnErrorCallback();
				}
			}
		]);
	}
	catch (e)
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_IMPORT_KEY'));
		if (_.isFunction(fOnErrorCallback))
		{
			fOnErrorCallback();
		}
	}
};

/**
 * Asynchronously export key
 *
 * @returns {Promise}
 */
CJscryptoKey.prototype.exportKey = function ()
{
	return window.crypto.subtle.exportKey(
		"raw",
		this.key()
	);
};

/**
 * Remove key-object and clear key-data in local storage
 *
 * @returns {Object}
 */
CJscryptoKey.prototype.deleteKey = function ()
{
	try
	{
		this.key(null);
		this.keyName(null);
		Storage.removeData(this.getStorageName());
	}
	catch (e)
	{
		return {error: e};
	}

	return {status: 'ok'};
};

/**
 * Asynchronously decrypt key with user password
 *
 * @param {string} sEncryptedKeyData
 * @param {string} sPassword
 * @returns {Promise}
 */
CJscryptoKey.prototype.decryptKeyData = function (sEncryptedKeyData, sPassword)
{
	var
		aVector = new Uint8Array(16) //defaults to zero
	;
	return new Promise(function (resolve, reject) {
		if (!sEncryptedKeyData)
		{
			reject(new Error(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY')));
		}
		else
		{
			//get password-key
			this.deriveKeyFromPasswordPromise(sPassword,
				_.bind(function(oDerivedKey) {
					crypto.subtle.decrypt({ name: 'AES-CBC', iv: aVector }, oDerivedKey, new Uint8Array(HexUtils.HexString2Array(sEncryptedKeyData)))
						.then(_.bind(function(aDecryptedKeyData) {
							resolve(new Uint8Array(aDecryptedKeyData));
						}, this))
						.catch(function() {
							reject(new Error(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY')));
						});
				}, this),
				function() {
					reject(new Error(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY')));
				}
			);
		}
	}.bind(this));
};

/**
 * Asynchronously encrypt key with user password
 *
 * @param {string} sUserKeyData
 * @param {string} sPassword
 * @returns {Promise}
 */
CJscryptoKey.prototype.encryptKeyData = function (sUserKeyData, sPassword)
{
	var
		aKeyData = null,
		sEncryptedKeyData = null,
		aVector = new Uint8Array(16) //defaults to zero
	;

	return new Promise(function (resolve, reject) {
		if (!sUserKeyData)
		{
			reject(new Error(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY')));
		}
		else
		{
			aKeyData = HexUtils.HexString2Array(sUserKeyData);
			if (aKeyData.length > 0)
			{
				aKeyData = new Uint8Array(aKeyData);
			}
			else
			{
				reject(new Error(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY')));
			}
			//get password-key
			this.deriveKeyFromPasswordPromise(sPassword,
				_.bind(function(oDerivedKey) {//encrypt user-key with password-key
					crypto.subtle.encrypt({ name: 'AES-CBC', iv: aVector }, oDerivedKey, aKeyData)
						.then(_.bind(function(aEncryptedKeyData) {
							sEncryptedKeyData = HexUtils.Array2HexString(new Uint8Array(aEncryptedKeyData));
							resolve(sEncryptedKeyData);
						}, this))
						.catch(function() {
							reject(new Error(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY')));
						});
				}, this),
				function() {
					reject(new Error(TextUtils.i18n('%MODULENAME%/ERROR_LOAD_KEY')));
				}
			);
		}
	}.bind(this));
};

/**
 * Asynchronously generate special key from user password. This key used in process of encryption/decryption user key.
 *
 * @param {string} sPassword
 * @param {Function} fOnGetDerivedKeyCallback - starts after the key is successfully generated
 * @param {Function} fOnErrorCallback - starts if an error occurs during the key generation process
 */
CJscryptoKey.prototype.deriveKeyFromPasswordPromise = function (sPassword, fOnGetDerivedKeyCallback, fOnErrorCallback)
{
	var
		sSalt = "the salt is this string",
		convertStringToArrayBuffer = function (sData)
		{
			if (window.TextEncoder)
			{
				return new TextEncoder('utf-8').encode(sData);
			}

			var
				sUtf8 = unescape(encodeURIComponent(sData)),
				sResult = new Uint8Array(sUtf8.length)
			;
			for (var i = 0; i < sUtf8.length; i++)
			{
				sResult[i] = sUtf8.charCodeAt(i);
			}
			return sResult;
		}
	;

	window.crypto.subtle.importKey(
		"raw",
		convertStringToArrayBuffer(sPassword),
		{"name": "PBKDF2"},
		false,
		["deriveKey"]
	)
	.then(_.bind(function (oPasswordKey) {
		window.crypto.subtle.deriveKey(
			{
				"name": "PBKDF2",
				"salt": convertStringToArrayBuffer(sSalt),
				"iterations": 100000,
				"hash": "SHA-256"
			},
			oPasswordKey,
			{
				"name": "AES-CBC",
				"length": 256
			},
			true,
			["encrypt", "decrypt"]
		)
		.then(function(oDerivedKey) {
			if (_.isFunction(fOnGetDerivedKeyCallback))
			{
				fOnGetDerivedKeyCallback(oDerivedKey);
			}
		})
		.catch(function() {
			if (_.isFunction(fOnErrorCallback))
			{
				fOnErrorCallback();
			}
		});
	}, this))
	.catch(function() {
		if (_.isFunction(fOnErrorCallback))
		{
			fOnErrorCallback();
		}
	});
};

CJscryptoKey.prototype.getStorageName = function ()
{
	return this.sPrefix + this.storageName;
};

module.exports = new CJscryptoKey();
