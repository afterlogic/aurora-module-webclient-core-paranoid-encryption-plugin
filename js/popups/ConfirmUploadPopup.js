'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js')
;

/**
 * @constructor
 */
function CConfirmUploadPopup()
{
	CAbstractPopup.call(this);
	
	this.fUpload = null;
	this.fCancel = null;
	this.message = ko.observable('');
	this.filesConfirmText = ko.observable('');
	this.sErrorText = ko.observable('');
}

_.extendOwn(CConfirmUploadPopup.prototype, CAbstractPopup.prototype);

CConfirmUploadPopup.prototype.PopupTemplate = '%ModuleName%_ConfirmUploadPopup';

CConfirmUploadPopup.prototype.onOpen = function (fUpload, fCancel, iFilesCount, aFileList, sErrorText)
{
	var aEncodedFiles = _.map(aFileList, function (sFileName) {
		return TextUtils.encodeHtml(sFileName);
	});
	
	this.filesConfirmText('');
	this.fUpload = fUpload;
	this.fCancel = fCancel;
	this.message(TextUtils.i18n('%MODULENAME%/CONFIRM_UPLOAD_PLURAL', {'VALUE': iFilesCount > 1 ? iFilesCount : '"' + aFileList[0] + '"'}, null, iFilesCount));
	if (iFilesCount > 1)
	{
		this.filesConfirmText(aEncodedFiles.join('<br />'));
	}
	this.sErrorText(sErrorText);
};

CConfirmUploadPopup.prototype.cancelUpload = function ()
{
	this.fCancel();
	this.closePopup();
};

CConfirmUploadPopup.prototype.upload = function ()
{
	this.fUpload();
	this.closePopup();
};

module.exports = new CConfirmUploadPopup();
