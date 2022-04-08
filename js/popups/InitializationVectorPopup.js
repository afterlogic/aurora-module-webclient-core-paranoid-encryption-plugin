'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js'),
	
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	AlertPopup = require('%PathToCoreWebclientModule%/js/popups/AlertPopup.js')
;

/**
 * @constructor
 */
function CInitializationVectorPopup()
{
	CAbstractPopup.call(this);
	
	this.fileName = ko.observable('');
	this.iv = ko.observable('');
	this.oldEncryptionMode = ko.observable(false);
	this.encryptedParanoidKey = '';
}

_.extendOwn(CInitializationVectorPopup.prototype, CAbstractPopup.prototype);

CInitializationVectorPopup.prototype.PopupTemplate = '%ModuleName%_InitializationVectorPopup';

CInitializationVectorPopup.prototype.onOpen = function (oFile, sIv)
{
	this.oFile = oFile;
	this.fileName(oFile.fileName());
	this.iv(sIv);
	const
		extendedProps = oFile && oFile.oExtendedProps,
		encryptedParanoidKey = extendedProps &&
			(oFile.sharedWithMe() ? extendedProps.ParanoidKeyShared : extendedProps.ParanoidKey)
	;
	this.encryptedParanoidKey = encryptedParanoidKey;
	this.oldEncryptionMode(!encryptedParanoidKey);
};

CInitializationVectorPopup.prototype.downloadEncrypted = function ()
{
	if (_.isFunction(this.oFile?.downloadFile))
	{
		this.oFile.downloadFile(true);
	}
};

CInitializationVectorPopup.prototype.getAesKey = async function ()
{
	let Crypto = require('modules/%ModuleName%/js/CCrypto.js');
	let sKey = await Crypto.decryptParanoidKey(this.encryptedParanoidKey);
	if (Types.isNonEmptyString(sKey))
	{
		Popups.showPopup(AlertPopup, [sKey, null, TextUtils.i18n('%MODULENAME%/HEADING_IV_AES_KEY')]);
	}
};

module.exports = new CInitializationVectorPopup();
