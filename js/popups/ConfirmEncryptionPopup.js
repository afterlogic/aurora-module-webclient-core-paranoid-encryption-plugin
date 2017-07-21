'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js')
;

/**
 * @constructor
 */
function CConfirmEncryptionPopup()
{
	CAbstractPopup.call(this);
	
	this.fEncrypt = null;
	this.fUpload = null;
	this.fCancel = null;
	this.message = ko.observable('');
	this.files = ko.observable('');
}

_.extendOwn(CConfirmEncryptionPopup.prototype, CAbstractPopup.prototype);

CConfirmEncryptionPopup.prototype.PopupTemplate = '%ModuleName%_ConfirmEncryptionPopup';

CConfirmEncryptionPopup.prototype.onShow = function (fEncrypt, fUpload, fCancel, iFilesCount, aFileList)
{
	this.files('');
	this.fEncrypt = fEncrypt;
	this.fUpload = fUpload;
	this.fCancel = fCancel;
	this.message(TextUtils.i18n('%MODULENAME%/CONFIRM_ENCRYPT_PLURAL', {'VALUE': iFilesCount > 1 ? iFilesCount : '"' + aFileList[0] + '"'}, null, iFilesCount));
	if (iFilesCount > 1)
	{
		this.files(aFileList.join('<br />'));
	}
};

CConfirmEncryptionPopup.prototype.cancelUpload = function ()
{
	this.fCancel();
	this.closePopup();
};

CConfirmEncryptionPopup.prototype.encrypt = function ()
{
	this.fEncrypt();
	this.closePopup();
};

CConfirmEncryptionPopup.prototype.upload = function ()
{
	this.fUpload();
	this.closePopup();
};

module.exports = new CConfirmEncryptionPopup();
